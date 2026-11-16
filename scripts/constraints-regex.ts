/**
 * The regular expressions of the constraint manifest (openspec/specs/constraint-validation, CNS-010, design D11).
 * It writes the regular expression of a `matches` constraint, and the pattern of a metaschema datatype, as an I-Regexp
 * of RFC 9485.
 */
import { check } from "iregexp-check";
import { datatypePattern } from "./metaschema.js";

export class GenerationError extends Error {}

/** The RFC 9485 form of the XSD escape `\S`: RFC 9485 has no multi-character escape. */
const NO_WHITE_SPACE = "[^ \\t\\n\\r]";

/** The lexical form of the datatype `integer` (design D11): an optional sign and one or more digits. */
const INTEGER = "[+-]?[0-9]+";

interface ClassItem {
  text: string;
  literal?: "-" | ",";
}

/** Reads the character class that starts at `s[start]`. */
function readClass(s: string, start: number): { negated: boolean; items: ClassItem[]; end: number } {
  let i = start + 1;
  const negated = s[i] === "^";
  if (negated) i++;
  const items: ClassItem[] = [];
  const atom = (): string => {
    if (i >= s.length) throw new GenerationError(`the character class at ${start} of ${s} has no end`);
    if (s[i] === "\\") {
      if (s[i + 1] === "S") throw new GenerationError(`\\S inside a character class of ${s}`);
      i += 2;
      return s.slice(i - 2, i);
    }
    return s[i++];
  };
  while (s[i] !== "]") {
    const first = atom();
    if (s[i] === "-" && i + 1 < s.length && s[i + 1] !== "]") {
      i++;
      items.push({ text: `${first}-${atom()}` });
    } else if (first === "-" || first === ",") items.push({ text: first, literal: first });
    else items.push({ text: first });
  }
  return { negated, items, end: i + 1 };
}

/**
 * Writes a Java regular expression of the metaschema, or an XSD pattern, as an I-Regexp:
 *
 * 1. It removes the anchors `^` and `$`, because an I-Regexp always matches in full.
 * 2. It writes `(?:` as `(`.
 * 3. It writes the escape `\S` as `[^ \t\n\r]`.
 * 4. It moves a comma out of a character class, because the library json-p3 never matches a pattern that has one.
 * 5. It moves a literal hyphen to the end of its character class.
 *
 * It throws a GenerationError for a result that is not an I-Regexp.
 */
export function toIRegexp(source: string): string {
  let s = source;
  if (s.startsWith("^")) s = s.slice(1);
  if (s.endsWith("$") && !s.endsWith("\\$")) s = s.slice(0, -1);
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      out += s[i + 1] === "S" ? NO_WHITE_SPACE : c + s[i + 1];
      i += 2;
    } else if (s.startsWith("(?:", i)) {
      out += "(";
      i += 3;
    } else if (c === "[") {
      const { negated, items, end } = readClass(s, i);
      const hyphen = items.some((x) => x.literal === "-");
      const comma = items.some((x) => x.literal === ",");
      const rest = items.filter((x) => x.literal === undefined).map((x) => x.text);
      const cls = `[${negated ? "^" : ""}${rest.join("")}${hyphen ? "-" : ""}]`;
      if (comma && negated) throw new GenerationError(`a comma in the negated character class of ${source}`);
      out += comma ? (rest.length || hyphen ? `(${cls}|,)` : ",") : cls;
      i = end;
    } else {
      out += c;
      i++;
    }
  }
  if (!check(out)) throw new GenerationError(`${source} is not an I-Regexp after the rewrite: ${out}`);
  return out;
}

/** The I-Regexp of a datatype of the metaschema, from the XSD that `metaschema/<release>/` holds. */
export function datatypeIRegexp(release: string, datatype: string): string {
  if (datatype === "integer") {
    // The XSD restricts xs:integer with the pattern \S(.*\S)?, which alone accepts `high`.
    if (!check(INTEGER)) throw new GenerationError("the integer pattern is not an I-Regexp");
    return INTEGER;
  }
  const pattern = datatypePattern(release, datatype);
  if (pattern === undefined) throw new GenerationError(`the datatype ${datatype} has no pattern`);
  return toIRegexp(pattern);
}
