/**
 * The documents of the checks of the constraint manifest (openspec/specs/constraint-validation, CNS-019, CNS-022):
 * documents of each model that conform to the JSON Schema, that together hold each definition, flag and child of the
 * metaschema, and that unroll each recursive definition to a depth of 6 (tasks.md 3.4), and the documents of the
 * corpus that conform to the schema. The elements of the element context queries come from these documents.
 */
import fs from "node:fs";
import path from "node:path";
import { Ajv, type ValidateFunction } from "ajv";
import { addDatatypeFormats } from "./datatype-rules.js";
import { GenerationError } from "./constraints-regex.js";
import type { Def, Model } from "./metaschema.js";
import { allNodes, loadDoc, loadElement, type MNode } from "./metapath.js";
import { readYaml } from "./yaml-reader.js";

/** The recursion limit of the generated documents: a definition occurs at most 6 times along one chain. */
export const DEPTH = 6;

export interface CheckDocument {
  name: string;
  json: unknown;
  tree: MNode;
  nodes: MNode[];
}

/** An element of an element type, with the tree of its nodes. The path of its root node is `$[0]`. */
export interface ElementSample extends CheckDocument {
  type: string;
}

type Obj = Record<string, any>;
const OMIT = Symbol("omit");

/** A value for each datatype of the schema that conforms to its pattern and format. A new datatype fails the generation. */
export const SAMPLES: Record<string, (distinct: number) => unknown> = {
  Base64Datatype: () => "AAAA",
  BooleanDatatype: () => true,
  DateDatatype: () => "2024-01-02",
  DateTimeWithTimezoneDatatype: () => "2024-01-02T03:04:05Z",
  DecimalDatatype: () => 1.5,
  EmailAddressDatatype: () => "a@example.com",
  IntegerDatatype: () => 1,
  MarkupLineDatatype: () => "x",
  MarkupMultilineDatatype: () => "x",
  NonNegativeIntegerDatatype: () => 1,
  PositiveIntegerDatatype: () => 1,
  StringDatatype: () => "x",
  TokenDatatype: (n) => (n ? `x${n}` : "x"),
  URIDatatype: () => "https://example.com",
  URIReferenceDatatype: (n) => (n % 2 ? "https://example.com/x" : "#x"),
  UUIDDatatype: (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
};

/** Generates documents from the JSON Schema. A rotation over the branches and the enum values varies the documents. */
class Generator {
  private readonly rotation = new Map<object, number[]>();
  private chain = new Map<string, number>();
  private frames = 0;
  private distinct = false;
  private counter = 0;

  constructor(private readonly schema: Obj) {}

  /** The index of the least used option of `node`, which counts as used afterwards. */
  private pick(node: object, count: number, skip: number[] = []): number {
    const used = this.rotation.get(node) ?? new Array<number>(count).fill(0);
    this.rotation.set(node, used);
    let best = -1;
    for (let i = 0; i < count; i++) if (!skip.includes(i) && (best < 0 || used[i] < used[best])) best = i;
    if (best >= 0) used[best]++;
    return best;
  }

  private value(name: string): unknown {
    const make = SAMPLES[name];
    if (!make) throw new GenerationError(`no sample value for the datatype ${name}`);
    return make(this.distinct ? ++this.counter : 0);
  }

  private node(node: Obj, where: string): unknown {
    if (typeof node.$ref === "string") {
      const name = node.$ref.replace(/^#\/definitions\//, "");
      if (name in SAMPLES) return this.value(name);
      const target = this.schema.definitions[name];
      if (!target) throw new GenerationError(`the reference ${node.$ref} does not resolve`);
      const seen = this.chain.get(name) ?? 0;
      if (seen >= DEPTH) return OMIT;
      this.chain.set(name, seen + 1);
      this.frames++;
      try {
        return this.node(target, name);
      } finally {
        this.chain.set(name, seen);
        this.frames--;
      }
    }
    if (Array.isArray(node.enum)) return node.enum[this.pick(node, node.enum.length)];
    if (Array.isArray(node.allOf)) {
      const members = node.allOf as Obj[];
      const listed = members.find((m) => Array.isArray(m.enum));
      if (listed) return listed.enum[this.pick(listed, listed.enum.length)];
      const values = members.map((m) => this.node(m, where));
      if (values.includes(OMIT)) return OMIT;
      const objects = values.filter((v) => v !== null && typeof v === "object");
      return objects.length === values.length ? Object.assign({}, ...objects) : values[0];
    }
    const branches = (node.anyOf ?? node.oneOf) as Obj[] | undefined;
    if (branches) {
      const skip: number[] = [];
      while (skip.length < branches.length) {
        const i = this.pick(node, branches.length, skip);
        const v = this.node(branches[i], `${where}/${i}`);
        if (v !== OMIT) {
          if (!node.properties) return v;
          const own = this.object(node, where);
          return own === OMIT ? OMIT : { ...(own as Obj), ...(v as Obj) };
        }
        skip.push(i);
      }
      return OMIT;
    }
    if (node.type === "array") {
      const item = this.node(node.items, `${where}/items`);
      if (item === OMIT) return OMIT;
      // Two items in the arrays near the root give duplicates, and more than one node for a cardinality.
      const second = this.frames <= 2 ? this.node(node.items, `${where}/items`) : OMIT;
      return second === OMIT ? [item] : [item, second];
    }
    if (node.type === "object" || node.properties) return this.object(node, where);
    switch (node.type) {
      case "string":
        if (node.pattern !== undefined || node.format !== undefined) throw new GenerationError(`no sample value for the string at ${where}`);
        return "x";
      case "number":
      case "integer":
        return 1;
      case "boolean":
        return true;
    }
    throw new GenerationError(`no sample value for the schema at ${where}`);
  }

  private object(node: Obj, where: string): unknown {
    const out: Obj = {};
    const required: string[] = node.required ?? [];
    for (const [key, sub] of Object.entries<Obj>(node.properties ?? {})) {
      const v = this.node(sub, `${where}/${key}`);
      if (v === OMIT) {
        if (required.includes(key)) return OMIT;
        continue;
      }
      out[key] = v;
    }
    return out;
  }

  /** A document with the root key `root`. A distinct document gives each token and UUID its own value. */
  document(root: string, distinct: boolean): unknown {
    this.distinct = distinct;
    this.counter = 0;
    this.chain = new Map();
    this.frames = 0;
    const branch = (this.schema.oneOf as Obj[]).find((b) => root in b.properties);
    const v = this.node(branch!.properties[root], root);
    if (v === OMIT) throw new GenerationError(`the document ${root} cannot be generated`);
    return { [root]: v };
  }
}

/** The things that a tree holds: a definition, a flag of a definition, and a child of a definition. */
function itemsOf(tree: MNode, into: Set<string>): void {
  for (const n of allNodes(tree)) {
    if (n.kind === "doc" || !n.def) continue;
    into.add(`def ${n.def.id}`);
    const p = n.parent;
    if (p && p.def) into.add(n.kind === "flag" ? `flag ${p.def.id} ${n.name}` : `child ${p.def.id} ${n.def.id} ${n.name}`);
  }
}

/** The things that a model can hold: the same items, from the definitions of the metaschema. */
function universe(model: Model, holdsFlag: (parent: Def, name: string) => boolean): Set<string> {
  const reachable = new Set<Def>();
  const visit = (d: Def) => {
    if (reachable.has(d)) return;
    reachable.add(d);
    for (const f of d.flags) if (holdsFlag(d, f.name)) visit(f.def);
    for (const c of d.children) visit(c.def);
  };
  for (const r of model.roots) visit(r);
  const out = new Set<string>();
  for (const d of reachable) {
    out.add(`def ${d.id}`);
    for (const f of d.flags) if (holdsFlag(d, f.name)) out.add(`flag ${d.id} ${f.name}`);
    for (const c of d.children) out.add(`child ${d.id} ${c.def.id} ${c.useName}`);
  }
  return out;
}

export function schemaValidator(schemaFile: string): ValidateFunction {
  const schema = JSON.parse(fs.readFileSync(schemaFile, "utf8")) as { $id: string };
  const ajv = new Ajv({ allErrors: false, strict: false });
  addDatatypeFormats(ajv);
  ajv.addSchema(schema);
  return ajv.getSchema(schema.$id) as ValidateFunction;
}

const MAX_ROUNDS = 12;

/**
 * The generated documents. Each round gives one document of each model, and a round after the second stays only when it
 * holds something new. The generation fails when the documents leave a definition, a flag or a child of the model out,
 * except a flag that the JSON Schema does not allow.
 */
export function generatedDocuments(model: Model, schemaFile: string, holdsFlag: (parent: Def, name: string) => boolean): CheckDocument[] {
  const schema = JSON.parse(fs.readFileSync(schemaFile, "utf8")) as Obj;
  const validate = schemaValidator(schemaFile);
  const gen = new Generator(schema);
  const held = new Set<string>();
  const docs: CheckDocument[] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let added = 0;
    for (const root of model.roots) {
      const json = gen.document(root.rootName!, round % 2 === 1);
      if (!validate(json))
        throw new GenerationError(`the generated ${root.rootName} document does not conform to the schema: ${validate.errors![0].instancePath} ${validate.errors![0].message}`);
      const tree = loadDoc(json, model.roots);
      const items = new Set<string>();
      itemsOf(tree, items);
      const fresh = [...items].filter((i) => !held.has(i));
      if (round >= 2 && fresh.length === 0) continue;
      for (const i of items) held.add(i);
      added += fresh.length;
      docs.push({ name: `generated ${root.rootName} ${round}`, json, tree, nodes: allNodes(tree) });
    }
    if (round >= 1 && added === 0) break;
  }
  const missing = [...universe(model, holdsFlag)].filter((i) => !held.has(i));
  if (missing.length) throw new GenerationError(`the generated documents miss ${missing.length} item(s): ${missing.slice(0, 5).join("; ")}`);
  return docs;
}

/** The documents of the corpus that hold a valid document of the schema. */
export function corpusDocuments(model: Model, schemaFile: string, dir: string): CheckDocument[] {
  const validate = schemaValidator(schemaFile);
  const out: CheckDocument[] = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/\.(json|ya?ml)$/.test(f)) continue;
    const bytes = fs.readFileSync(path.join(dir, f));
    let json: unknown;
    if (f.endsWith(".json")) json = JSON.parse(bytes.toString("utf8"));
    else {
      const r = readYaml(bytes, validate);
      if (!r.ok) throw new GenerationError(`the YAML reader rejects ${f}: ${r.detail}`);
      json = r.value;
    }
    if (!validate(json)) throw new GenerationError(`the corpus document ${f} does not conform to the schema`);
    const tree = loadDoc(json, model.roots);
    out.push({ name: `corpus ${f}`, json, tree, nodes: allNodes(tree) });
  }
  return out;
}

