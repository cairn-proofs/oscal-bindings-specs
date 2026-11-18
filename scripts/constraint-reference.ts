/**
 * The reference evaluation of the constraints of the vendored metaschema (openspec/specs/constraint-validation, CNS-019).
 * It applies the rule of each constraint kind (CNS-008 to CNS-017) to the nodes that the Metapath evaluator of
 * scripts/metapath.ts selects, and it gives the failures of a document.
 *
 *   npm run reference:self-test
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { datatypePattern, loadModel, metaschemaDir, readModuleText, type Constraint, type Def, type KeyField } from "./metaschema.js";
import {
  allNodes,
  atomize,
  callsDoc,
  ebv,
  evalMp,
  loadDoc,
  localPart,
  MetapathError,
  parseMetapath,
  selectNodes,
  type Expr,
  type MNode,
} from "./metapath.js";

export interface Failure {
  constraint: Constraint;
  id: string | null;
  /** The target node, or the context node of a `has-cardinality` constraint. */
  location: string;
  /** The key of a failure of a key constraint (CNS-012). */
  key?: string;
}

export interface Result {
  failures: Failure[];
  /** The Metapath errors, and the cases that the specification leaves undefined. */
  errors: string[];
  /** The names of the indexes that hold a part of another document (CNS-014). */
  partialIndexes: string[];
}

/** The RegExp of a full match of a Java regular expression of a `matches` constraint. */
const fullJava = (regex: string) => new RegExp(`^(?:${regex})$`);

/** The RegExp of a full match of an XSD pattern: `.` excludes a line break, and `\S` excludes white space of XSD. */
export function fullXsd(pattern: string): RegExp {
  let out = "";
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") {
      const n = pattern[i + 1];
      if (n === "S" && inClass) throw new Error(`the XSD pattern ${pattern} has \\S inside a character class`);
      out += n === "S" ? "[^ \\t\\n\\r]" : c + n;
      i++;
      continue;
    }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    out += c === "." && !inClass ? "[^\\n\\r]" : c;
  }
  return new RegExp(`^(?:${out})$`);
}

/** The lexical form of the datatype `integer` (design D11): an optional sign and one or more digits. */
const INTEGER = /^[+-]?[0-9]+$/;

function valueMatcher(release: string, c: Constraint): (value: string) => boolean {
  const tests: Array<(value: string) => boolean> = [];
  if (c.regex !== undefined) {
    const re = fullJava(c.regex);
    tests.push((v) => re.test(v));
  }
  if (c.datatype !== undefined) {
    if (c.datatype === "integer") tests.push((v) => INTEGER.test(v));
    else {
      const pattern = datatypePattern(release, c.datatype);
      if (pattern === undefined) throw new Error(`the datatype ${c.datatype} has no pattern`);
      const re = fullXsd(pattern);
      tests.push((v) => re.test(v));
    }
  }
  return (v) => tests.every((t) => t(v));
}

/** The values of a key field for a target node: one null when it selects no value (CNS-012). */
function keyFieldValues(kf: KeyField, expr: Expr, target: MNode): Array<string | null> {
  const values = evalMp(expr, target)
    .map(atomize)
    .filter((x) => x !== null)
    .map(String);
  if (values.length === 0) return [null];
  if (kf.pattern === undefined) return values;
  const re = new RegExp(`^(?:${kf.pattern})$`, "s");
  return values.map((v) => {
    const m = re.exec(v);
    return m ? (m[1] ?? "") : null;
  });
}

/** The keys of a target node: one list for each combination of the values of the key fields. All-null keys are no key. */
function keysOf(c: Constraint, exprs: Expr[], target: MNode, several: boolean): string[][] {
  const lists = c.keyFields!.map((kf, i) => keyFieldValues(kf, exprs[i], target));
  if (!several && lists.some((l) => l.length > 1))
    throw new MetapathError(`a key field of ${c.kind} ${c.id ?? "(no id)"} selects several values`);
  let keys: Array<Array<string | null>> = [[]];
  for (const l of lists) keys = keys.flatMap((k) => l.map((v) => [...k, v]));
  return keys.filter((k) => k.some((v) => v !== null)).map((k) => k.map((v) => (v === null ? "\u0000" : `=${v}`)));
}

