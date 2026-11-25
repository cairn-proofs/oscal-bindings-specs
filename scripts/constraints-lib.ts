/**
 * Generates the constraint manifest of an OSCAL release (openspec/specs/constraint-validation, STO-009 to CNS-016,
 * STO-011; design D2, D5, D7, D8, D9, D11). The inputs are the vendored metaschema, the naming manifest, the JSON Schema
 * and the exclusion list of the release.
 */
import fs from "node:fs";
import { identify, rows, type Exclusions } from "./check-constraint-exclusions.js";
import { datatypeIRegexp, GenerationError, toIRegexp } from "./constraints-regex.js";
import { findAnchors, qk, synthDoc, Translator, Unsupported, unwrap, wrongNodes, type SynthDoc, type TQuery } from "./constraints-translate.js";
import { compile } from "./jsonpath.js";
import { loadModel, type Constraint, type Def, type Model } from "./metaschema.js";
import { loadDoc, loadElement, localPart, parseMetapath, selectNodes, syntheticValue, type Expr, type MNode } from "./metapath.js";
import { resolvePointer, serialize, type Json, type Manifest as Names } from "./names-lib.js";

export const FORMAT = 1;

export type Kind = Constraint["kind"];

export interface KeyFieldEntry {
  /** The queries of the key field. They run on an array that holds the target node. */
  target: string[];
  /** The prefix of the key field: its value is the rest of the string after the prefix (CNS-012). */
  prefix?: string;
}

export interface Entry {
  id: string | null;
  kind: Kind;
  level: string;
  reportable: boolean;
  module: string;
  /** The declaring definition, as `kind:name`. */
  definition: string;
  context: { document: string[]; elements: Record<string, string[]> };
  target: string[];
  values?: string[];
  "allow-other"?: boolean;
  pattern?: string;
  "min-occurs"?: number;
  "max-occurs"?: number;
  "key-fields"?: KeyFieldEntry[];
  "index-name"?: string;
  partial?: boolean;
  test?: string;
}

export interface ConstraintManifest {
  format: number;
  "oscal-release": string;
  entries: Entry[];
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const label = (c: Constraint) => `${c.kind} ${c.id ?? "(no id)"} on ${c.def.kind}:${c.def.name} of ${c.module}`;

/** A set of nodes that an element of an element type can be: one definition, or the root of each document. */
export interface ElementTarget {
  key: string;
  def?: Def;
  roots?: Def[];
  /** The element is one item of `def` or a list of items (CNS-023). */
  singleOrMany?: boolean;
}

interface Inputs {
  partial: Set<string>;
  cannotFail: Set<Constraint>;
  /** The element types for which an allowed-values constraint has element context queries (CNS-009). */
  elementTypesOf: Map<Constraint, Set<string>>;
}

const SCHEMA_FILE = "oscal_complete_schema.json";

export class Generator {
  readonly model: Model;
  readonly names: Names;
  readonly schema: Json;
  readonly exclusions: Exclusions;
  private docs3?: SynthDoc[];
  private docs6?: SynthDoc[];
  private docAnchors = new Map<Def, string[]>();
  private elementTargets?: Map<string, ElementTarget>;
  private elementDocs = new Map<string, { shallow: SynthDoc[]; deep: SynthDoc[] }>();
  private elementAnchors = new Map<string, string[]>();
  private parsed = new Map<string, Expr>();
  private ids = new Map<Def, number>();

  constructor(
    readonly release: string,
    root = ".",
  ) {
    this.model = loadModel(release, `${root}/metaschema/${release}`);
    this.names = JSON.parse(fs.readFileSync(`${root}/manifest/${release}/names.json`, "utf8")) as Names;
    this.schema = JSON.parse(fs.readFileSync(`${root}/schemas/${release}/${SCHEMA_FILE}`, "utf8")) as Json;
    this.exclusions = JSON.parse(fs.readFileSync(`${root}/manifest/${release}/constraint-exclusions.json`, "utf8")) as Exclusions;
  }

