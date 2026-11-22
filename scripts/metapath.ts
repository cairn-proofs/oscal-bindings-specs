/**
 * The reference evaluator of the store (openspec/specs/constraint-validation, STO-012). It holds:
 *
 * 1. A parser for the subset of Metapath that the constraints of the vendored metaschema use.
 * 2. The Metapath data model of an OSCAL JSON value: a tree of nodes over the definitions of the metaschema.
 * 3. An evaluator of the parsed subset, with `has-oscal-namespace()` as design D4 states.
 * 4. A generator of synthetic values that hold each child of a definition, to a depth limit.
 *
 * Store tooling only. It uses no RFC 9535 library, so it is independent of the generated queries.
 */
import type { Def } from "./metaschema.js";

// ---------------------------------------------------------------------------------------------------------------
// Parser

export type Expr =
  | { t: "path"; abs: "none" | "root" | "rootdesc"; steps: Step[] }
  | { t: "union"; parts: Expr[] }
  | { t: "str"; v: string }
  | { t: "seq"; items: Expr[] }
  | { t: "call"; name: string; args: Expr[] }
  | { t: "bin"; op: string; l: Expr; r: Expr };

export interface Step {
  sep: "/" | "//" | ""; // the separator before the step ("" for the first)
  axis: "child" | "self" | "attr" | "parent" | "primary";
  name?: string;
  primary?: Expr;
  preds: Expr[];
}

const OPS = ["!=", ">=", "<=", "=", ">", "<"];

function tokenize(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "'") {
      const j = s.indexOf("'", i + 1);
      if (j < 0) throw new Error(`metapath: unterminated string in ${s}`);
      out.push(s.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (s.startsWith("//", i)) {
      out.push("//");
      i += 2;
      continue;
    }
    if (s.startsWith("..", i)) {
      out.push("..");
      i += 2;
      continue;
    }
    const op = OPS.find((o) => s.startsWith(o, i));
    if (op) {
      out.push(op);
      i += op.length;
      continue;
    }
    if ("/|[]()@,.*".includes(c)) {
      out.push(c);
      i++;
      continue;
    }
    const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(s.slice(i));
    if (m) {
      out.push(m[0]);
      i += m[0].length;
      continue;
    }
    throw new Error(`metapath: unexpected '${c}' in ${s}`);
  }
  return out;
}

export function parseMetapath(src: string): Expr {
  const toks = tokenize(src);
  let p = 0;
  const peek = (): string | undefined => toks[p];
  const next = (): string => toks[p++];
  const expect = (t: string) => {
    if (next() !== t) throw new Error(`metapath: expected ${t} at token ${p} in ${src}`);
  };
  function parseOr(): Expr {
    let l = parseAnd();
    while (peek() === "or") {
      next();
      l = { t: "bin", op: "or", l, r: parseAnd() };
    }
    return l;
  }
  function parseAnd(): Expr {
    let l = parseCmp();
    while (peek() === "and") {
      next();
      l = { t: "bin", op: "and", l, r: parseCmp() };
    }
    return l;
  }
  function parseCmp(): Expr {
    const l = parseUnion();
    const t = peek();
    if (t !== undefined && OPS.includes(t)) {
      next();
      return { t: "bin", op: t, l, r: parseUnion() };
    }
    return l;
  }
  function parseUnion(): Expr {
    const parts = [parsePath()];
    while (peek() === "|") {
      next();
      parts.push(parsePath());
    }
    return parts.length === 1 ? parts[0] : { t: "union", parts };
  }
  function parsePath(): Expr {
    let abs: "none" | "root" | "rootdesc" = "none";
    const steps: Step[] = [];
    if (peek() === "/") {
      next();
      abs = "root";
    } else if (peek() === "//") {
      next();
      abs = "rootdesc";
    }
    steps.push(parseStep(""));
    while (peek() === "/" || peek() === "//") steps.push(parseStep(next() as "/" | "//"));
    // A lone primary with no predicate and no further step is the primary itself.
    if (steps.length === 1 && abs === "none" && steps[0].axis === "primary" && steps[0].preds.length === 0) return steps[0].primary!;
    return { t: "path", abs, steps };
  }
  function parseStep(sep: "/" | "//" | ""): Step {
    const t = peek();
    let st: Step;
    if (t === "@") {
      next();
      st = { sep, axis: "attr", name: next(), preds: [] };
    } else if (t === "..") {
      next();
      st = { sep, axis: "parent", preds: [] };
    } else if (t === ".") {
      next();
      st = { sep, axis: "self", preds: [] };
    } else if (t === "*") {
      next();
      st = { sep, axis: "child", name: "*", preds: [] };
    } else if (t === "(") {
      next();
      const first = parseOr();
      if (peek() === ",") {
        const items = [first];
        while (peek() === ",") {
          next();
          items.push(parseOr());
        }
        expect(")");
        st = { sep, axis: "primary", primary: { t: "seq", items }, preds: [] };
      } else {
        expect(")");
        st = { sep, axis: "primary", primary: first, preds: [] };
      }
    } else if (t !== undefined && t.startsWith("'")) {
      next();
      st = { sep, axis: "primary", primary: { t: "str", v: t.slice(1, -1) }, preds: [] };
    } else if (t !== undefined && /^[A-Za-z_]/.test(t)) {
      next();
      if (peek() === "(") {
        next();
        const args: Expr[] = [];
        if (peek() !== ")") {
          args.push(parseOr());
          while (peek() === ",") {
            next();
            args.push(parseOr());
          }
        }
        expect(")");
        st = { sep, axis: "primary", primary: { t: "call", name: t, args }, preds: [] };
      } else st = { sep, axis: "child", name: t, preds: [] };
    } else throw new Error(`metapath: unexpected '${t}' in ${src}`);
    while (peek() === "[") {
      next();
      st.preds.push(parseOr());
      expect("]");
    }
    return st;
  }
  const e = parseOr();
  if (p !== toks.length) throw new Error(`metapath: trailing tokens '${toks.slice(p).join(" ")}' in ${src}`);
  return e;
}