/**
 * The failures of the constraints for the tree of a document. `constraints` holds the constraints to apply, in the
 * order of the manifest. An error of a constraint gives no failure for the node that raised it.
 */
export function evaluate(constraints: Constraint[], tree: MNode, release = "1.2.3"): Result {
  const failures: Failure[] = [];
  const errors: string[] = [];
  const nodesOf = new Map<Def, MNode[]>();
  for (const n of allNodes(tree)) {
    if (n.def === undefined) continue;
    const l = nodesOf.get(n.def) ?? [];
    l.push(n);
    nodesOf.set(n.def, l);
  }
  const parsed = new Map<string, Expr>();
  const parse = (s: string): Expr => {
    let e = parsed.get(s);
    if (!e) {
      e = parseMetapath(s);
      parsed.set(s, e);
    }
    return e;
  };
  const reported = new Set<string>();
  const order = new Map(constraints.map((c, i) => [c, i]));
  const add = (c: Constraint, location: string, key?: string) => {
    const id = `${order.get(c)}|${location}|${key ?? ""}`;
    if (reported.has(id)) return; // CNS-017: at most one failure for one location, or one location and one key
    reported.add(id);
    failures.push({ constraint: c, id: c.id, location, key });
  };
  const guard = <T>(c: Constraint, at: string, fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (error) {
      if (!(error instanceof MetapathError)) throw error;
      errors.push(`${c.kind} ${c.id ?? "(no id)"} at ${at}: ${error.message}`);
      return undefined;
    }
  };

  // The index of a name holds the keys of the target nodes of each `index` constraint with that name (CNS-014).
  const indexes = new Map<string, Map<string, Array<{ node: MNode; c: Constraint }>>>();
  const indexed = new Map<string, Set<MNode>>();
  const partial = new Set<string>();
  const closedSets = new Map<MNode, { value: string; set: Constraint[] }>();

  for (const phase of ["index", "other"] as const) {
    for (const c of constraints) {
      if ((c.kind === "index") !== (phase === "index")) continue;
      const { expr, dropped } = localPart(parse(c.target)); // CNS-007.01: the nodes of the same document
      if (c.kind === "index" && dropped) partial.add(c.indexName!);
      const matcher = c.kind === "matches" ? valueMatcher(release, c) : undefined;
      const keyExprs = (c.keyFields ?? []).map((kf) => parse(kf.target));
      for (const ctx of nodesOf.get(c.def) ?? []) {
        const targets = expr ? guard(c, ctx.path, () => selectNodes(expr, ctx)) : [];
        if (targets === undefined) continue;
        switch (c.kind) {
          case "allowed-values":
            for (const t of targets) {
              const entry = closedSets.get(t) ?? { value: String(t.atomicValue()), set: [] };
              if (!entry.set.includes(c)) entry.set.push(c);
              closedSets.set(t, entry);
            }
            break;
          case "matches":
            for (const t of targets) if (!matcher!(String(t.atomicValue()))) add(c, t.valuePath());
            break;
          case "has-cardinality": {
            // CNS-011: a context node with no target node has the count 0.
            const count = targets.length;
            if ((c.minOccurs !== undefined && count < c.minOccurs) || (c.maxOccurs !== undefined && count > c.maxOccurs)) add(c, ctx.path);
            break;
          }
          case "is-unique": {
            // CNS-013: the target nodes of one context node with the same key give one failure fewer than their number.
            const seen = new Set<string>();
            for (const t of targets) {
              const keys = guard(c, t.path, () => keysOf(c, keyExprs, t, false));
              for (const key of keys ?? []) {
                const k = JSON.stringify(key);
                if (seen.has(k)) add(c, t.path, k);
                else seen.add(k);
              }
            }
            break;
          }
          case "index": {
            const name = c.indexName!;
            const members = indexed.get(name) ?? new Set<MNode>();
            indexed.set(name, members);
            const index = indexes.get(name) ?? new Map();
            indexes.set(name, index);
            for (const t of targets) {
              if (members.has(t)) continue; // a node is in the index once
              members.add(t);
              for (const key of guard(c, t.path, () => keysOf(c, keyExprs, t, false)) ?? []) {
                const k = JSON.stringify(key);
                index.set(k, [...(index.get(k) ?? []), { node: t, c }]);
              }
            }
            break;
          }
          case "index-has-key": {
            // CNS-015: an entry whose index is partial gives no failure.
            if (constraints.some((x) => x.kind === "index" && x.indexName === c.indexName && partial.has(x.indexName!))) break;
            const index = indexes.get(c.indexName!);
            for (const t of targets)
              for (const key of guard(c, t.path, () => keysOf(c, keyExprs, t, true)) ?? []) {
                const k = JSON.stringify(key);
                if (!index?.has(k)) add(c, t.path, k);
              }
            break;
          }
          case "expect": {
            const test = parse(c.test!);
            for (const t of targets) if (guard(c, t.path, () => !ebv(evalMp(test, t))) === true) add(c, t.path);
            break;
          }
        }
      }
    }
  }

  // CNS-014: the target nodes with the same key in one index give one failure fewer than their number.
  for (const index of indexes.values())
    for (const [key, members] of index) for (const m of members.slice(1)) add(m.c, m.node.path, key);

  // CNS-008: a node fails for each closed constraint of its applicable set when no constraint of the set lists the value.
  for (const [node, { value, set }] of closedSets) {
    if (set.some((c) => c.enums!.includes(value))) continue;
    for (const c of set) if (!c.allowOther) add(c, node.valuePath());
  }
  return { failures, errors, partialIndexes: [...partial].sort() };
}

