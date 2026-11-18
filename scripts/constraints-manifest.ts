/**
 * The evaluation of a constraint manifest with RFC 9535 queries only (openspec/specs/constraint-validation, CNS-008 to
 * CNS-018). It reads no metaschema. It gives the failures of a document, or of an element of an element type, as the
 * rules of each kind of entry state them.
 */
import type { Entry } from "./constraints-lib.js";
import { run, runOnce, type Hit } from "./jsonpath.js";

export interface ManifestFailure {
  /** The position of the entry in the manifest. */
  entry: number;
  id: string | null;
  /** The target node, or the context node of a `has-cardinality` entry. */
  location: string;
  key?: string;
}

/** A document, or an element of the element type `element`. */
export type Form = { document: true } | { element: string };

const dedupe = (hits: Hit[]): Hit[] => {
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.path) ? false : (seen.add(h.path), true)));
};

const quote = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/** CNS-010: the value is a string that the pattern matches in full. */
const matches = (pattern: string, value: unknown): boolean => run(`$[?match(@, ${quote(pattern)})]`, [value]).length > 0;

/**
 * The failures of `entries` for `data`. `data` is the document, or an array that holds the element (CNS-007). An element
 * is checked with the entries that have element context queries for its type, except `index` and `index-has-key` entries
 * (CNS-018).
 */
export function evaluateManifest(entries: Entry[], data: unknown, form: Form): ManifestFailure[] {
  const failures: ManifestFailure[] = [];
  const reported = new Set<string>();
  const add = (i: number, location: string, key?: string) => {
    const id = `${i}|${location}|${key ?? ""}`;
    if (reported.has(id)) return; // CNS-017: at most one failure for one location, or for one location and one key
    reported.add(id);
    failures.push({ entry: i, id: entries[i].id, location, key });
  };
  const queriesOf = (e: Entry): string[] | undefined => ("document" in form ? e.context.document : e.context.elements[form.element]);
  // Many entries share their context queries, so each query runs once for the data.
  const runOnData = runOnce(data);
  const contexts = (e: Entry): Hit[] => dedupe((queriesOf(e) ?? []).flatMap((q) => runOnData(q)));
  /** The target nodes of a context node (CNS-007). The queries run on an array that holds the context node. */
  const targetsOf = (e: Entry, ctx: Hit): Hit[] =>
    dedupe(e.target.flatMap((q) => run(q, [ctx.value]).map((h) => ({ value: h.value, path: ctx.path + h.path.slice(4) }))));
  /** CNS-012: the keys of a target node. A key field with several values gives a key for each combination. */
  const keysOf = (e: Entry, t: Hit): string[] => {
    const lists = e["key-fields"]!.map((kf) => {
      const values = dedupe(kf.target.flatMap((q) => run(q, [t.value]))).map((h) => String(h.value));
      if (values.length === 0) return [null];
      if (kf.prefix === undefined) return values;
      const prefix = kf.prefix;
      return values.map((v) => (v.startsWith(prefix) ? v.slice(prefix.length) : null));
    });
    let keys: Array<Array<string | null>> = [[]];
    for (const l of lists) keys = keys.flatMap((k) => l.map((v) => [...k, v]));
    return keys.filter((k) => k.some((v) => v !== null)).map((k) => JSON.stringify(k.map((v) => (v === null ? "\u0000" : `=${v}`))));
  };

  const applicable = new Map<string, { value: unknown; entries: number[] }>();
  const indexes = new Map<string, Map<string, Array<{ path: string; entry: number }>>>();
  const indexed = new Map<string, Set<string>>();
  for (const phase of ["index", "other"] as const) {
    for (const [i, e] of entries.entries()) {
      if ((e.kind === "index") !== (phase === "index")) continue;
      if ("element" in form && (e.kind === "index" || e.kind === "index-has-key")) continue;
      for (const ctx of contexts(e)) {
        const targets = targetsOf(e, ctx);
        switch (e.kind) {
          case "allowed-values":
            for (const t of targets) {
              const set = applicable.get(t.path) ?? { value: t.value, entries: [] };
              if (!set.entries.includes(i)) set.entries.push(i);
              applicable.set(t.path, set);
            }
            break;
          case "matches":
            for (const t of targets) if (!matches(e.pattern!, t.value)) add(i, t.path);
            break;
          case "has-cardinality":
            if ((e["min-occurs"] !== undefined && targets.length < e["min-occurs"]) || (e["max-occurs"] !== undefined && targets.length > e["max-occurs"])) add(i, ctx.path);
            break;
          case "is-unique": {
            const seen = new Set<string>();
            for (const t of targets)
              for (const key of keysOf(e, t)) {
                if (seen.has(key)) add(i, t.path, key);
                else seen.add(key);
              }
            break;
          }
          case "index": {
            const name = e["index-name"]!;
            const members = indexed.get(name) ?? new Set<string>();
            indexed.set(name, members);
            const index = indexes.get(name) ?? new Map();
            indexes.set(name, index);
            for (const t of targets) {
              if (members.has(t.path)) continue; // a node is in the index once
              members.add(t.path);
              for (const key of keysOf(e, t)) index.set(key, [...(index.get(key) ?? []), { path: t.path, entry: i }]);
            }
            break;
          }
          case "index-has-key": {
            if (e.partial) break; // CNS-015: an entry whose index is partial gives no failure
            const index = indexes.get(e["index-name"]!);
            for (const t of targets) for (const key of keysOf(e, t)) if (!index?.has(key)) add(i, t.path, key);
            break;
          }
          case "expect":
            for (const t of targets) if (run(e.test!, [t.value]).length === 0) add(i, t.path);
            break;
        }
      }
    }
  }
  // CNS-014: the target nodes with the same key in one index give one failure fewer than their number.
  for (const index of indexes.values()) for (const [key, members] of index) for (const m of members.slice(1)) add(m.entry, m.path, key);
  // CNS-008: a node fails for each closed entry of its applicable set when no entry of the set lists the value.
  for (const [path, { value, entries: set }] of applicable) {
    if (set.some((i) => entries[i].values!.includes(String(value)))) continue;
    for (const i of set) if (!entries[i]["allow-other"]) add(i, path);
  }
  return failures;
}