/** True when the expression calls `doc()`, which selects nodes of another document. */
export function callsDoc(x: Expr): boolean {
  switch (x.t) {
    case "call":
      return x.name === "doc" || x.args.some(callsDoc);
    case "path":
      return x.steps.some((s) => (s.primary !== undefined && callsDoc(s.primary)) || s.preds.some(callsDoc));
    case "union":
      return x.parts.some(callsDoc);
    case "bin":
      return callsDoc(x.l) || callsDoc(x.r);
    case "seq":
      return x.items.some(callsDoc);
    default:
      return false;
  }
}

/** The part of a target that selects nodes of the same document (CNS-007.01), and whether a `doc()` part was dropped. */
export function localPart(e: Expr): { expr: Expr | null; dropped: boolean } {
  if (e.t === "union") {
    const keep = e.parts.filter((p) => !callsDoc(p));
    const dropped = keep.length !== e.parts.length;
    return { expr: keep.length === 0 ? null : keep.length === 1 ? keep[0] : { t: "union", parts: keep }, dropped };
  }
  return callsDoc(e) ? { expr: null, dropped: true } : { expr: e, dropped: false };
}

// ---------------------------------------------------------------------------------------------------------------
// The data model

export type NodeKind = "doc" | "assembly" | "field" | "flag";
export type JsonValue = any;

const q = (k: string) => `['${k.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}']`;

export class MNode {
  private cached?: MNode[];
  constructor(
    public kind: NodeKind,
    public name: string,
    public def: Def | undefined,
    public json: JsonValue,
    public path: string,
    public parent?: MNode,
    private rootDefs?: Def[],
  ) {}

  children(): MNode[] {
    if (this.cached) return this.cached;
    const out: MNode[] = [];
    if (this.kind === "doc") {
      for (const rd of this.rootDefs ?? []) {
        const k = rd.rootName!;
        if (this.json && typeof this.json === "object" && k in this.json) out.push(new MNode("assembly", k, rd, this.json[k], this.path + q(k), this));
      }
    } else if ((this.kind === "assembly" || this.kind === "field") && this.json && typeof this.json === "object" && !Array.isArray(this.json)) {
      const d = this.def!;
      for (const f of d.flags) {
        if (f.name in this.json) out.push(new MNode("flag", f.name, f.def, this.json[f.name], this.path + q(f.name), this));
      }
      if (d.kind === "assembly") {
        for (const c of d.children) {
          const v = this.json[c.jsonKey];
          if (v === undefined) continue;
          const mk = (val: JsonValue, p: string) => out.push(new MNode(c.kind, c.useName, c.def, val, p, this));
          if (c.grouped && Array.isArray(v)) v.forEach((x: JsonValue, i: number) => mk(x, this.path + q(c.jsonKey) + `[${i}]`));
          else if (!c.grouped || c.inJson === "SINGLETON_OR_ARRAY") mk(v, this.path + q(c.jsonKey));
        }
      }
    }
    this.cached = out;
    return out;
  }