  private parse(s: string): Expr {
    let e = this.parsed.get(s);
    if (!e) {
      e = parseMetapath(s);
      this.parsed.set(s, e);
    }
    return e;
  }

  private defId(d: Def): number {
    let id = this.ids.get(d);
    if (id === undefined) {
      id = this.ids.size;
      this.ids.set(d, id);
    }
    return id;
  }

  // -------------------------------------------------------------------------------------------------------------
  // The constraints of the manifest

  /** The constraints that the manifest holds (STO-010), and the failures of the exclusion list. */
  select(): { selected: Constraint[]; cannotFail: Set<Constraint>; failures: string[] } {
    const all = rows(this.model.constraints);
    const failures: string[] = [];
    const lookup = (item: Exclusions["excluded"][number], list: string): Constraint | undefined => {
      const found = identify(item, all);
      if (found.length !== 1) {
        failures.push(`the ${list} item ${JSON.stringify(item)} identifies ${found.length} constraints, not 1`);
        return undefined;
      }
      return this.model.constraints[all.indexOf(found[0])];
    };
    const excluded = new Set(this.exclusions.excluded.map((i) => lookup(i, "excluded")));
    const cannotFail = new Set(this.exclusions["cannot-fail"].map((i) => lookup(i, "cannot-fail")).filter((c): c is Constraint => c !== undefined));
    const selected = this.model.constraints.filter((c) => (c.level === "ERROR" || c.level === "CRITICAL") && !excluded.has(c));
    return { selected, cannotFail, failures };
  }

  // -------------------------------------------------------------------------------------------------------------
  // Synthetic values

  /** The synthetic values of a definition: one with lists, and one with single values when a child has both forms. */
  private forms(d: Def, limit: 3 | 6): Array<[unknown, boolean]> {
    const list = syntheticValue(d, limit);
    const single = syntheticValue(d, limit, true);
    return JSON.stringify(list) === JSON.stringify(single)
      ? [[list, false]]
      : [
          [list, false],
          [single, true],
        ];
  }

  /**
   * Queries for the parent of a flag. When no query selects the definition in both forms, the queries of each form are
   * joined: a query of the singleton form can select a list, which holds no flag, so the flag queries stay exact.
   */
  private parentQueries(exact: () => string[], docs: SynthDoc[], deep: SynthDoc[], d: Def, base: "$" | "$[0]"): string[] {
    try {
      return exact();
    } catch (error) {
      if (!(error instanceof GenerationError)) throw error;
    }
    return [true, false].flatMap((single) =>
      findAnchors(d, docs.filter((x) => x.singleton === single), deep.filter((x) => x.singleton === single), base).queries,
    );
  }

  private documentDocs(limit: 3 | 6): SynthDoc[] {
    const cached = limit === 3 ? this.docs3 : this.docs6;
    if (cached) return cached;
    const docs = this.model.roots.flatMap((root) =>
      this.forms(root, limit).map(([v, single]) => {
        const json = { [root.rootName!]: v };
        return synthDoc(json, loadDoc(json, this.model.roots), single);
      }),
    );
    if (limit === 3) this.docs3 = docs;
    else this.docs6 = docs;
    return docs;
  }

  /** The synthetic values of an element type: an array that holds one element. */
  private elementValues(t: ElementTarget, limit: 3 | 6): SynthDoc[] {
    if (t.def) {
      const def = t.def;
      return this.forms(def, limit).map(([v, single]) => synthDoc([v], loadElement(v, def), single));
    }
    return t.roots!.flatMap((root) =>
      this.forms(root, limit).map(([v, single]) => {
        const doc = { [root.rootName!]: v };
        return synthDoc([doc], loadDoc(doc, this.model.roots, "$[0]"), single);
      }),
    );
  }

  private docsOfElement(t: ElementTarget) {
    let d = this.elementDocs.get(t.key);
    if (!d) {
      d = { shallow: this.elementValues(t, 3), deep: this.elementValues(t, 6) };
      this.elementDocs.set(t.key, d);
    }
    return d;
  }

