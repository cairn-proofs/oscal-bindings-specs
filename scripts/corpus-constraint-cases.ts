/**
 * Generates the `parse` cases for the constraint failures of the corpus (openspec/specs/constraint-validation, CNS-020;
 * tasks.md 4.3 of the change validate-metaschema-constraints). For each reportable entry of the constraint manifest it
 * writes one input under documents/invalid/constraints/ and one case at the end of cases.json.
 *
 * Each input starts from the smallest document that conforms to the JSON Schema (the required members only). The
 * generator adds the context node of the entry at the place where the generated documents of CNS-019 hold it, and the
 * target nodes that the target queries of the entry select. It then makes one change: the value of a target node, a
 * copy of a target node, or the absence of a node. The corpus check (scripts/check-corpus.ts) runs the reference
 * evaluator on each input, so a wrong input fails the check, and this script needs no check of its own.
 *
 *   npm run corpus:cases           write the inputs and the cases
 *   npm run corpus:cases -- --self-test   run the rule scenarios of the construction
 */
import fs from "node:fs";
import path from "node:path";
import { CorpusConstraints, type EntryFailure } from "./corpus-constraints.js";
import { generatedDocuments, SAMPLES, schemaValidator } from "./constraints-docs.js";
import { Generator, type Entry } from "./constraints-lib.js";
import { run } from "./jsonpath.js";

type Json = any;
type Schema = any;

const RELEASE = fs.readFileSync("VERSION", "utf8").trim().split("+oscal.")[1];
const SCHEMA_FILE = `schemas/${RELEASE}/oscal_complete_schema.json`;
const CORPUS = `corpus/${RELEASE}`;
const OUTPUT = "documents/invalid/constraints";
const CASES_FILE = `${CORPUS}/cases.json`;
/** The first line of the first generated case: the generated cases are the last cases of the index. */
const FIRST_CASE = '    {\n      "id": "parse/constraint/';

/** The scenario of the rule of each kind of entry, which a generated case cites with PRS-015.01. */
const SCENARIO: Record<string, string> = {
  "allowed-values": "CNS-008.02",
  matches: "CNS-010.01",
  "has-cardinality": "CNS-011.01",
  "is-unique": "CNS-013.01",
  index: "CNS-014.01",
  "index-has-key": "CNS-015.01",
  expect: "CNS-016.01",
};

// ---------------------------------------------------------------------------------------------------------------
// The JSON Schema: navigation and the smallest values