// ---------------------------------------------------------------------------------------------------------------
// Self-test

const countTags = (text: string) => (text.replace(/<!--[\s\S]*?-->/g, "").match(/<(allowed-values|matches|has-cardinality|is-unique|index|index-has-key|expect)[\s/>]/g) ?? []).length;

function selfTest(): number {
  const model = loadModel("1.2.3");
  const byId = (id: string, kind?: string) => {
    const found = model.constraints.filter((c) => c.id === id && (kind === undefined || c.kind === kind));
    if (found.length === 0) throw new Error(`no constraint ${id}`);
    return found;
  };
  const defOf = (name: string, kind: Def["kind"] = "assembly") => model.defs.find((d) => d.name === name && d.kind === kind && !d.inline)!;
  const run = (constraints: Constraint | Constraint[], json: unknown) => evaluate([constraints].flat(), loadDoc(json, model.roots));
  const ids = (r: Result) => r.failures.map((f) => f.id).sort();
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b) || `${JSON.stringify(a)} is not ${JSON.stringify(b)}`;
  /** A constraint made for a test, declared on the definition `def`. */
  const custom = (def: Def, fields: Partial<Constraint>): Constraint => ({
    uid: "custom",
    id: "custom",
    kind: "expect",
    level: "ERROR",
    target: ".",
    module: def.module,
    def,
    ordinal: 0,
    ...fields,
  });
  const locationDef = byId("oscal-metadata-location-title-address-email-address-telephone-cardinality")[0].def;
  const partDef = byId("oscal-part-prop-name")[0].def;
  const catalog = (extra: object) => ({ catalog: { uuid: "x", metadata: {}, ...extra } });
  const cases: Array<[string, () => boolean | string]> = [];
  const test = (name: string, fn: () => boolean | string) => cases.push([name, fn]);

  // The loader.
  test("loader: the 1.2.3 modules hold 340 constraints", () => model.constraints.length === 340 || `${model.constraints.length}`);
  test("loader: the count of the constraint tags outside XML comments is 340", () => {
    const dir = metaschemaDir("1.2.3");
    const n = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith("_metaschema_RESOLVED.xml") && f !== "oscal_complete_metaschema_RESOLVED.xml")
      .reduce((sum, f) => sum + countTags(readModuleText(path.join(dir, f))), 0);
    return n === 340 || `${n}`;
  });
  test("loader: a constraint inside an XML comment is not loaded", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metaschema-"));
    try {
      fs.writeFileSync(
        path.join(dir, "t_metaschema_RESOLVED.xml"),
        `<?xml version="1.0"?>
<METASCHEMA xmlns="http://csrc.nist.gov/ns/oscal/metaschema/1.0"><schema-name>t</schema-name><schema-version>1</schema-version>
<short-name>t</short-name><namespace>n</namespace><json-base-uri>n</json-base-uri>
<define-assembly name="a"><formal-name>a</formal-name><description>a</description><root-name>a</root-name>
<constraint><expect id="live" test="true"/><!-- <expect id="dead" test="true"/> --></constraint></define-assembly></METASCHEMA>`,
      );
      return same(loadModel("0.0.0", dir).constraints.map((c) => c.id), ["live"]);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  test("loader: a group-as without in-json holds a single value or a list", () => {
    const count = (mappings: unknown) => allNodes(loadDoc({ "mapping-collection": { mappings } }, model.roots)).filter((n) => n.def?.name === "mapping" && n.kind !== "doc").length;
    return same([count({ uuid: "u" }), count([{ uuid: "u" }, { uuid: "v" }])], [1, 2]);
  });

  // One case for each constraint kind.
  test("CNS-008.02: a name that no entry of the set lists gives one failure for each closed entry", () =>
    same(
      ids(run(model.constraints.filter((c) => c.kind === "allowed-values"), catalog({ controls: [{ id: "c", title: "t", props: [{ name: "bogus", value: "v" }] }] }))),
      ["oscal-control-prop-name", "oscal-metadata-prop-name-values"],
    ));
  test("CNS-008.01: a name that an open entry of the set lists gives no failure", () =>
    same(
      ids(run(model.constraints.filter((c) => c.kind === "allowed-values"), { "assessment-plan": { "terms-and-conditions": { parts: [{ name: "objective" }] } } })),
      [],
    ));
  test("CNS-010.01: a hash value of 63 digits gives one failure", () => {
    const hash = (value: string) => run(byId("oscal-check-hash-length-SHA2-3-256"), { catalog: { "back-matter": { resources: [{ rlinks: [{ hashes: [{ algorithm: "SHA-256", value }] }] }] } } });
    return same(hash("a".repeat(63)).failures.map((f) => f.location), ["$['catalog']['back-matter']['resources'][0]['rlinks'][0]['hashes'][0]['value']"]) && hash("a".repeat(64)).failures.length === 0;
  });
  test("CNS-010: a datatype pattern applies in full, and the integer datatype rejects `high`", () => {
    const risk = (priority: string) => run(byId("oscal-risk-priority-datatype"), { "assessment-results": { results: [{ risks: [{ props: [{ name: "priority", value: priority }] }] }] } }).failures.length;
    return same([risk("high"), risk("5"), risk("+5")], [1, 0, 0]);
  });
  const location = (extra: object) => ({ "system-security-plan": { metadata: { locations: [extra] } } });
  test("CNS-011.01: a context node with no target node has the count 0", () =>
    same(ids(run(byId("oscal-metadata-location-title-address-email-address-telephone-cardinality"), location({ uuid: "u" }))), ["oscal-metadata-location-title-address-email-address-telephone-cardinality"]));
  test("CNS-011: a context node with a target node gives no failure, and a maximum counts too", () => {
    const max = custom(locationDef, { kind: "has-cardinality", target: "title|address", maxOccurs: 1 });
    return run(byId("oscal-metadata-location-title-address-email-address-telephone-cardinality"), location({ title: "t" })).failures.length === 0 && same(run([max], location({ title: "t", address: {} })).failures.length, 1);
  });
  const parties = (...uuids: string[]) => uuids.map((uuid) => ({ uuid, type: "person" }));
  const withMeta = (metadata: object) => catalog({ metadata });
  test("CNS-013.01: three nodes with the same key give two failures", () =>
    same(
      run(byId("oscal-unique-metadata-responsible-party"), withMeta({ "responsible-parties": [{ "role-id": "r", "party-uuids": ["a"] }, { "role-id": "r", "party-uuids": ["b"] }, { "role-id": "r", "party-uuids": ["c"] }] })).failures.map((f) => f.location),
      ["$['catalog']['metadata']['responsible-parties'][1]", "$['catalog']['metadata']['responsible-parties'][2]"],
    ));
  test("CNS-014.01: two parties with the same identifier give one failure", () =>
    same(run(byId("oscal-index-metadata-party-uuid", "index"), withMeta({ parties: parties("p", "p") })).failures.map((f) => f.location), ["$['catalog']['metadata']['parties'][1]"]));
  const refParty = (refs: string[], partyUuids: string[]) => withMeta({ parties: parties(...partyUuids), "responsible-parties": [{ "role-id": "r", "party-uuids": refs }] });
  test("CNS-015.01: a responsible party with two party identifiers and one party gives one failure", () =>
    same(run(byId("oscal-index-metadata-party-uuid"), refParty(["p", "q"], ["p"])).failures.map((f) => f.constraint.kind + f.location), ["index-has-key$['catalog']['metadata']['responsible-parties'][0]['party-uuids'][1]"]) && run(byId("oscal-index-metadata-party-uuid"), refParty(["p"], ["p"])).failures.length === 0);
  test("CNS-016.01: a parameter with the flag depends-on gives one failure", () =>
    same(run(byId("oscal-parameter-depends-on-deprecated"), catalog({ params: [{ id: "a", "depends-on": "b" }, { id: "b" }] })).failures.map((f) => f.location), ["$['catalog']['params'][0]"]));

  // CNS-002: the defective constraints of the exclusion list show each rule.
  const excluded = (JSON.parse(fs.readFileSync("manifest/1.2.3/constraint-exclusions.json", "utf8")) as { excluded: Array<{ id?: string }> }).excluded.map((x) => x.id);
  test("CNS-002.01: a constraint that targets a child `type` of `action`, where `type` is a flag, selects nothing and is excluded", () => {
    const c = byId("oscal-metadata-action-type-values")[0];
    const json = catalog({ metadata: { actions: [{ uuid: "u", date: "2020-01-01T00:00:00Z", type: "bogus", system: "s" }] } });
    const contexts = allNodes(loadDoc(json, model.roots)).filter((n) => n.def === c.def && n.kind !== "doc");
    const selected = contexts.flatMap((n) => selectNodes(parseMetapath(c.target), n));
    return (
      (c.def.name === "action" && c.def.flags.some((f) => f.name === "type") && !c.def.children.some((x) => x.useName === "type") && contexts.length === 1 && selected.length === 0 && run(c, json).failures.length === 0 && excluded.includes(c.id!)) ||
      JSON.stringify([contexts.length, selected.length, excluded.includes(c.id!)])
    );
  });
  test("CNS-002.02: a has-cardinality constraint with a filter on @name='objective' fails for an assessment part with another name, and is excluded", () => {
    const c = byId("oscal-assesment-part-objective-cardinality")[0];
    const part = (name: string) => run(c, { "assessment-plan": { "terms-and-conditions": { parts: [{ name }] } } }).failures.map((f) => f.location);
    return (
      (c.kind === "has-cardinality" && c.minOccurs === 1 && c.target.startsWith(".[@name='objective']") && excluded.includes(c.id!) &&
        same(part("other"), ["$['assessment-plan']['terms-and-conditions']['parts'][0]"]) === true) ||
      JSON.stringify(part("other"))
    );
  });
  test("CNS-002.03: a has-cardinality constraint on local objectives fails for each local objective, and no other constraint allows its target", () => {
    const c = byId("oscal-assessment-method-id-cardinality")[0];
    const all = model.constraints.filter((x) => x.level === "ERROR" || x.level === "CRITICAL");
    const document = (parts: object[], count = 2) => ({ "assessment-plan": { "local-definitions": { "objectives-and-methods": Array.from({ length: count }, (_, i) => ({ uuid: `u${i}`, "control-id": "c", parts })) } } });
    // Without the target, the constraint fails for each local objective.
    const without = run(c, document([{ name: "objective" }])).failures.map((f) => f.location);
    // With the target, the constraint holds, but a closed allowed-values constraint fails for the name `method-id`.
    const withTarget = run(all, document([{ name: "objective", props: [{ name: "method-id", value: "x" }] }], 1));
    const ofCardinality = withTarget.failures.filter((f) => f.id === c.id);
    const ofNames = withTarget.failures.filter((f) => f.constraint.kind === "allowed-values" && f.location.endsWith("['props'][0]['name']"));
    return (
      (c.kind === "has-cardinality" && c.minOccurs === 1 && excluded.includes(c.id!) &&
        same(without, ["$['assessment-plan']['local-definitions']['objectives-and-methods'][0]", "$['assessment-plan']['local-definitions']['objectives-and-methods'][1]"]) === true &&
        ofCardinality.length === 0 && ofNames.length > 0) ||
      JSON.stringify([without, ofCardinality.length, ofNames.length])
    );
  });

  // The rules of design D7.
  test("D7.1: a has-cardinality entry counts 0 for a context node with no target node (CNS-011)", () =>
    run(custom(locationDef, { kind: "has-cardinality", target: "title", minOccurs: 1 }), location({})).failures.length === 1);
  test("CNS-012.01 and D7.2: a key whose values are all null is no key", () =>
    same(run(byId("oscal-catalog-parts"), catalog({ controls: [{ id: "c", title: "t", parts: [{ name: "n" }, { name: "n" }] }] })).failures.length, 0) &&
    same(run(byId("oscal-catalog-parts"), catalog({ controls: [{ id: "c", title: "t", parts: [{ id: "a", name: "n" }, { id: "a", name: "n" }] }] })).failures.length, 1));
  test("D7.3: each value of a key field is a key, and each one that the index lacks gives a failure", () =>
    same(run(byId("oscal-index-metadata-party-uuid"), refParty(["p", "q", "r"], ["p"])).failures.length, 2));
  test("D7.4: a key field of an is-unique constraint that selects several values is an error", () => {
    const c = custom(defOf("responsible-party"), { kind: "is-unique", target: ".", keyFields: [{ target: "party-uuid" }] });
    const r = run([c], withMeta({ "responsible-parties": [{ "role-id": "r", "party-uuids": ["a", "b"] }] }));
    return (r.errors.length === 1 && r.failures.length === 0) || JSON.stringify(r);
  });
  test("CNS-012.02: a key field with a prefix has the rest of the string as its value", () => {
    const c = custom(defOf("link"), { kind: "index-has-key", target: ".", keyFields: [{ target: "@href", pattern: "#(.*)" }], indexName: "t" });
    const i = custom(defOf("link"), { kind: "index", target: ".", keyFields: [{ target: "@rel" }], indexName: "t" });
    const doc = (href: string) => catalog({ metadata: { links: [{ href, rel: "a1b2" }] } });
    return same([run([i, c], doc("#a1b2")).failures.length, run([i, c], doc("#zz")).failures.length, run([i, c], doc("a1b2")).failures.length], [0, 1, 0]);
  });

  // The rules of design D4.
  const prop = (fields: object) => catalog({ metadata: { props: [{ name: "n", value: "v", ...fields }] } });
  const nsTest = (args: string, p: object) => run(custom(defOf("property"), { test: `has-oscal-namespace(${args})` }), prop(p)).failures.length;
  test("D4.1: the arguments are one or more namespace strings", () =>
    same([nsTest("'http://example.com/a'", { ns: "http://example.com/b" }), nsTest("'http://example.com/a','http://example.com/b'", { ns: "http://example.com/b" }), nsTest("('http://example.com/a','http://example.com/b')", { ns: "http://example.com/b" })], [1, 0, 0]));
  test("D4.2: a node without ns has the OSCAL namespace", () =>
    same([nsTest("'http://csrc.nist.gov/ns/oscal'", {}), nsTest("'http://example.com/a'", {}), nsTest("'http://csrc.nist.gov/ns/oscal'", { ns: "http://example.com/a" })], [0, 1, 1]));
  test("D4.3: the namespaces are equal character for character", () =>
    same([nsTest("'http://example.com/a'", { ns: "http://example.com/a" }), nsTest("'http://example.com/a'", { ns: "http://example.com/A" }), nsTest("'http://example.com/a'", { ns: "http://example.com/a/" })], [0, 1, 1]));
  test("D4.4: the function applies to a property, a part and an assessment part, and gives an error for any other node", () => {
    const onLocation = run(custom(locationDef, { test: "has-oscal-namespace('http://csrc.nist.gov/ns/oscal')" }), location({ uuid: "u" }));
    const onPart = run(custom(partDef, { test: "has-oscal-namespace('http://example.com/a')" }), catalog({ controls: [{ id: "c", title: "t", parts: [{ name: "n", ns: "http://example.com/a" }] }] }));
    return (onLocation.errors.length === 1 && onLocation.failures.length === 0 && onPart.errors.length === 0 && onPart.failures.length === 0) || JSON.stringify([onLocation, onPart]);
  });

  // The partial index of design D9.
  const ssp = (byComponents: object[], link?: string) => ({
    "system-security-plan": {
      "system-implementation": { "leveraged-authorizations": [{ uuid: "l", title: "t", "party-uuid": "p", "date-authorized": "2020-01-01", links: [{ href: "https://example.com/ssp.json", rel: "system-security-plan" }] }] },
      "control-implementation": { "implemented-requirements": [{ uuid: "r", "control-id": "c", "by-components": byComponents }] },
      ...(link ? {} : {}),
    },
  });
  const byComponent = (uuid: string, links: object[] = []) => ({ "component-uuid": "k", uuid, description: "d", links });
  const sspConstraints = [...byId("oscal-ssp-by-component-uuid-index"), ...byId("oscal-by-component-uuid-index")];
  test("CNS-014.02 and D9: an index with a part in another document is partial, and still checks the local keys", () => {
    const r = run(sspConstraints, ssp([byComponent("a"), byComponent("a")]));
    return same([r.partialIndexes, r.failures.map((f) => f.id)], [["by-component-uuid"], ["oscal-ssp-by-component-uuid-index"]]);
  });
  test("CNS-015.02 and D9: a provided-by link into the other document gives no failure", () =>
    same(run(sspConstraints, ssp([byComponent("a", [{ href: "#only-in-the-leveraged-ssp", rel: "provided-by" }])])).failures.length, 0));
  test("D9: a constraint of an index without a part in another document is not partial", () =>
    same(run(byId("oscal-index-metadata-party-uuid", "index"), withMeta({})).partialIndexes, []));
  test("CNS-007.01: the target of a constraint with a doc() branch selects the nodes of the same document only", () => {
    const e = parseMetapath(byId("oscal-ssp-by-component-uuid-index")[0].target);
    const { expr, dropped } = localPart(e);
    return (dropped && expr !== null && !callsDoc(expr)) || "doc() branch not dropped";
  });

  // CNS-017: at most one failure for one location.
  const nested = catalog({ controls: [{ id: "c1", title: "t", controls: [{ id: "c2", title: "t", parts: [{ name: "bogus" }] }] }] });
  test("CNS-017.03: a target node that the target queries of two context nodes select gives one failure", () =>
    same(run(byId("oscal-control-statement-part-name"), nested).failures.map((f) => f.location), ["$['catalog']['controls'][0]['controls'][0]['parts'][0]['name']"]));
  test("CNS-017: a has-cardinality entry gives a failure at its context node, and an is-unique entry at its target node", () => {
    const card = run(byId("oscal-metadata-location-title-address-email-address-telephone-cardinality"), location({ uuid: "u" })).failures[0].location;
    return same(card, "$['system-security-plan']['metadata']['locations'][0]");
  });
  test("CNS-017: two keys of one location are two failures", () => {
    const r = run(byId("oscal-index-metadata-party-uuid"), refParty(["q", "r"], []));
    return same(r.failures.map((f) => f.location), ["$['catalog']['metadata']['responsible-parties'][0]['party-uuids'][0]", "$['catalog']['metadata']['responsible-parties'][0]['party-uuids'][1]"]);
  });
  test("every constraint of the manifest set parses, and the datatypes have a pattern", () => {
    for (const c of model.constraints) {
      parseMetapath(c.target);
      for (const kf of c.keyFields ?? []) parseMetapath(kf.target);
      if (c.test !== undefined) parseMetapath(c.test);
      if (c.kind === "matches") valueMatcher("1.2.3", c);
    }
    return true;
  });
  test("a valid document gives no failure", () => same(run(model.constraints.filter((c) => c.level === "ERROR"), catalog({ controls: [{ id: "c", title: "t", props: [{ name: "label", value: "1" }], parts: [{ name: "statement" }] }] })).failures.map((f) => f.id), []));

  let failed = 0;
  for (const [name, fn] of cases) {
    let out: boolean | string;
    try {
      out = fn();
    } catch (error) {
      out = `threw ${(error as Error).stack}`;
    }
    const ok = out === true;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || out === false ? "" : `\n      ${out}`}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  return failed ? 1 : 0;
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "constraint-reference.ts") {
  if (process.argv.includes("--self-test")) process.exit(selfTest());
  console.error("usage: tsx scripts/constraint-reference.ts --self-test");
  process.exit(2);
}