/** A signature of the keys of a value, without the values. Two elements with the same signature have the same shape. */
function shape(v: unknown): string {
  if (Array.isArray(v)) return `[${[...new Set(v.map(shape))].sort().join(",")}]`;
  if (v !== null && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${k}:${shape((v as Obj)[k])}`).join(",")}}`;
  return typeof v === "string" ? "s" : typeof v;
}

const PER_TYPE = 4;

/**
 * The elements of an element type that the documents hold: for a definition, its outermost instances, one for each shape,
 * and for a document type, the documents of its models.
 */
export function elementsOf(
  docs: CheckDocument[],
  targets: Iterable<{ key: string; def?: Def; roots?: Def[] }>,
  model: Model,
): ElementSample[] {
  const out: ElementSample[] = [];
  for (const t of targets) {
    const shapes = new Set<string>();
    const take = (json: unknown, tree: () => MNode, name: string) => {
      const s = shape(json);
      if (shapes.size >= PER_TYPE || shapes.has(s)) return;
      shapes.add(s);
      const root = tree();
      out.push({ type: t.key, name, json: [json], tree: root, nodes: allNodes(root) });
    };
    for (const d of docs) {
      if (t.def) {
        for (const n of d.nodes) {
          if (n.def !== t.def || n.kind === "doc") continue;
          let outer = false;
          for (let p = n.parent; p && !outer; p = p.parent) outer = p.def === t.def;
          if (!outer) take(n.json, () => loadElement(n.json, t.def!), `${d.name} ${n.path}`);
        }
      } else if (t.roots?.some((r) => r.rootName !== undefined && d.json !== null && typeof d.json === "object" && r.rootName in (d.json as Obj))) {
        take(d.json, () => loadDoc(d.json, model.roots, "$[0]"), d.name);
      }
    }
  }
  return out;
}