  atomicValue(): string | number | boolean | undefined {
    if (this.kind === "flag") return this.json;
    if (this.kind === "field") {
      if (this.json && typeof this.json === "object") return this.json[valueKeyOf(this.def!)];
      return this.json;
    }
    return undefined; // an assembly or a document has no atomic value
  }

  /** The Normalized Path of the JSON node that holds the value (for a field object, its value member). */
  valuePath(): string {
    if (this.kind === "field" && this.json && typeof this.json === "object") return this.path + q(valueKeyOf(this.def!));
    return this.path;
  }
}

export function valueKeyOf(d: Def): string {
  if (d.jsonValueKey) return d.jsonValueKey;
  if (d.jsonValueKeyFlag) throw new Error("json-value-key with flag-name is not supported");
  throw new Error(`field ${d.name} has flags but no json-value-key`);
}

/** The tree of a document. `roots` are the root assemblies of the models. */
export function loadDoc(json: JsonValue, roots: Def[], path = "$"): MNode {
  return new MNode("doc", "#document", undefined, json, path, undefined, roots);
}

/** The tree of an element: the node of the definition `def`, with its descendants. */
export function loadElement(json: JsonValue, def: Def, path = "$[0]"): MNode {
  return new MNode(def.kind as NodeKind, def.useName ?? def.name, def, json, path);
}

export function allNodes(n: MNode, out: MNode[] = []): MNode[] {
  out.push(n);
  for (const c of n.children()) allNodes(c, out);
  return out;
}

/**
 * A value of the definition `d` that holds each flag and each child, with a placeholder string for each scalar. A
 * definition recurs at most `limit` times along one chain. A child with the form SINGLETON_OR_ARRAY holds one value when
 * `singleton` is true, and a list otherwise.
 */
export function syntheticValue(d: Def, limit = 3, singleton = false): JsonValue {
  const chain = new Map<Def, number>();
  const gen = (x: Def): JsonValue => {
    chain.set(x, (chain.get(x) ?? 0) + 1);
    let out: JsonValue;
    if (x.kind === "field") {
      if (x.flags.length === 0) out = "x";
      else {
        out = {};
        for (const f of x.flags) out[f.name] = "x";
        out[valueKeyOf(x)] = "x";
      }
    } else {
      out = {};
      for (const f of x.flags) out[f.name] = "x";
      for (const c of x.children) {
        if ((chain.get(c.def) ?? 0) >= limit) continue;
        const v = gen(c.def);
        out[c.jsonKey] = c.grouped && !(singleton && c.inJson === "SINGLETON_OR_ARRAY") ? [v] : v;
      }
    }
    chain.set(x, chain.get(x)! - 1);
    return out;
  };
  return gen(d);
}

// ---------------------------------------------------------------------------------------------------------------
// The evaluator

export type Item = MNode | string | number | boolean;
export const OSCAL_NS = "http://csrc.nist.gov/ns/oscal";

/** The Metapath error of the Metaschema specification: the evaluation of an expression is not defined. */
export class MetapathError extends Error {}

export function atomize(i: Item): string | number | boolean | null {
  if (typeof i === "object") {
    const v = i.atomicValue();
    return v === undefined ? null : v;
  }
  return i;
}

/** The effective boolean value of a sequence. */
export function ebv(seq: Item[]): boolean {
  if (seq.length === 0) return false;
  if (typeof seq[0] === "object") return true;
  if (seq.length > 1) throw new MetapathError("the effective boolean value of a sequence of several atomic values");
  const v = seq[0];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.length > 0;
  return v !== 0;
}

export interface EvalOpts {
  /** Ignore the predicates, so that only the structure selects nodes. */
  skipPredicates?: boolean;
}

export function evalMp(e: Expr, focus: MNode, opts: EvalOpts = {}): Item[] {
  switch (e.t) {
    case "str":
      return [e.v];
    case "seq":
      return e.items.flatMap((x) => evalMp(x, focus, opts));
    case "union": {
      const out: Item[] = [];
      const seen = new Set<MNode>();
      for (const part of e.parts)
        for (const it of evalMp(part, focus, opts)) {
          if (typeof it === "object") {
            if (seen.has(it)) continue;
            seen.add(it);
          }
          out.push(it);
        }
      return out;
    }
    case "bin": {
      if (e.op === "and") return [ebv(evalMp(e.l, focus, opts)) && ebv(evalMp(e.r, focus, opts))];
      if (e.op === "or") return [ebv(evalMp(e.l, focus, opts)) || ebv(evalMp(e.r, focus, opts))];
      const L = evalMp(e.l, focus, opts).map(atomize).filter((x) => x !== null);
      const R = evalMp(e.r, focus, opts).map(atomize).filter((x) => x !== null);
      return [L.some((a) => R.some((b) => compare(e.op, a!, b!)))];
    }
    case "call":
      return evalCall(e, focus, opts);
    case "path":
      return evalPath(e, focus, opts);
  }
}