  // -------------------------------------------------------------------------------------------------------------
  // The element types

  /** The definition at a pointer of the naming manifest, or undefined for a pointer that holds no definition. */
  private defAtSite(site: string): Def | undefined {
    const m = /^#\/definitions\/oscal-complete-([^:/]+):([^/]+)((?:\/.*)?)$/.exec(site);
    if (!m) return undefined;
    let cur = this.model.defs.find((d) => !d.inline && d.module === m[1] && d.name === m[2] && d.kind !== "flag");
    const tokens = m[3].split("/").filter(Boolean);
    for (let i = 0; cur && i < tokens.length; ) {
      if (["anyOf", "allOf", "oneOf"].includes(tokens[i])) i += 2;
      else if (tokens[i] === "properties") {
        const child = cur.children.find((c) => c.jsonKey === tokens[i + 1]);
        cur = child?.def;
        i += 2;
        if (tokens[i] === "items") i++;
      } else return undefined;
    }
    return cur;
  }

  targets(): Map<string, ElementTarget> {
    if (this.elementTargets) return this.elementTargets;
    const out = new Map<string, ElementTarget>();
    for (const t of this.names.types) {
      const key = kebab(t.name);
      if (t.kind === "enum") continue;
      if (t.kind === "document") out.set(key, { key, roots: this.model.roots.filter((r) => r.rootName === t["body-field"]) });
      else if (t.kind === "document-union") out.set(key, { key, roots: this.model.roots });
      else if (t.kind === "single-or-many") {
        // The element is one item or a list of items. The queries run on one item, so a list is checked item by item.
        const item = this.names.types.find((x) => x.name === t.item);
        const def = item && this.defAtSite(item.sites[0]);
        if (!def) throw new GenerationError(`the type ${t.name} has no item definition`);
        out.set(key, { key, def, singleOrMany: true });
      }
      else {
        const defs = new Set(t.sites.map((s) => this.defAtSite(s)));
        if (defs.size !== 1 || defs.has(undefined)) throw new GenerationError(`the type ${t.name} (${t.kind}) has no single definition`);
        out.set(key, { key, def: [...defs][0] });
      }
    }
    this.elementTargets = out;
    return out;
  }

  private reaches(t: ElementTarget, d: Def): boolean {
    return this.docsOfElement(t).shallow.some((s) => s.nodes.some((n) => n.def === d && n.kind !== "doc"));
  }

  // -------------------------------------------------------------------------------------------------------------
  // The context queries

  /** The definitions that have the flag definition `d`, with the name of the flag in each. */
  private flagParents(d: Def): Array<{ parent: Def; name: string }> {
    return this.model.defs.flatMap((parent) => parent.flags.filter((f) => f.def === d).map((f) => ({ parent, name: f.name })));
  }

  private documentContext(d: Def): string[] {
    let q = this.docAnchors.get(d);
    if (!q) {
      const shallow = this.documentDocs(3);
      const deep = this.documentDocs(6);
      if (d.kind === "flag") {
        // Several definitions can share a flag, and a key name does not tell them apart: select the flag of each parent.
        const parents = this.flagParents(d).filter(({ parent }) => shallow.some((s) => s.nodes.some((n) => n.def === parent)));
        q = [
          ...new Set(
            parents.flatMap(({ parent, name }) =>
              this.parentQueries(() => this.documentContext(parent), shallow, deep, parent, "$").map((x) => x + qk(name)),
            ),
          ),
        ];
        const wrong = [...wrongNodes(q, shallow, d), ...wrongNodes(q, deep, d)];
        if (wrong.length) throw new GenerationError(`no exact context query for flag:${d.name} in a document: ${wrong.slice(0, 3).join(", ")}`);
      } else {
        const r = findAnchors(d, shallow, deep, "$");
        if (!r.exact) throw new GenerationError(`no exact context query for ${d.kind}:${d.name} in a document: ${r.wrong.join(", ")}`);
        q = r.queries;
      }
      this.docAnchors.set(d, q);
    }
    return q;
  }

