/**
 * The order of locations (openspec/specs/constraint-validation, CNS-026). A location is an RFC 9535 Normalized Path
 * (CNS-024). Two locations compare segment by segment, from the start. The first pair of segments that differ decides the
 * order. Two index segments compare as numbers. Two name segments compare as the member names that they give, by Unicode
 * code point. A location that is a prefix of the other location comes first.
 */

export type Segment = { index: number } | { name: string };

const ESCAPES: Record<string, string> = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", "'": "'", "\\": "\\", "/": "/" };

/** The segments of a Normalized Path. */
export function segmentsOf(location: string): Segment[] {
  if (!location.startsWith("$")) throw new Error(`the location ${location} does not start with $`);
  const out: Segment[] = [];
  let i = 1;
  while (i < location.length) {
    if (location[i] !== "[") throw new Error(`the location ${location} has no segment at position ${i}`);
    if (location[i + 1] === "'") {
      let name = "";
      i += 2;
      for (;;) {
        const c = location[i];
        if (c === undefined) throw new Error(`the location ${location} has a name that does not end`);
        if (c === "'") break;
        if (c !== "\\") {
          name += c;
          i++;
          continue;
        }
        const n = location[i + 1];
        if (n === "u") {
          const hex = location.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error(`the location ${location} has an escape that is not valid`);
          name += String.fromCharCode(parseInt(hex, 16));
          i += 6;
        } else if (n !== undefined && n in ESCAPES) {
          name += ESCAPES[n];
          i += 2;
        } else throw new Error(`the location ${location} has an escape that is not valid`);
      }
      if (location[i + 1] !== "]") throw new Error(`the location ${location} has a name that is not closed`);
      out.push({ name });
      i += 2;
    } else {
      const end = location.indexOf("]", i);
      const digits = end < 0 ? "" : location.slice(i + 1, end);
      if (!/^(0|[1-9][0-9]*)$/.test(digits)) throw new Error(`the location ${location} has a segment that is not valid`);
      out.push({ index: Number(digits) });
      i = end + 1;
    }
  }
  return out;
}

/** The order of two names by code point. `<` on strings compares UTF-16 code units, which differs outside the BMP. */
function compareNames(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i].codePointAt(0)! - y[i].codePointAt(0)!;
    if (d !== 0) return d;
  }
  return x.length - y.length;
}

/** Negative when `a` comes before `b`, positive when `a` comes after `b`, and 0 for the same location. */
export function compareLocations(a: string, b: string): number {
  const x = segmentsOf(a);
  const y = segmentsOf(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const p = x[i];
    const q = y[i];
    if ("index" in p && "index" in q) {
      if (p.index !== q.index) return p.index - q.index;
    } else if ("name" in p && "name" in q) {
      const d = compareNames(p.name, q.name);
      if (d !== 0) return d;
    } else throw new Error(`the locations ${a} and ${b} have an index and a name at one position`);
  }
  return x.length - y.length;
}

/** The items in the order of their locations. The sort is stable, and the input is not changed. */
export function inLocationOrder<T>(items: readonly T[], locationOf: (item: T) => string): T[] {
  return [...items].sort((p, q) => compareLocations(locationOf(p), locationOf(q)));
}
