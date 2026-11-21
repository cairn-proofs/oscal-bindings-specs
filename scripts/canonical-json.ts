/**
 * The canonical form of docs/canonical-json.md: JSON with no duplicate keys, datetimes normalized, then RFC 8785
 * (JCS) serialization. Used to generate and check the expected outputs of the conformance corpus.
 */

/** The property names whose string values are datetimes in OSCAL 1.2.3 (docs/canonical-json.md, Datetimes). */
export const DATETIME_KEYS = new Set([
  "collected",
  "date",
  "deadline",
  "end",
  "expires",
  "last-modified",
  "published",
  "start",
]);

const DATETIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?$/;

/** Writes a zero offset as Z and removes the trailing zeros of the fraction. Other strings stay as they are. */
export function normalizeDatetime(value: string): string {
  const m = DATETIME.exec(value);
  if (!m) return value;
  const fraction = (m[2] ?? "").replace(/0+$/, "");
  const offset = m[3] === "+00:00" || m[3] === "-00:00" ? "Z" : (m[3] ?? "");
  return `${m[1]}${fraction ? `.${fraction}` : ""}${offset}`;
}

/** Throws when an object in the JSON text has a duplicate key. The text must already be valid JSON. */
export function assertNoDuplicateKeys(text: string): void {
  const stack: Array<Set<string> | null> = [];
  let expectKey = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      const top = stack[stack.length - 1];
      if (expectKey && top) {
        const key = JSON.parse(text.slice(i, j + 1)) as string;
        if (top.has(key)) throw new Error(`duplicate key "${key}" at offset ${i}`);
        top.add(key);
        expectKey = false;
      }
      i = j;
    } else if (c === "{") {
      stack.push(new Set());
      expectKey = true;
    } else if (c === "[") {
      stack.push(null);
    } else if (c === "}" || c === "]") {
      stack.pop();
    } else if (c === ",") {
      expectKey = stack[stack.length - 1] !== null && stack.length > 0;
    }
  }
}

/**
 * The offset of the first lone surrogate escape in the JSON text, or undefined when there is none. The text must
 * already be valid JSON. It reads the escape sequences from left to right, and `\\` is one sequence. A high surrogate
 * escape must be followed immediately by a low surrogate escape.
 */
export function findLoneSurrogateEscape(text: string): number | undefined {
  const escape = /\\(?:u([0-9a-fA-F]{4})|[^u])/g;
  let pending: { at: number; end: number } | undefined;
  for (let m = escape.exec(text); m; m = escape.exec(text)) {
    const code = m[1] === undefined ? undefined : parseInt(m[1], 16);
    const isLow = code !== undefined && code >= 0xdc00 && code <= 0xdfff;
    if (pending) {
      if (isLow && m.index === pending.end) {
        pending = undefined;
        continue;
      }
      return pending.at;
    }
    if (isLow) return m.index;
    if (code !== undefined && code >= 0xd800 && code <= 0xdbff) pending = { at: m.index, end: m.index + m[0].length };
  }
  return pending?.at;
}
/** Parses JSON text and rejects duplicate keys and lone surrogate escapes (docs/canonical-json.md, Rules, step 1). */
export function parseStrict(text: string): unknown {
  const value: unknown = JSON.parse(text);
  assertNoDuplicateKeys(text);
  const lone = findLoneSurrogateEscape(text);
  if (lone !== undefined) throw new Error(`lone surrogate escape at offset ${lone}`);
  return value;
}

function serialize(value: unknown, key: string | undefined): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`number ${value} has no JSON form`);
    // JSON.stringify writes a finite number with the ECMAScript number-to-string conversion, as JCS requires.
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(key !== undefined && DATETIME_KEYS.has(key) ? normalizeDatetime(value) : value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => serialize(item, undefined)).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    // The default string sort compares UTF-16 code units, as JCS requires.
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${serialize(v, k)}`).join(",")}}`;
  }
  throw new Error(`value of type ${typeof value} has no JSON form`);
}

/** The canonical form of a JSON text, as a string. Encode it as UTF-8 to get the canonical bytes. */
export function canonicalize(text: string): string {
  return serialize(parseStrict(text), undefined);
}