  private elementContext(d: Def, t: ElementTarget): string[] {
    const k = `${t.key}|${this.defId(d)}`;
    let q = this.elementAnchors.get(k);
    if (!q) {
      const docs = this.docsOfElement(t);
      if (d.kind === "flag") {
        const parents = this.flagParents(d).filter(({ parent }) => docs.shallow.some((s) => s.nodes.some((n) => n.def === parent)));
        q = [
          ...new Set(
            parents.flatMap(({ parent, name }) =>
              this.parentQueries(() => this.elementContext(parent, t), docs.shallow, docs.deep, parent, "$[0]").map((x) => x + qk(name)),
            ),
          ),
        ];
        const wrong = [...wrongNodes(q, docs.shallow, d), ...wrongNodes(q, docs.deep, d)];
        if (wrong.length) throw new GenerationError(`no exact context query for flag:${d.name} in an element of the type ${t.key}: ${wrong.slice(0, 3).join(", ")}`);
      } else {
        const r = findAnchors(d, docs.shallow, docs.deep, "$[0]");
        if (!r.exact) throw new GenerationError(`no exact context query for ${d.kind}:${d.name} in an element of the type ${t.key}: ${r.wrong.join(", ")}`);
        q = r.queries;
      }
      this.elementAnchors.set(k, q);
    }
    return q;
  }

  /**
   * The element types for which each allowed-values constraint has element context queries (CNS-009): the element
   * holds the context node of each constraint that can be in the applicable set of each target node. The check reads the
   * structure only, so a predicate never removes a constraint from a set.
   */
  elementTypesOfAllowedValues(selected: Constraint[]): Map<Constraint, Set<string>> {
    const avs = selected.filter((c) => c.kind === "allowed-values");
    const holds = new Map<Constraint, Set<string>>();
    const broken = new Map<Constraint, Set<string>>();
    const mark = (m: Map<Constraint, Set<string>>, c: Constraint, key: string) => m.set(c, (m.get(c) ?? new Set()).add(key));
    for (const doc of this.documentDocs(3)) {
      const byDef = new Map<Def, MNode[]>();
      for (const n of doc.nodes) if (n.def) byDef.set(n.def, [...(byDef.get(n.def) ?? []), n]);
      const hits = new Map<MNode, Array<{ c: Constraint; ctx: MNode }>>();
      const pairs: Array<{ c: Constraint; ctx: MNode; target: MNode }> = [];
      for (const c of avs) {
        const { expr } = localPart(this.parse(c.target));
        if (!expr) continue;
        for (const ctx of byDef.get(c.def) ?? [])
          for (const target of selectNodes(expr, ctx, { skipPredicates: true })) {
            hits.set(target, [...(hits.get(target) ?? []), { c, ctx }]);
            pairs.push({ c, ctx, target });
          }
      }
      for (const t of this.targets().values()) {
        const instances = t.def ? (byDef.get(t.def) ?? []) : t.roots?.includes(doc.tree.children()[0]?.def as Def) ? [doc.tree] : [];
        for (const x of instances) {
          const inside = (n: MNode) => n.path === x.path || n.path.startsWith(`${x.path}[`);
          for (const { c, ctx, target } of pairs) {
            if (!inside(ctx)) continue;
            mark(holds, c, t.key);
            const set = hits.get(target)!;
            if (set.some((h) => !set.some((o) => o.c === h.c && inside(o.ctx)))) mark(broken, c, t.key);
          }
        }
      }
    }
    const out = new Map<Constraint, Set<string>>();
    for (const c of avs) out.set(c, new Set([...(holds.get(c) ?? [])].filter((k) => !broken.get(c)?.has(k))));
    return out;
  }

  // -------------------------------------------------------------------------------------------------------------
  // The JSON Schema

