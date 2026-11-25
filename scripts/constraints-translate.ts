/**
 * Translates the Metapath of a constraint into RFC 9535 queries over the JSON keys of OSCAL (openspec/specs/
 * contract-store, STO-059, STO-060, design D1), and finds the context queries that select the instances of one
 * definition.
 *
 * Convention: a relative query runs on a ONE-ELEMENT ARRAY that holds the node that the query is relative to. RFC 9535
 * cannot filter the root of a query, but Metapath filters the node itself, as in `.[@name='objective']/...`. In the
 * wrapper, `$[0]` is the node, and `$[?f]` is the node when the filter `f` holds.
 */
import type { ChildInst, Def } from "./metaschema.js";
import { OSCAL_NS, allNodes, valueKeyOf, type Expr, type MNode, type Step } from "./metapath.js";
import { run } from "./jsonpath.js";
import { GenerationError } from "./constraints-regex.js";

/** A construct that the translation does not cover. */
export class Unsupported extends GenerationError {}

type Seg =
  | { k: "start"; filters: string[] }
  | { k: "name"; key: string }
  | { k: "all"; filters: string[] }
  | { k: "dname"; key: string };

interface Branch {
  segs: Seg[];
  defs: Set<Def>;
}

export interface TQuery {
  q: string;
  defs: Set<Def>;
  /** True when the query can select several nodes. */
  multi: boolean;
}

const lit = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
export const qk = (k: string) => `['${k.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}']`;

function render(segs: Seg[], base: "$" | "@"): string {
  let s = "";
  for (const g of segs) {
    if (g.k === "start") {
      if (base === "$") s += g.filters.length ? `$[?${g.filters.join(" && ")}]` : "$[0]";
      else {
        if (g.filters.length) throw new Unsupported("a filter on the node itself inside a filter");
        s += "@";
      }
    } else if (g.k === "name") s += qk(g.key);
    else if (g.k === "dname") s += ".." + qk(g.key);
    else s += g.filters.length ? `[?${g.filters.join(" && ")}]` : "[*]";
  }
  return s;
}

const cloneSegs = (segs: Seg[]): Seg[] => segs.map((g) => (g.k === "start" || g.k === "all" ? { ...g, filters: [...g.filters] } : { ...g }));

function closure(S: Set<Def>): Set<Def> {
  const out = new Set<Def>(S);
  const stack = [...S];
  while (stack.length) {
    const d = stack.pop()!;
    for (const c of d.children)
      if (!out.has(c.def)) {
        out.add(c.def);
        stack.push(c.def);
      }
  }
  return out;
}

function childInsts(S: Set<Def>, name: string): ChildInst[] {
  const out: ChildInst[] = [];
  for (const d of S) for (const c of d.children) if (c.useName === name) out.push(c);
  return out;
}

export class Translator {
  /** Translates the selection of `e` from nodes of the definitions `S`, relative to the wrapper. */
  selector(e: Expr, S: Set<Def>, rootDef: Def): TQuery[] {
    const start: Branch = { segs: [{ k: "start", filters: [] }], defs: S };
    return this.run(e, [start], rootDef).map((b) => ({
      q: render(b.segs, "$"),
      defs: b.defs,
      multi: b.segs.some((g) => g.k === "all" || g.k === "dname"),
    }));
  }

  private run(e: Expr, branches: Branch[], rootDef: Def): Branch[] {
    switch (e.t) {
      case "union":
        return e.parts.flatMap((p) => this.run(p, branches, rootDef));
      case "path":
        return this.runPath(e, branches, rootDef);
      default:
        throw new Unsupported(`the expression kind ${e.t} as a node selector`);
    }
  }

  private runPath(e: Extract<Expr, { t: "path" }>, branches: Branch[], rootDef: Def): Branch[] {
    let cur = branches;
    if (e.abs !== "none") {
      if (!rootDef.rootName) throw new Unsupported("an absolute path in a constraint that is not declared on a root assembly");
      // The context node is the root assembly of the document: `/x` and `//x` read as relative to it.
      cur = cur.map(() => ({ segs: [{ k: "start", filters: [] }], defs: new Set([rootDef]) }));
    }
    for (let i = 0; i < e.steps.length; i++) {
      const st = e.steps[i];
      const desc = st.sep === "//" || (i === 0 && e.abs === "rootdesc");
      cur = cur.flatMap((b) => this.step(st, b, desc, rootDef));
      if (cur.length === 0) break;
    }
    return cur;
  }

