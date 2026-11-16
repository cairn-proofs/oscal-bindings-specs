/**
 * The RFC 9535 implementation of the store tooling (openspec/specs/constraint-validation, CNS-006): json-p3 in strict
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