  /** The schema nodes that describe the values of a definition. */
  private schemaNodes(d: Def): Json[] {
    if (!d.inline) {
      const n = resolvePointer(this.schema, `#/definitions/oscal-complete-${d.module}:${d.name}`);
      return n === undefined ? [] : [n];
    }
    const child = d.parentDef?.children.find((c) => c.def === d);
    if (!d.parentDef || !child) return [];
    return this.schemaNodes(d.parentDef)
      .flatMap((n) => this.propertySchemas(n, child.jsonKey))
      .flatMap((s) => (!child.grouped ? [s] : s !== null && typeof s === "object" && !Array.isArray(s) && s.items !== undefined ? [s.items] : []));
  }

  /** The subschemas of the property `name` at a schema node, through anyOf, allOf and oneOf. */
  private propertySchemas(node: Json | undefined, name: string): Json[] {
    if (node === undefined || node === null || typeof node !== "object" || Array.isArray(node)) return [];
    const out: Json[] = [];
    const props = node.properties;
    if (props && typeof props === "object" && !Array.isArray(props) && Object.hasOwn(props, name)) out.push(props[name]);
    for (const k of ["anyOf", "allOf", "oneOf"]) {
      const list = node[k];
      if (Array.isArray(list)) for (const m of list) out.push(...this.propertySchemas(m, name));
    }
    return out;
  }

  /** True when the JSON Schema allows the flag `name` on the definition `parent` (the schema omits some flags of the metaschema). */
  schemaHoldsFlag(parent: Def, name: string): boolean {
    return this.schemaNodes(parent).some((n) => this.propertySchemas(n, name).length > 0);
  }

  /** The values that a subschema allows, when it lists them with `enum` alone, or in an `allOf` member. */
  private enumOf(node: Json): string[] | undefined {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return undefined;
    if (Array.isArray(node.enum)) return node.enum.map(String);
    if (Array.isArray(node.allOf)) return node.allOf.map((m: Json) => this.enumOf(m)).find((e: string[] | undefined) => e !== undefined);
    return undefined;
  }

  /** STO-011: the JSON Schema allows only values that the constraint lists. */
  schemaEnforces(c: Constraint): boolean {
    if (c.kind !== "allowed-values" || c.allowOther || c.def.kind !== "flag" || c.target !== ".") return false;
    // A flag that no definition has holds no value, so the schema allows no other value than the listed ones.
    return this.flagParents(c.def).every(({ parent, name }) => {
      const found = this.schemaNodes(parent).flatMap((n) => this.propertySchemas(n, name));
      return found.length > 0 && found.every((s) => this.enumOf(s)?.every((v) => c.enums!.includes(v)) === true);
    });
  }

  // -------------------------------------------------------------------------------------------------------------
  // The entries

  private keyFields(c: Constraint, tr: Translator, targetDefs: Set<Def>): KeyFieldEntry[] {
    return c.keyFields!.map((kf) => {
      const qs: TQuery[] = tr.withValueTerminal(tr.selector(this.parse(kf.target), targetDefs, c.def));
      if (c.kind !== "index-has-key" && qs.some((q) => q.multi)) throw new GenerationError(`a key field of ${label(c)} can select several values`);
      const out: KeyFieldEntry = { target: qs.map((q) => q.q) };
      if (kf.pattern !== undefined) {
        const m = /^([^\\^$.|?*+()[\]{}]*)\(\.\*\)$/.exec(kf.pattern);
        if (!m) throw new GenerationError(`the key-field pattern ${kf.pattern} of ${label(c)} is not a literal prefix and (.*)`);
        out.prefix = m[1];
      }
      return out;
    });
  }