function compare(op: string, a: string | number | boolean, b: string | number | boolean): boolean {
  if (typeof a !== typeof b) {
    a = String(a);
    b = String(b);
  }
  switch (op) {
    case "=":
      return a === b;
    case "!=":
      return a !== b;
    case ">":
      return a > b;
    case "<":
      return a < b;
    case ">=":
      return a >= b;
    case "<=":
      return a <= b;
  }
  throw new Error(`metapath: unknown operator ${op}`);
}

/** The definitions whose nodes have a namespace (design D4). */
const NAMESPACE_DEFS = ["property", "part", "assessment-part"];

function evalCall(e: Extract<Expr, { t: "call" }>, focus: MNode, opts: EvalOpts): Item[] {
  const arg = (i: number) => evalMp(e.args[i], focus, opts);
  switch (e.name) {
    case "not":
      return [!ebv(arg(0))];
    case "exists":
      return [arg(0).length > 0];
    case "starts-with": {
      const a = arg(0).map(atomize)[0];
      const b = arg(1).map(atomize)[0];
      return [String(a ?? "").startsWith(String(b ?? ""))];
    }
    case "has-oscal-namespace": {
      // D4.1: the arguments are one or more namespace strings.
      const namespaces = e.args.flatMap((_, i) => arg(i)).map(atomize).filter((x) => x !== null).map(String);
      // D4.4: the function applies to a property, a part and an assessment part.
      const def = focus.def;
      if (!def || def.kind !== "assembly" || !NAMESPACE_DEFS.includes(def.name))
        throw new MetapathError(`has-oscal-namespace() of a node of the definition '${def?.name}'`);
      // D4.2: the namespace of the node is its `ns` value, or the OSCAL namespace when `ns` is absent.
      const flag = focus.children().find((c) => c.kind === "flag" && c.name === "ns");
      const ns = flag ? String(flag.atomicValue()) : OSCAL_NS;
      // D4.3: the result is true when the namespace is equal to one argument, character for character.
      return [namespaces.includes(ns)];
    }
    case "doc":
      throw new MetapathError("doc() selects nodes of another document");
  }
  throw new MetapathError(`unsupported function ${e.name}`);
}

function descendantsOrSelf(n: MNode): MNode[] {
  const out: MNode[] = [n];
  const walk = (x: MNode) => {
    for (const c of x.children()) {
      if (c.kind === "flag") continue;
      out.push(c);
      walk(c);
    }
  };
  walk(n);
  return out;
}

function evalPath(e: Extract<Expr, { t: "path" }>, focus: MNode, opts: EvalOpts): Item[] {
  let cur: Item[] = e.abs === "none" ? [focus] : [rootOf(focus)];
  for (let si = 0; si < e.steps.length; si++) {
    const st = e.steps[si];
    let inputs = cur.filter((x): x is MNode => typeof x === "object");
    if (st.sep === "//" || (si === 0 && e.abs === "rootdesc")) inputs = dedupe(inputs.flatMap(descendantsOrSelf));
    let out: Item[] = [];
    if (st.axis === "primary") {
      if (si === 0 && e.abs === "none") out = evalMp(st.primary!, focus, opts);
      else for (const n of inputs) out.push(...evalMp(st.primary!, n, opts));
    } else {
      for (const n of inputs) {
        if (st.axis === "self") out.push(n);
        else if (st.axis === "parent") {
          if (n.parent) out.push(n.parent);
        } else if (st.axis === "attr") out.push(...n.children().filter((c) => c.kind === "flag" && c.name === st.name));
        else out.push(...n.children().filter((c) => c.kind !== "flag" && (st.name === "*" || c.name === st.name)));
      }
    }
    for (const pr of st.preds) {
      if (opts.skipPredicates) continue;
      out = out.filter((it) => (typeof it !== "object" ? ebv(evalMp(pr, focus, opts)) : ebv(evalMp(pr, it, opts))));
    }
    cur = dedupe(out);
  }
  return cur;
}

const dedupe = <T>(xs: T[]): T[] => [...new Set(xs)];
function rootOf(n: MNode): MNode {
  let x = n;
  while (x.parent) x = x.parent;
  return x;
}

/** The nodes that an expression selects from `focus`. */
export function selectNodes(e: Expr, focus: MNode, opts: EvalOpts = {}): MNode[] {
  return evalMp(e, focus, opts).filter((x): x is MNode => typeof x === "object");
}