const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, "utf8")) as Schema;
const definitions = schema.definitions as Record<string, Schema>;
const refName = (node: Schema): string | undefined => (typeof node?.$ref === "string" ? (node.$ref as string).replace(/^#\/definitions\//, "") : undefined);
/** A datatype that has a sample value. A fragment reference would add a link to resolve, so the sample is an absolute URI. */
const sampleOf = (name: string, n: number): unknown => (name === "URIReferenceDatatype" ? "https://example.com/x" : SAMPLES[name](n));
let counter = 0;

/** The node with its references resolved, except a reference to a datatype. */
function resolve(node: Schema): Schema {
  for (let i = 0; i < 20; i++) {
    const name = refName(node);
    if (name === undefined || name in SAMPLES) return node;
    node = definitions[name];
  }
  throw new Error("a reference chain is too long");
}
/** The node and the members of its `allOf`, `anyOf` and `oneOf`, resolved. */
function parts(node: Schema, depth = 0): Schema[] {
  const n = resolve(node);
  if (depth > 6) return [n];
  return [n, ...[...(n.allOf ?? []), ...(n.anyOf ?? []), ...(n.oneOf ?? [])].flatMap((m: Schema) => parts(m, depth + 1))];
}
/** The subschema of a member or an item of `node`. */
function childSchema(node: Schema, key: string | number): Schema | undefined {
  for (const p of parts(node)) {
    if (typeof key === "number") {
      if (p.items !== undefined) return p.items;
    } else if (p.properties?.[key] !== undefined) return p.properties[key];
  }
  return undefined;
}
/** The names of the members that `node` allows. */
const memberNames = (node: Schema): string[] => [...new Set(parts(node).flatMap((p) => Object.keys(p.properties ?? {})))];
const isArraySchema = (node: Schema): boolean => parts(node).some((p) => p.type === "array" || p.items !== undefined) && !parts(node).some((p) => p.type === "object");

/** The smallest value of a schema: an object with its required members only, and an array with one item. */
function sample(node: Schema, depth = 0): Json {
  if (depth > 30) throw new Error("the schema recurs without a required end");
  const n = resolve(node);
  const name = refName(n);
  if (name !== undefined) return sampleOf(name, ++counter);
  if (Array.isArray(n.enum)) return n.enum[0];
  const closed = (n.allOf ?? []).map(resolve).find((m: Schema) => Array.isArray(m.enum));
  if (closed) return closed.enum[0];
  const props: Record<string, Schema> = {};
  const required = new Set<string>();
  let items: Schema | undefined;
  const collect = (m: Schema, d: number) => {
    const r = resolve(m);
    Object.assign(props, r.properties ?? {});
    for (const k of r.required ?? []) required.add(k);
    items ??= r.items;
    for (const x of r.allOf ?? []) if (d < 6) collect(x, d + 1);
  };
  collect(n, 0);
  const branch = (n.anyOf ?? n.oneOf)?.[0];
  if (branch !== undefined) {
    const b = resolve(branch);
    if (refName(b) !== undefined) return sample(b, depth + 1);
    collect(b, 0);
    if (Array.isArray(b.enum)) return b.enum[0];
  }
  if (items !== undefined) return [sample(items, depth + 1)];
  if (Object.keys(props).length > 0 || n.type === "object") {
    const out: Record<string, Json> = {};
    for (const k of required) if (props[k] !== undefined) out[k] = k === "oscal-version" ? RELEASE : sample(props[k], depth + 1);
    return out;
  }
  if (n.type === "number" || n.type === "integer") return 1;
  if (n.type === "boolean") return true;
  return "x";
}

// ---------------------------------------------------------------------------------------------------------------
// Queries: the segments of an RFC 9535 query and the construction of the nodes that it selects

type Seg = { k: "name"; name: string } | { k: "index"; i: number } | { k: "wild" } | { k: "filter"; expr: string } | { k: "desc"; name: string };

/** The segments of the queries of a manifest: names, indexes, `*`, filters, and a descendant name. */
export function parseQuery(query: string): Seg[] {
  const out: Seg[] = [];
  let i = 1;
  if (!query.startsWith("$")) throw new Error(`the query ${query} does not start with $`);
  while (i < query.length) {
    const desc = query.startsWith("..", i);
    if (desc) i += 2;
    if (query[i] !== "[") throw new Error(`the query ${query} has an unsupported segment at ${i}`);
    let depth = 0;
    let j = i;
    let quote = false;
    for (; j < query.length; j++) {
      const ch = query[j];
      if (quote) {
        if (ch === "\\") j++;
        else if (ch === "'") quote = false;
      } else if (ch === "'") quote = true;
      else if (ch === "[") depth++;
      else if (ch === "]" && --depth === 0) break;
    }
    const body = query.slice(i + 1, j);
    i = j + 1;
    const name = /^'((?:[^'\\]|\\.)*)'$/.exec(body);
    if (desc) {
      if (!name) throw new Error(`the query ${query} has a descendant segment that is not a name`);
      out.push({ k: "desc", name: name[1] });
    } else if (name) out.push({ k: "name", name: name[1] });
    else if (body === "*") out.push({ k: "wild" });
    else if (/^\d+$/.test(body)) out.push({ k: "index", i: Number(body) });
    else if (body.startsWith("?")) out.push({ k: "filter", expr: body.slice(1) });
    else throw new Error(`the query ${query} has an unsupported selector ${body}`);
  }
  return out;
}

/** A place in a document: the value is `holder[key]`, and `schema` is its subschema. */
interface Ref {
  holder: Json;
  key: string | number;
  schema: Schema;
}
const valueOf = (r: Ref): Json => r.holder[r.key];
const isObject = (v: Json): boolean => v !== null && typeof v === "object" && !Array.isArray(v);