  buildEntry(c: Constraint, inputs: Inputs): Entry {
    const { expr: local, dropped } = localPart(this.parse(c.target));
    if (!local) throw new Unsupported(`the target of ${label(c)} is only a doc() path`);
    const tr = new Translator();
    let tqs = tr.selector(local, new Set([c.def]), c.def);
    if (c.kind === "allowed-values" || c.kind === "matches") tqs = tr.withValueTerminal(tqs);
    if (tqs.length === 0) throw new GenerationError(`the target of ${label(c)} selects nothing`);
    const targetDefs = new Set<Def>(tqs.flatMap((t) => [...t.defs]));
    const partialIndex = c.kind === "index" ? dropped : c.kind === "index-has-key" && inputs.partial.has(c.indexName!);
    const entry: Entry = {
      id: c.id,
      kind: c.kind,
      level: c.level,
      reportable: true,
      module: c.module,
      definition: `${c.def.kind}:${c.def.name}`,
      context: { document: [], elements: {} },
      target: tqs.map((t) => t.q),
    };
    switch (c.kind) {
      case "allowed-values":
        entry.values = c.enums!;
        entry["allow-other"] = c.allowOther === true;
        break;
      case "matches":
        if ((c.regex === undefined) === (c.datatype === undefined)) throw new GenerationError(`${label(c)} has neither a regex nor a datatype, or both`);
        entry.pattern = c.regex !== undefined ? toIRegexp(c.regex) : datatypeIRegexp(this.release, c.datatype!);
        break;
      case "has-cardinality":
        if (c.minOccurs !== undefined) entry["min-occurs"] = c.minOccurs;
        if (c.maxOccurs !== undefined) entry["max-occurs"] = c.maxOccurs;
        break;
      case "is-unique":
        entry["key-fields"] = this.keyFields(c, tr, targetDefs);
        break;
      case "index":
      case "index-has-key":
        entry["key-fields"] = this.keyFields(c, tr, targetDefs);
        entry["index-name"] = c.indexName!;
        entry.partial = partialIndex;
        break;
      case "expect":
        entry.test = `$[?${unwrap(tr.pred(this.parse(c.test!), targetDefs, "@", c.def))}]`;
        break;
    }
    // STO-011: an entry is reportable unless it cannot fail.
    entry.reportable = !(c.kind === "allowed-values" && (c.allowOther || this.schemaEnforces(c))) && !(c.kind === "index-has-key" && partialIndex) && !inputs.cannotFail.has(c);
    if (entry.reportable && c.id === null) throw new GenerationError(`${label(c)} is reportable and has no id`);
    entry.context.document = this.documentContext(c.def);
    for (const t of this.targets().values()) {
      if (c.kind === "allowed-values" && !inputs.elementTypesOf.get(c)?.has(t.key)) continue;
      if (!t.def && !t.roots) continue;
      if (!this.reaches(t, c.def)) continue;
      entry.context.elements[t.key] = this.elementContext(c.def, t);
    }
    return entry;
  }

  /** The manifest, or the failures of the generation. */
  generate(): { manifest?: ConstraintManifest; failures: string[] } {
    const { selected, cannotFail, failures } = this.select();
    if (failures.length) return { failures };
    const partial = new Set<string>();
    for (const c of selected) if (c.kind === "index" && localPart(this.parse(c.target)).dropped) partial.add(c.indexName!);
    const inputs: Inputs = { partial, cannotFail, elementTypesOf: this.elementTypesOfAllowedValues(selected) };
    const entries: Entry[] = [];
    for (const c of selected) {
      try {
        entries.push(this.buildEntry(c, inputs));
      } catch (error) {
        if (!(error instanceof GenerationError)) throw error;
        failures.push(`${label(c)}: ${error.message}`);
      }
    }
    for (const e of entries)
      for (const q of [...e.context.document, ...Object.values(e.context.elements).flat(), ...e.target, ...(e["key-fields"] ?? []).flatMap((k) => k.target), ...(e.test ? [e.test] : [])]) {
        try {
          compile(q);
        } catch (error) {
          failures.push(`${e.id ?? "(no id)"}: the query ${q} does not compile: ${(error as Error).message}`);
        }
      }
    if (failures.length) return { failures };
    return { manifest: { format: FORMAT, "oscal-release": this.release, entries }, failures };
  }
}

export const serializeManifest = (m: ConstraintManifest) => serialize(m as unknown as Json);
export type { Inputs };