  private step(st: Step, b: Branch, desc: boolean, rootDef: Def): Branch[] {
    let out: Branch[] = [];
    if (st.axis === "self") {
      out = [{ segs: cloneSegs(b.segs), defs: b.defs }];
    } else if (st.axis === "primary") {
      let inner = st.primary!;
      if (desc) {
        // //(a|b) is //a | //b: the descendant separator goes into the first step of each branch.
        const asDesc = (x: Expr): Expr => {
          if (x.t === "union") return { t: "union", parts: x.parts.map(asDesc) };
          if (x.t === "path" && x.abs === "none") return { ...x, steps: [{ ...x.steps[0], sep: "//" }, ...x.steps.slice(1)] };
          throw new Unsupported("// before a parenthesised step that is not a path");
        };
        inner = asDesc(inner);
      }
      out = this.run(inner, [{ segs: cloneSegs(b.segs), defs: b.defs }], rootDef);
    } else if (st.axis === "attr") {
      if (desc) throw new Unsupported("//@attr");
      const flags = [...b.defs].flatMap((d) => d.flags.filter((f) => f.name === st.name));
      if (!flags.length) return []; // the step selects no node of any document
      out = [{ segs: [...cloneSegs(b.segs), { k: "name", key: st.name! }], defs: new Set(flags.map((f) => f.def)) }];
    } else if (st.axis === "child") {
      if (st.name === "*") throw new Unsupported("a wildcard step");
      const insts = childInsts(desc ? closure(b.defs) : b.defs, st.name!);
      if (!insts.length) return [];
      const byKey = new Map<string, { grouped: boolean; defs: Set<Def> }>();
      for (const c of insts) {
        const k = `${c.jsonKey}|${c.grouped}`;
        const v = byKey.get(k) ?? { grouped: c.grouped, defs: new Set<Def>() };
        v.defs.add(c.def);
        byKey.set(k, v);
      }
      for (const [k, v] of byKey) {
        const key = k.split("|")[0];
        const segs = cloneSegs(b.segs);
        segs.push(desc ? { k: "dname", key } : { k: "name", key });
        if (v.grouped) segs.push({ k: "all", filters: [] });
        out.push({ segs, defs: v.defs });
      }
    } else throw new Unsupported(`the axis ${st.axis}`);
    for (const pr of st.preds) {
      out = out.map((br) => {
        const segs = cloneSegs(br.segs);
        this.attach(segs, (prefix) => this.pred(pr, br.defs, "@" + prefix, rootDef));
        return { ...br, segs };
      });
    }
    return out;
  }

  /** Attaches a filter to the nearest filterable segment, through the segments of single members. */
  private attach(segs: Seg[], predFn: (prefix: string) => string) {
    let prefix = "";
    for (let i = segs.length - 1; i >= 0; i--) {
      const g = segs[i];
      if (g.k === "all" || g.k === "start") {
        g.filters.push(unwrap(predFn(prefix)));
        return;
      }
      if (g.k === "name") {
        prefix = qk(g.key) + prefix;
        continue;
      }
      throw new Unsupported("a predicate on a descendant step");
    }
  }

  /** A predicate or a test as an RFC 9535 logical expression, relative to `base`. */
  pred(e: Expr, S: Set<Def>, base: string, rootDef: Def): string {
    switch (e.t) {
      case "bin":
        if (e.op === "and") return `(${this.pred(e.l, S, base, rootDef)} && ${this.pred(e.r, S, base, rootDef)})`;
        if (e.op === "or") return `(${this.pred(e.l, S, base, rootDef)} || ${this.pred(e.r, S, base, rootDef)})`;
        return this.compare(e, S, base, rootDef);
      case "call":
        return this.call(e, S, base, rootDef);
      case "path":
      case "union":
        return this.exists(e, S, base, rootDef, null);
      default:
        throw new Unsupported(`the predicate kind ${e.t}`);
    }
  }