/** Changes the object `item` until the filter selects it. Returns false when it cannot. */
function satisfy(item: Json, expr: string, itemSchema: Schema): boolean {
  const ok = () => run(`$[?${expr}]`, [item]).length > 0;
  if (ok()) return true;
  const made: string[] = [];
  const set = (k: string, v: Json) => {
    if (item[k] === undefined) made.push(k);
    item[k] = v;
  };
  for (const m of expr.matchAll(/@\['([^']+)'\] == '((?:[^'\\]|\\.)*)'/g)) {
    set(m[1], m[2].replace(/\\(.)/g, "$1"));
    if (ok()) break;
  }
  if (!ok())
    for (const m of expr.matchAll(/(?<![\w'])@\['([^']+)'\](?!\s*==)/g)) {
      const sub = childSchema(itemSchema, m[1]);
      if (item[m[1]] === undefined && sub !== undefined) set(m[1], sample(sub));
      if (ok()) break;
    }
  if (!ok())
    for (const m of expr.matchAll(/match\(@\['([^']+)'\], '((?:[^'\\]|\\.)*)'\)/g)) {
      const literal = /^[^.[(*+?{|\\]*/.exec(m[2])![0];
      for (const candidate of [literal, `${literal}x`, `${literal}00000000-0000-4000-8000-0000000000aa`]) {
        item[m[1]] = candidate;
        if (ok()) break;
      }
      if (ok()) break;
    }
  return ok();
}

/** The place of the first member `name` below `ref`, or the place that the schema allows for it nearest to `ref`. */
function descend(ref: Ref, name: string): Ref {
  const find = (value: Json, sch: Schema | undefined, depth: number): Ref | undefined => {
    if (depth > 12 || sch === undefined) return undefined;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const r = find(value[i], childSchema(sch, 0), depth + 1);
        if (r) return r;
      }
    } else if (isObject(value)) {
      if (name in value) return { holder: value, key: name, schema: childSchema(sch, name) ?? {} };
      for (const [k, v] of Object.entries(value)) {
        const r = find(v, childSchema(sch, k), depth + 1);
        if (r) return r;
      }
    }
    return undefined;
  };
  const existing = find(valueOf(ref), ref.schema, 0);
  if (existing) return existing;
  // The shortest chain of members through the schema that reaches a node with a member `name`.
  const queue: Array<{ node: Schema; chain: Seg[] }> = [{ node: ref.schema, chain: [] }];
  const seen = new Set<Schema>();
  while (queue.length) {
    const { node, chain } = queue.shift()!;
    if (chain.length > 5) continue;
    if (memberNames(node).includes(name)) return follow(ref, [...chain, { k: "name", name }]);
    for (const key of memberNames(node)) {
      const sub = childSchema(node, key)!;
      const array = isArraySchema(sub);
      const next = array ? childSchema(sub, 0)! : sub;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push({ node: next, chain: [...chain, { k: "name", name: key }, ...(array ? [{ k: "wild" } as Seg] : [])] });
    }
  }
  throw new Error(`the schema has no path to a member ${name}`);
}

/** Follows the segments from `ref`, and creates each node that is missing and each filter that no node meets. */
function follow(start: Ref, segs: Seg[]): Ref {
  let ref = start;
  for (const seg of segs) {
    const value = valueOf(ref);
    switch (seg.k) {
      case "name": {
        const sub = childSchema(ref.schema, seg.name);
        if (!isObject(value) || sub === undefined) throw new Error(`no member ${seg.name} at this node`);
        value[seg.name] ??= sample(sub);
        ref = { holder: value, key: seg.name, schema: sub };
        break;
      }
      case "index":
      case "wild": {
        const i = seg.k === "index" ? seg.i : 0;
        if (!Array.isArray(value)) throw new Error("an array is expected");
        const items = childSchema(ref.schema, 0);
        while (value.length <= i) value.push(sample(items));
        ref = { holder: value, key: i, schema: items };
        break;
      }
      case "filter": {
        if (!Array.isArray(value)) throw new Error("a filter applies to an array here");
        const items = childSchema(ref.schema, 0);
        let i = value.findIndex((item: Json) => run(`$[?${seg.expr}]`, [item]).length > 0);
        if (i < 0) {
          if (value.length === 0) value.push(sample(items));
          i = 0;
          if (!satisfy(value[0], seg.expr, items)) throw new Error(`no value meets the filter ${seg.expr}`);
        }
        ref = { holder: value, key: i, schema: items };
        break;
      }
      case "desc":
        ref = descend(ref, seg.name);
        if (valueOf(ref) === undefined) ref.holder[ref.key] = sample(ref.schema);
        break;
    }
  }
  return ref;
}

/** The place that the query selects from the context node at `ctx`. The query runs on an array that holds the node. */
function select(ctx: Ref, query: string): Ref {
  const segs = parseQuery(query);
  let at = ctx;
  const first = segs[0];
  if (first?.k === "index" || first?.k === "wild") segs.shift();
  else if (first?.k === "filter") {
    segs.shift();
    if (!isObject(valueOf(ctx)) || !satisfy(valueOf(ctx), first.expr, ctx.schema)) throw new Error(`the context node does not meet the filter ${first.expr}`);
  } else if (first !== undefined) throw new Error(`the query ${query} does not select from the array of the node`);
  at = follow(at, segs);
  return at;
}

// ---------------------------------------------------------------------------------------------------------------
// The documents

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const tokensOf = (normalizedPath: string): Array<string | number> =>
  [...normalizedPath.matchAll(/\['((?:[^'\\]|\\.)*)'\]|\[(\d+)\]/g)].map((m) => (m[1] !== undefined ? m[1].replace(/\\(.)/g, "$1") : Number(m[2])));
type Tokens = Array<string | number>;

interface Tool {
  entries: Entry[];
  constraints: CorpusConstraints;
  validate: (json: unknown) => boolean;
  errors: () => unknown;
  /** For each entry and each root key, the location of the context node in the generated documents: the shortest. */
  contexts: Map<number, Map<string, Tokens>>;
  branches: Map<string, Schema>;
}

function prepare(): Tool {
  const gen = new Generator(RELEASE);
  const docs = generatedDocuments(gen.model, SCHEMA_FILE, (d, n) => gen.schemaHoldsFlag(d, n));
  const constraints = CorpusConstraints.load(RELEASE);
  const contexts = new Map<number, Map<string, Tokens>>();
  constraints.entries.forEach((e, i) => {
    const byRoot = new Map<string, Tokens>();
    for (const d of docs)
      for (const q of e.context.document)
        for (const hit of run(q, d.json)) {
          const t = tokensOf(hit.path);
          const best = byRoot.get(String(t[0]));
          if (best === undefined || t.length < best.length) byRoot.set(String(t[0]), t);
        }
    contexts.set(i, byRoot);
  });
  const branches = new Map<string, Schema>();
  for (const b of schema.oneOf as Schema[]) for (const k of Object.keys(b.properties)) if (k !== "$schema") branches.set(k, b);
  const validator = schemaValidator(SCHEMA_FILE);
  const errors = () =>
    validator.errors
      ?.filter((x) => !(x.instancePath === "" && (x.keyword === "oneOf" || (x.keyword === "required" && branches.has(String((x.params as { missingProperty?: string }).missingProperty))))))
      .slice(0, 3)
      .map((x) => `${x.instancePath} ${x.message}`);
  return { entries: constraints.entries, constraints, validate: (j) => validator(j) === true, errors, contexts, branches };
}

/** The location of a node in a document, and the subschema of the node. */
interface Place {
  tokens: Tokens;
  schema: Schema;
}
/** The reference to the node at `place` in `doc`. */
function refIn(doc: Json, place: Place): Ref {
  let holder: Json = doc;
  for (const t of place.tokens.slice(0, -1)) holder = holder[t];
  return { holder, key: place.tokens[place.tokens.length - 1], schema: place.schema };
}

/** The place at `tokens` in `doc`, with each node on the way that is missing. Each array on the way holds the item at index 0. */
function reach(tool: Tool, doc: Json, tokens: Tokens): Place {
  const path = tokens.map((t) => (typeof t === "number" ? 0 : t));
  const root = path[0] as string;
  let sch: Schema = childSchema(tool.branches.get(root)!, root);
  doc[root] ??= sample(sch);
  let holder: Json = doc[root];
  for (const t of path.slice(1)) {
    const sub = childSchema(sch, t);
    if (sub === undefined) throw new Error(`the schema has no member ${String(t)} on the way to the node`);
    if (typeof t === "number") while (holder.length <= t) holder.push(sample(sub));
    else holder[t] ??= sample(sub);
    holder = holder[t];
    sch = sub;
  }
  return { tokens: path, schema: sch };
}
/** The subschema of the node at `tokens`. */
function schemaAt(tool: Tool, tokens: Tokens): Schema | undefined {
  let sch: Schema | undefined = tool.branches.get(String(tokens[0]));
  for (const t of tokens) {
    if (sch === undefined) return undefined;
    sch = childSchema(sch, typeof t === "number" ? 0 : t);
  }
  return sch;
}

const idOf = (f: EntryFailure) => f.id ?? "(no id)";
interface Outcome {
  doc: Json;
  failures: EntryFailure[];
}
/** The reason of the last document that `judge` refused, for the messages of the generation. */
let why = "";
/** The document when it conforms to the schema and the entry fails for it. */
function judge(tool: Tool, i: number, doc: Json): Outcome | undefined {
  if (!tool.validate(doc)) {
    why = `the document does not conform to the schema: ${JSON.stringify(tool.errors())}`;
    return undefined;
  }
  const failures = tool.constraints.ofDocument(doc);
  if (!failures.some((f) => f.entry === i)) {
    why = `the entry does not fail. Failures: ${JSON.stringify(failures.map(idOf))}${process.env.CORPUS_DEBUG ? ` ${JSON.stringify(doc)}` : ""}`;
    return undefined;
  }
  return { doc, failures };
}

const at = (doc: Json, tokens: Tokens): Json => tokens.reduce((v: Json, t) => v?.[t], doc);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The string values below a node, with their locations. */
function leaves(value: Json, tokens: Tokens, out: Array<{ tokens: Tokens; value: string }> = []): Array<{ tokens: Tokens; value: string }> {
  if (typeof value === "string") out.push({ tokens, value });
  else if (value !== null && typeof value === "object") for (const [k, v] of Object.entries(value)) leaves(v, [...tokens, Array.isArray(value) ? Number(k) : k], out);
  return out;
}
let fresh = 0;
const variant = (value: string) => (UUID.test(value) ? `${value.slice(0, -4)}${String(9000 + ++fresh).padStart(4, "0")}` : `${value}-${++fresh}`);

/** The changes that can remove the failure `f` of another entry. Each change is tried on a copy of the document. */
function* repairs(tool: Tool, doc: Json, f: EntryFailure, valuesOnly = false): IterableIterator<Json> {
  const e = tool.entries[f.entry];
  const tokens = tokensOf(f.location);
  const node = at(doc, tokens);
  const edit = (change: (copy: Json) => void): Json => {
    const copy = clone(doc);
    change(copy);
    return copy;
  };
  // 1. A value that the closed entry lists.
  if (e.kind === "allowed-values")
    for (const value of e.values ?? []) yield edit((c) => (at(c, tokens.slice(0, -1))[tokens[tokens.length - 1]] = value));
  if (valuesOnly) return;
  // 2. A member that the node lacks: a child that a cardinality or a test needs.
  const sch = schemaAt(tool, tokens);
  if (isObject(node) && sch !== undefined)
    for (const member of memberNames(sch))
      if (!(member in node)) yield edit((c) => (at(c, tokens)[member] = sample(childSchema(sch, member))));
  // 3. Another value for each string below the node: two nodes with the same key.
  for (const leaf of leaves(node, tokens)) yield edit((c) => (at(c, leaf.tokens.slice(0, -1))[leaf.tokens[leaf.tokens.length - 1]] = variant(leaf.value)));
  // 4. The node that a reference names: a member of the index that the entry reads.
  if (e.kind === "index-has-key") {
    const root = String(tokens[0]);
    for (const kf of e["key-fields"] ?? [])
      for (const hit of run(kf.target[0], [node])) {
        const key = typeof hit.value === "string" && kf.prefix !== undefined ? hit.value.slice(kf.prefix.length) : hit.value;
        for (const index of tool.entries.filter((x, n) => x.kind === "index" && x["index-name"] === e["index-name"] && tool.contexts.get(n)?.has(root))) {
          const n = tool.entries.indexOf(index);
          yield edit((c) => {
            const place = reach(tool, c, tool.contexts.get(n)!.get(root)!);
            const target = select(refIn(c, place), index.target[0]);
            const field = select(target, index["key-fields"]![0].target[0]);
            field.holder[field.key] = key;
          });
        }
      }
  }
}

/** Removes the failures of other entries that the construction added, when a change keeps the entry failing. */
function polish(tool: Tool, i: number, outcome: Outcome): Outcome {
  let cur = outcome;
  const junk = (o: Outcome) => o.failures.filter((f) => f.entry !== i).length;
  for (let round = 0; round < 40 && junk(cur) > 0; round++) {
    let better: Outcome | undefined;
    search: for (const f of cur.failures.filter((x) => x.entry !== i)) {
      for (const candidate of repairs(tool, cur.doc, f)) {
        if (!tool.validate(candidate)) continue;
        repair(tool, candidate, i, true); // a new node can bring a closed value of its own
        const out = judge(tool, i, candidate);
        if (out && junk(out) < junk(cur)) {
          better = out;
          break search;
        }
      }
    }
    if (!better) break;
    cur = better;
  }
  return cur;
}

/** Removes the failures that the construction of the context node leaves, and keeps a failure of the entry `i` that it has. */
function repair(tool: Tool, doc: Json, i: number, valuesOnly = false): void {
  for (let round = 0; round < 40; round++) {
    const failures = tool.constraints.ofDocument(doc);
    const held = failures.some((x) => x.entry === i);
    let best: { doc: Json; count: number } | undefined;
    for (const f of failures)
      for (const candidate of repairs(tool, doc, f, valuesOnly)) {
        if (!tool.validate(candidate)) continue;
        const after = tool.constraints.ofDocument(candidate);
        if (after.length < (best?.count ?? failures.length) && (!held || after.some((x) => x.entry === i))) best = { doc: candidate, count: after.length };
      }
    if (!best) return;
    for (const k of Object.keys(doc)) delete doc[k];
    Object.assign(doc, best.doc);
  }
}

const BAD_VALUES = ["zz-invalid", "", "x", " x", "a b", "0", "1.5", "https://", "#", "zz-invalid-0", "ZZ"];
const DANGLING = ["00000000-0000-4000-8000-0000000000ff", "zz-dangling"];

/** Inserts a copy of the node after it, in the array that holds it. */
function duplicate(target: Ref): void {
  if (!Array.isArray(target.holder)) throw new Error("the target is not an item of an array");
  const k = Number(target.key);
  (target.holder as Json[]).splice(k + 1, 0, clone((target.holder as Json[])[k]));
}

/** The input for one entry, or the reason that none is found. */
export function build(tool: Tool, i: number): Outcome | string {
  const e = tool.entries[i];
  const errors: string[] = [];
  counter = 0; // the identifiers of an input do not depend on the entries that came before
  fresh = 0;
  const byRoot = tool.contexts.get(i)!;
  const tokens = [...byRoot.values()].sort((a, b) => a.length - b.length)[0];
  if (!tokens) return "no generated document holds a context node";
  const base: Json = {};
  const place = reach(tool, base, tokens);
  repair(tool, base, i);
  const targets = e.target.length ? e.target : ["$[0]"];
  /** Runs `edit` on a copy of the base document for each target query, until one gives an input. */
  const tryEach = (edit: (doc: Json, ctx: Ref, query: string) => Outcome | undefined): Outcome | undefined => {
    for (const query of targets) {
      const doc = clone(base);
      try {
        const out = edit(doc, refIn(doc, place), query);
        if (out) return out;
        errors.push(`${query}: ${why}`);
      } catch (error) {
        errors.push(`${query}: ${(error as Error).message}`);
      }
    }
    return undefined;
  };
  let found: Outcome | undefined;
  switch (e.kind) {
    case "allowed-values":
    case "matches":
      found = tryEach((doc, ctx, query) => {
        const target = select(ctx, query);
        for (const bad of BAD_VALUES) {
          target.holder[target.key] = bad;
          const out = judge(tool, i, doc);
          if (out) return out;
        }
        return undefined;
      });
      break;
    case "has-cardinality":
      found = judge(tool, i, base);
      found ??= tryEach((doc, ctx, query) => {
        duplicate(select(ctx, query));
        return judge(tool, i, doc);
      });
      break;
    case "is-unique":
    case "index":
      found = tryEach((doc, ctx, query) => {
        const target = select(ctx, query);
        for (const kf of e["key-fields"] ?? []) select(target, kf.target[0]);
        duplicate(target);
        return judge(tool, i, doc);
      });
      break;
    case "index-has-key":
      found = tryEach((doc, ctx, query) => {
        const target = select(ctx, query);
        for (const kf of e["key-fields"] ?? []) {
          const field = select(target, kf.target[0]);
          for (const candidate of DANGLING) {
            field.holder[field.key] = (kf.prefix ?? "") + candidate;
            const out = judge(tool, i, doc);
            if (out) return out;
          }
        }
        return undefined;
      });
      break;
    case "expect":
      // The context node alone, or a target node that the filter selects, or a target node with one more optional member.
      found = judge(tool, i, base);
      found ??= tryEach((doc, ctx, query) => {
        const target = select(ctx, query);
        const out = judge(tool, i, doc);
        if (out) return out;
        const node = valueOf(target);
        if (!isObject(node)) return undefined;
        for (const member of memberNames(target.schema)) {
          if (member in node) continue;
          node[member] = sample(childSchema(target.schema, member));
          const added = judge(tool, i, doc);
          if (added) return added;
          delete node[member];
        }
        return undefined;
      });
      break;
  }
  return found ? polish(tool, i, found) : `no input: ${errors.slice(0, 3).join("; ")}`;
}

/**
 * The name of the input and the case of each entry: its `id`. Entries with the same `id` add their definition, then their
 * kind, then their number in the group.
 */
function slugs(entries: Entry[], indexes: number[]): Map<number, string> {
  const groups = new Map<string, number[]>();
  for (const i of indexes) groups.set(entries[i].id!, [...(groups.get(entries[i].id!) ?? []), i]);
  const out = new Map<number, string>();
  for (const [id, members] of groups) {
    const def = (i: number) => `${id}-${entries[i].definition.split(":")[1]}`;
    const kind = (i: number) => `${def(i)}-${entries[i].kind}`;
    const unique = (name: (i: number) => string) => new Set(members.map(name)).size === members.length;
    members.forEach((i, n) => out.set(i, members.length === 1 ? id : unique(def) ? def(i) : unique(kind) ? kind(i) : `${kind(i)}-${n + 1}`));
  }
  return out;
}

const caseText = (slug: string, e: Entry, ids: string[]) =>
  [
    "    {",
    `      "id": "parse/constraint/${slug}",`,
    '      "operation": "parse",',
    `      "input": "${OUTPUT}/${slug}.json",`,
    '      "expected-category": "parse-error",',
    `      "expected-constraints": [${ids.map((x) => JSON.stringify(x)).join(", ")}],`,
    `      "requirements": ["PRS-015.01", "${SCENARIO[e.kind]}"]`,
    "    }",
  ].join("\n");

/** Writes the inputs, and replaces the generated cases at the end of cases.json. */
function write(tool: Tool, results: Map<number, Outcome>): void {
  const dir = `${CORPUS}/${OUTPUT}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const indexes = [...results.keys()].sort((a, b) => a - b);
  const names = slugs(tool.entries, indexes);
  const cases: string[] = [];
  for (const i of indexes) {
    const out = results.get(i)!;
    const slug = names.get(i)!;
    fs.writeFileSync(`${dir}/${slug}.json`, `${JSON.stringify(out.doc, null, 2)}\n`);
    cases.push(caseText(slug, tool.entries[i], out.failures.map(idOf).sort()));
  }
  const text = fs.readFileSync(CASES_FILE, "utf8");
  const end = "\n  ]\n}\n";
  const first = text.indexOf(FIRST_CASE);
  const head = first >= 0 ? text.slice(0, first) : `${text.slice(0, text.lastIndexOf(end))},\n`;
  fs.writeFileSync(CASES_FILE, `${head}${cases.join(",\n")}${end}`);
}

function selfTest(): number {
  const tool = prepare();
  const index = (id: string, kind?: string) => tool.entries.findIndex((e) => e.id === id && (kind === undefined || e.kind === kind));
  const outcome = (id: string, kind?: string) => build(tool, index(id, kind));
  const idsOf = (o: Outcome | string) => (typeof o === "string" ? o : o.failures.map(idOf).sort().join());
  const cases: Array<[string, () => boolean | string]> = [
    ["a query has the segments of a name, a filter, an index, a descendant name and a wildcard", () => JSON.stringify(parseQuery("$[0]['props'][?@['name'] == 'x']..['parts'][*]")) === JSON.stringify([{ k: "index", i: 0 }, { k: "name", name: "props" }, { k: "filter", expr: "@['name'] == 'x'" }, { k: "desc", name: "parts" }, { k: "wild" }])],
    ["a filter with a choice and a condition gets the values that it needs", () => {
      const item: Json = {};
      const expr = "(@['system'] == 'a' || @['system'] == 'b') && (@['name'] == 'n')";
      return (satisfy(item, expr, {}) && item.name === "n" && (item.system === "a" || item.system === "b")) || JSON.stringify(item);
    }],
    ["the smallest value of a root has its required members only, and conforms to the schema", () => {
      const doc = { catalog: sample(childSchema(tool.branches.get("catalog")!, "catalog")) };
      return (Object.keys(doc.catalog).sort().join() === "metadata,uuid" && tool.validate(doc)) || JSON.stringify(tool.errors());
    }],
    ["an allowed-values entry gets an input that fails the entry and conforms to the schema", () => idsOf(outcome("oscal-control-prop-name")).includes("oscal-control-prop-name") || idsOf(outcome("oscal-control-prop-name"))],
    ["a matches entry gets an input with a value that the pattern rejects", () => idsOf(outcome("oscal-check-hash-length-SHA2-3-256")) === "oscal-check-hash-length-SHA2-3-256" || idsOf(outcome("oscal-check-hash-length-SHA2-3-256"))],
    ["a has-cardinality entry gets an input without the child", () => idsOf(outcome("oscal-activity-type-cardinality")).includes("oscal-activity-type-cardinality")],
    ["an is-unique entry gets an input with two nodes that have the same key", () => idsOf(outcome("oscal-unique-resource-rlink-href")).includes("oscal-unique-resource-rlink-href") || idsOf(outcome("oscal-unique-resource-rlink-href"))],
    ["an index entry gets an input with the same key twice", () => idsOf(outcome("oscal-back-matter-resource-uuid-index")).includes("oscal-back-matter-resource-uuid-index") || idsOf(outcome("oscal-back-matter-resource-uuid-index"))],
    ["an index-has-key entry gets an input with a reference to nothing", () => idsOf(outcome("oscal-metadata-responsible-party-index-metadata-role-id")).includes("oscal-metadata-responsible-party-index-metadata-role-id")],
    ["an expect entry gets an input that its test rejects", () => idsOf(outcome("oscal-parameter-depends-on-deprecated")).includes("oscal-parameter-depends-on-deprecated")],
    ["an entry that no document can fail gets no input", () => typeof outcome("oscal-unique-resource-base64-filename") === "string"],
    ["the failures that the construction adds are removed: an is-unique input fails that entry alone", () => idsOf(outcome("oscal-unique-resource-rlink-href")) === "oscal-unique-resource-rlink-href"],
    ["entries with the same id get different names", () => {
      const names = slugs(tool.entries, tool.entries.flatMap((e, i) => (e.reportable ? [i] : [])));
      return new Set(names.values()).size === names.size && names.get(index("oscal-metadata-prop-name-values", "allowed-values"))!.startsWith("oscal-metadata-prop-name-values-");
    }],
  ];
  let failed = 0;
  for (const [name, fn] of cases) {
    let out: boolean | string;
    try {
      out = fn();
    } catch (error) {
      out = `threw ${(error as Error).stack}`;
    }
    if (out !== true) failed++;
    console.log(`${out === true ? "PASS" : "FAIL"}  ${name}${out === true || out === false ? "" : `\n      ${out}`}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  return failed ? 1 : 0;
}

export function main(only?: number): number {
  const tool = prepare();
  let ok = 0;
  const problems: string[] = [];
  const results = new Map<number, Outcome>();
  tool.entries.forEach((e, i) => {
    if (!e.reportable || (only !== undefined && only !== i)) return;
    try {
      const out = build(tool, i);
      if (typeof out === "string") problems.push(`${i} ${e.id} (${e.kind} on ${e.definition}): ${out}`);
      else {
        results.set(i, out);
        ok++;
      }
    } catch (error) {
      problems.push(`${i} ${e.id} (${e.kind} on ${e.definition}): ${(error as Error).message}`);
    }
  });
  for (const p of problems) console.error(p);
  if (only === undefined && process.argv.includes("--write")) write(tool, results);
  const clean = [...results.values()].filter((r) => new Set(r.failures.map(idOf)).size === 1).length;
  console.log(`${ok} inputs, ${problems.length} without an input, ${clean} fail one entry only`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "corpus-constraint-cases.ts") process.exit(process.argv.includes("--self-test") ? selfTest() : main(/^\d+$/.test(process.argv[2] ?? "") ? Number(process.argv[2]) : undefined));
