/**
 * The RFC 9535 implementation of the contract store tooling (openspec/specs/contract-store, STO-059): json-p3 in strict
 * mode, which turns off its extensions to the standard.
 */
import { JSONPathEnvironment, type JSONPathQuery } from "json-p3";

const env = new JSONPathEnvironment({ strict: true });
const cache = new Map<string, JSONPathQuery>();

/** Compiles a query. It throws for a query that is not RFC 9535, or that the library limits. */
export function compile(query: string): JSONPathQuery {
  let c = cache.get(query);
  if (!c) {
    c = env.compile(query);
    cache.set(query, c);
  }
  return c;
}

export interface Hit {
  value: unknown;
  /** The Normalized Path of the node. */
  path: string;
}

/** The nodes that a query selects from `data`, each once, in the order of the library. */
export function run(query: string, data: unknown): Hit[] {
  const out: Hit[] = [];
  const seen = new Set<string>();
  for (const n of compile(query).find(data as never)) {
    const p = n.normalizedPath();
    if (seen.has(p)) continue;
    seen.add(p);
    out.push({ value: n.value, path: p });
  }
  return out;
}

/**
 * A function that gives the same result as `run(query, data)`, and runs each query once. The caller must not change
 * `data` while it uses the function. The constraint checks run the same few hundred queries for each of the many
 * entries that share them, and a query with `..` visits each node of the document. The returned array is shared, so a
 * caller must not change it.
 */
export function runOnce(data: unknown): (query: string) => readonly Hit[] {
  const results = new Map<string, Hit[]>();
  return (query) => {
    let hits = results.get(query);
    if (hits === undefined) {
      hits = run(query, data);
      results.set(query, hits);
    }
    return hits;
  };
}