  private call(e: Extract<Expr, { t: "call" }>, S: Set<Def>, base: string, rootDef: Def): string {
    switch (e.name) {
      case "not":
        return `!(${this.pred(e.args[0], S, base, rootDef)})`;
      case "exists":
        return this.pred(e.args[0], S, base, rootDef);
      case "starts-with": {
        const x = this.singular(e.args[0], S, base);
        const l = literals(e.args[1]);
        if (l.length !== 1) throw new Unsupported("starts-with with a prefix that is not a literal");
        return `match(${x}, ${lit(ixEscape(l[0]) + "(.|\\n|\\r)*")})`;
      }
      case "has-oscal-namespace": {
        // Design D4: the node has the namespace of its `ns` member, or the OSCAL namespace when it has none.
        const nss = e.args.flatMap(literals);
        const bad = [...S].filter((d) => !(d.kind === "assembly" && ["property", "part", "assessment-part"].includes(d.name)));
        if (bad.length) throw new Unsupported(`has-oscal-namespace() of a node of the definition ${bad.map((d) => d.name).join(", ")}`);
        const x = `${base}['ns']`;
        const alts = nss.map((n) => `${x} == ${lit(n)}`);
        if (nss.includes(OSCAL_NS)) alts.unshift(`!${x}`);
        return `(${alts.join(" || ")})`;
      }
    }
    throw new Unsupported(`the function ${e.name}`);
  }

  /** A path that selects at most one scalar: a flag or a chain of single children, as `@...`. */
  private singular(e: Expr, S: Set<Def>, base: string): string {
    if (e.t !== "path" || e.abs !== "none") throw new Unsupported("an operand that is not a path");
    let s = base;
    let defs = S;
    for (const st of e.steps) {
      if (st.preds.length) throw new Unsupported("a predicate inside a single-valued operand");
      if (st.axis === "self") continue;
      if (st.axis === "attr") {
        const f = [...defs].flatMap((d) => d.flags.filter((x) => x.name === st.name));
        s += qk(st.name!);
        defs = new Set(f.map((x) => x.def));
        continue;
      }
      if (st.axis === "child" && st.sep !== "//") {
        const insts = childInsts(defs, st.name!).filter((c) => !c.grouped);
        if (!insts.length) throw new Unsupported(`the single child ${st.name} is not found, or is a group`);
        s += qk(insts[0].jsonKey);
        defs = new Set(insts.map((c) => c.def));
        continue;
      }
      throw new Unsupported("a complex single-valued operand");
    }
    return s;
  }

  private compare(e: Extract<Expr, { t: "bin" }>, S: Set<Def>, base: string, rootDef: Def): string {
    const op = e.op;
    let L = e.l;
    let R = e.r;
    if (literals(L).length && !literals(R).length) [L, R] = [R, L];
    const vals = literals(R);
    if (!vals.length) throw new Unsupported("a comparison without a literal operand");
    const jop = op === "=" ? "==" : op;
    const singleStep =
      L.t === "path" &&
      L.abs === "none" &&
      L.steps.every((s) => s.preds.length === 0 && (s.axis === "attr" || s.axis === "self" || (s.axis === "child" && s.sep !== "//"))) &&
      L.steps.filter((s) => s.axis !== "self").length <= 1;
    if (singleStep) {
      const x = this.singular(L, S, base);
      if (op === "=") return `(${vals.map((v) => `${x} == ${lit(v)}`).join(" || ")})`;
      if (op === "!=") return `(${x} && (${vals.map((v) => `${x} != ${lit(v)}`).join(" || ")}))`;
      return `(${vals.map((v) => `${x} ${jop} ${lit(v)}`).join(" || ")})`;
    }
    // P/@a = (v...) is P[?@a == v ...]
    if (L.t === "path" && L.abs === "none" && L.steps.length >= 2) {
      const last = L.steps[L.steps.length - 1];
      if (last.axis === "attr" && last.preds.length === 0 && op === "=") {
        const head: Expr = { t: "path", abs: "none", steps: L.steps.slice(0, -1) };
        return this.exists(head, S, base, rootDef, (prefix) => `(${vals.map((v) => `@${prefix}${qk(last.name!)} == ${lit(v)}`).join(" || ")})`);
      }
    }
    throw new Unsupported("the shape of a comparison");
  }

  /** The existence test of a path, with an optional filter on its last node-set segment. */
  private exists(e: Expr, S: Set<Def>, base: string, rootDef: Def, extra: ((prefix: string) => string) | null): string {
    const start: Branch = { segs: [{ k: "start", filters: [] }], defs: S };
    let bs = this.run(e, [start], rootDef);
    if (!bs.length) return "(1 == 0)"; // a path that selects nothing is never true
    if (extra)
      bs = bs.map((b) => {
        const segs = cloneSegs(b.segs);
        this.attach(segs, extra);
        return { ...b, segs };
      });
    const parts = bs.map((b) => render(b.segs, "@").replace(/^@/, base));
    return parts.length === 1 ? parts[0] : `(${parts.join(" || ")})`;
  }

  /** Appends the value member for targets that are field objects, so that a query selects the string of the value. */
  withValueTerminal(qs: TQuery[]): TQuery[] {
    return qs.map((t) => {
      const objs = [...t.defs].filter((d) => d.kind === "field" && d.flags.length > 0);
      if (!objs.length) return t;
      if (objs.length !== t.defs.size) throw new Unsupported("a target of scalar fields and field objects");
      return { ...t, q: t.q + qk(valueKeyOf(objs[0])) };
    });
  }
}

/** Drops one pair of redundant outer parentheses, which keeps the nesting of a filter low. */
export function unwrap(s: string): string {
  if (!s.startsWith("(") || !s.endsWith(")")) return s;
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === "'") inStr = false;
      continue;
    }
    if (c === "'") inStr = true;
    else if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0 && i < s.length - 1) return s;
    }
  }
  return s.slice(1, -1);
}

function literals(e: Expr): string[] {
  if (e.t === "str") return [e.v];
  if (e.t === "seq") return e.items.flatMap(literals);
  if (e.t === "path" && e.abs === "none" && e.steps.length === 1 && e.steps[0].axis === "primary" && !e.steps[0].preds.length) return literals(e.steps[0].primary!);
  return [];
}

/** Escapes a literal for an I-Regexp (RFC 9485). */
export function ixEscape(s: string): string {
  let out = "";
  for (const ch of s) {
    if ("()*+.?[\\]^{|}-".includes(ch)) out += "\\" + ch;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Context queries

/** A synthetic value that the context queries run on: a document, or an array that holds one element. */
export interface SynthDoc {
  json: unknown;
  tree: MNode;
  nodes: MNode[];
  /** True when a child with the form SINGLETON_OR_ARRAY holds one value. */
  singleton: boolean;
}

export const synthDoc = (json: unknown, tree: MNode, singleton = false): SynthDoc => ({ json, tree, nodes: allNodes(tree), singleton });

interface Link {
  key: string;
  array: boolean;
}

/** The chain of keys of a Normalized Path. An index marks the key before it as an array. The index of an element wrapper is no key. */
function chainOf(path: string): Link[] {
  const out: Link[] = [];
  const re = /\['((?:[^'\\]|\\.)*)'\]|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    if (m[1] !== undefined) out.push({ key: m[1].replace(/\\(.)/g, "$1"), array: false });
    else if (out.length) out[out.length - 1].array = true;
  }
  return out;
}

const chainText = (links: Link[]) => links.map((l) => qk(l.key) + (l.array ? "[*]" : "")).join("");

export interface AnchorResult {
  queries: string[];
  exact: boolean;
  /** The nodes that the queries select wrongly, or miss (examples). */
  wrong: string[];
}

const outermost = (n: MNode): MNode => {
  let m = n;
  for (let p = n.parent; p; p = p.parent) if (p.def === n.def && p.kind !== "doc") m = p;
  return m;
};

/** The nodes that queries select wrongly or miss, as `over` and `under` examples, against the instances of `def` in `docs`. */
export function wrongNodes(queries: string[], docs: SynthDoc[], def: Def): string[] {
  const wrong: string[] = [];
  for (const d of docs) {
    const want = new Set(d.nodes.filter((n) => n.def === def && n.kind !== "doc").map((t) => t.path));
    const got = new Set<string>();
    for (const q of queries) for (const h of run(q, d.json)) got.add(h.path);
    for (const g of got) if (!want.has(g)) wrong.push(`over ${g}`);
    for (const w of want) if (!got.has(w)) wrong.push(`under ${w}`);
  }
  return wrong;
}

/**
 * Finds queries that select exactly the instances of `def` in the synthetic values `docs` and `deepDocs`, with the
 * shortest chain of keys. `base` is `$` for a document, and `$[0]` for an array that holds one element. A key name can
 * belong to several definitions, so the search goes from a bare key to a root key, to the outermost instance with a
 * descendant segment, and to entry points with a descendant closure for a recursive definition.
 */
export function findAnchors(def: Def, docs: SynthDoc[], deepDocs: SynthDoc[], base: "$" | "$[0]"): AnchorResult {
  const nodes = docs.flatMap((d) => d.nodes.filter((n) => n.def === def && n.kind !== "doc"));
  if (nodes.length === 0) return { queries: [], exact: false, wrong: ["the definition is in no value"] };
  const recursive = nodes.some((n) => outermost(n) !== n);
  const chains = nodes.map((n) => chainOf(n.path));
  const maxLen = Math.max(1, ...chains.map((c) => c.length));
  const outer = nodes.map((n) => {
    const cm = chainOf(outermost(n).path);
    return { cm, rel: chainOf(n.path).slice(cm.length) };
  });
  const abs = (links: Link[]) => base + chainText(links);
  let best: AnchorResult | null = null;
  let bestScore = Infinity;
  const consider = (queries: string[]): boolean => {
    const a = wrongNodes(queries, docs, def);
    const b = a.length ? a : wrongNodes(queries, deepDocs, def);
    if (!b.length) {
      best = { queries, exact: true, wrong: [] };
      return true;
    }
    if (b.length < bestScore) {
      bestScore = b.length;
      best = { queries, exact: false, wrong: b.slice(0, 3) };
    }
    return false;
  };
  // A descendant suffix: `$..['a']['b']`.
  const suffix = (links: Link[]) => "$.." + chainText(links);
  for (let n = 1; n <= maxLen; n++) {
    // (a) a suffix of n keys anywhere
    const A = new Set<string>();
    for (const c of chains) A.add(c.length <= n ? abs(c) : suffix(c.slice(c.length - n)));
    if (consider([...A])) return best!;
    // (b) the root key, then a descendant suffix
    const B = new Set<string>();
    for (const c of chains) B.add(c.length <= n ? abs(c) : abs(c.slice(0, 1)) + ".." + chainText(c.slice(c.length - n)));
    if (consider([...B])) return best!;
    // (c) the outermost instance, then a descendant suffix of the chain below it
    if (recursive) {
      const C = new Set<string>();
      for (const { cm, rel } of outer) {
        C.add(abs(cm));
        if (rel.length) C.add(abs(cm) + ".." + chainText(rel.slice(Math.max(0, rel.length - n))));
      }
      if (consider([...C])) return best!;
    }
  }
  if (recursive) {
    // (d) entry points, closed under the recursion with a descendant suffix
    const maxRel = Math.max(...outer.map((o) => o.rel.length));
    for (let ne = 1; ne <= maxLen; ne++)
      for (let nr = 1; nr <= maxRel; nr++)
        for (const rooted of [false, true]) {
          const Q = new Set<string>();
          for (const { cm, rel } of outer) {
            const entry = cm.length <= ne ? abs(cm) : rooted ? abs(cm.slice(0, 1)) + ".." + chainText(cm.slice(cm.length - ne)) : suffix(cm.slice(cm.length - ne));
            Q.add(entry);
            if (rel.length) Q.add(entry + ".." + chainText(rel.slice(Math.max(0, rel.length - nr))));
          }
          if (consider([...Q])) return best!;
        }
  }
  return best!;
}
