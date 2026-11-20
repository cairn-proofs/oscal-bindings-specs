/**
 * The reference check for the datatype rules of the document-parsing capability (PRS-017, PRS-018, PRS-019). The
 * corpus checker, the constraint scripts and the YAML reader register these four formats on their ajv instance, in
 * place of a format library. The contract does not require a binding to implement the rules this way (design.md of
 * the define-datatype-format-rules change, D2).
 *
 * 1. `uri`: a string that matches the production `URI` of RFC 3986.
 * 2. `uri-reference`: a string that matches the production `URI-reference` of RFC 3986.
 * 3. `email`: a string that holds no ASCII control character (U+0000 to U+001F, and U+007F).
 * 4. `date-time`: a string that matches the production `date-time` of RFC 3339.
 *
 * Each regular expression composes the productions of the ABNF in appendix A of RFC 3986. The script adds no
 * dependency. A library for this check would be another approximation.
 *
 *   npm run datatype-rules:self-test     run the self-test
 */
import { pathToFileURL } from "node:url";

import type { Ajv } from "ajv";

// ---------------------------------------------------------------------------------------------------------------
// RFC 3986, appendix A. Each constant is the source of a regular expression without anchors or capture groups.

const ALPHA = "[A-Za-z]";
const DIGIT = "[0-9]";
const HEXDIG = "[0-9A-Fa-f]";
const UNRESERVED = "[A-Za-z0-9\\-._~]";
const SUB_DELIMS = "[!$&'()*+,;=]";
const PCT_ENCODED = `%${HEXDIG}${HEXDIG}`;

const PCHAR = `(?:${UNRESERVED}|${PCT_ENCODED}|${SUB_DELIMS}|[:@])`;
const SEGMENT = `${PCHAR}*`;
const SEGMENT_NZ = `${PCHAR}+`;
const SEGMENT_NZ_NC = `(?:${UNRESERVED}|${PCT_ENCODED}|${SUB_DELIMS}|@)+`;

const SCHEME = `${ALPHA}(?:${ALPHA}|${DIGIT}|[+\\-.])*`;
const USERINFO = `(?:${UNRESERVED}|${PCT_ENCODED}|${SUB_DELIMS}|:)*`;

const DEC_OCTET = `(?:25[0-5]|2[0-4]${DIGIT}|1${DIGIT}${DIGIT}|[1-9]${DIGIT}|${DIGIT})`;
const IPV4_ADDRESS = `${DEC_OCTET}\\.${DEC_OCTET}\\.${DEC_OCTET}\\.${DEC_OCTET}`;
const H16 = `${HEXDIG}{1,4}`;
const LS32 = `(?:${H16}:${H16}|${IPV4_ADDRESS})`;
/** `[ *n( h16 ":" ) h16 ]`: zero to n+1 groups before the "::". */
const before = (n: number) => `(?:(?:${H16}:){0,${n}}${H16})?`;
const IPV6_ADDRESS = [
  `(?:${H16}:){6}${LS32}`,
  `::(?:${H16}:){5}${LS32}`,
  `${before(0)}::(?:${H16}:){4}${LS32}`,
  `${before(1)}::(?:${H16}:){3}${LS32}`,
  `${before(2)}::(?:${H16}:){2}${LS32}`,
  `${before(3)}::${H16}:${LS32}`,
  `${before(4)}::${LS32}`,
  `${before(5)}::${H16}`,
  `${before(6)}::`,
]
  .map((alternative) => `(?:${alternative})`)
  .join("|");
const IPV_FUTURE = `v${HEXDIG}+\\.(?:${UNRESERVED}|${SUB_DELIMS}|:)+`;
const IP_LITERAL = `\\[(?:${IPV6_ADDRESS}|${IPV_FUTURE})\\]`;
const REG_NAME = `(?:${UNRESERVED}|${PCT_ENCODED}|${SUB_DELIMS})*`;
const HOST = `(?:${IP_LITERAL}|${IPV4_ADDRESS}|${REG_NAME})`;
const AUTHORITY = `(?:${USERINFO}@)?${HOST}(?::${DIGIT}*)?`;

const PATH_ABEMPTY = `(?:/${SEGMENT})*`;
const PATH_ABSOLUTE = `/(?:${SEGMENT_NZ}(?:/${SEGMENT})*)?`;
const PATH_NOSCHEME = `${SEGMENT_NZ_NC}(?:/${SEGMENT})*`;
const PATH_ROOTLESS = `${SEGMENT_NZ}(?:/${SEGMENT})*`;

const QUERY = `(?:${PCHAR}|[/?])*`;
const FRAGMENT = QUERY;

const HIER_PART = `(?://${AUTHORITY}${PATH_ABEMPTY}|${PATH_ABSOLUTE}|${PATH_ROOTLESS}|)`;
const RELATIVE_PART = `(?://${AUTHORITY}${PATH_ABEMPTY}|${PATH_ABSOLUTE}|${PATH_NOSCHEME}|)`;
const TAIL = `(?:\\?${QUERY})?(?:#${FRAGMENT})?`;

const URI = `${SCHEME}:${HIER_PART}${TAIL}`;
const RELATIVE_REF = `${RELATIVE_PART}${TAIL}`;

// ---------------------------------------------------------------------------------------------------------------
// RFC 3339, section 5.6. The ABNF strings are case-insensitive, so "t" and "z" match. The day is 01 to 31. The
// pattern of the schema decides the days of each month.

const FULL_DATE = `${DIGIT}{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]${DIGIT}|3[01])`;
const TIME_OFFSET = `(?:[Zz]|[+-](?:[01]${DIGIT}|2[0-3]):[0-5]${DIGIT})`;
const PARTIAL_TIME = `(?:[01]${DIGIT}|2[0-3]):[0-5]${DIGIT}:(?:[0-5]${DIGIT}|60)(?:\\.${DIGIT}+)?`;
const DATE_TIME = `${FULL_DATE}[Tt]${PARTIAL_TIME}${TIME_OFFSET}`;

// A JavaScript `$` without the flag `m` matches only at the end of the string, so a trailing line feed fails.
const anchored = (source: string) => new RegExp(`^(?:${source})$`);
const URI_RE = anchored(URI);
const URI_REFERENCE_RE = anchored(`${URI}|${RELATIVE_REF}`);
const DATE_TIME_RE = anchored(DATE_TIME);
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f]/;

/** The rule of each format. */
export const datatypeRules: Record<"uri" | "uri-reference" | "email" | "date-time", (value: string) => boolean> = {
  uri: (value) => URI_RE.test(value),
  "uri-reference": (value) => URI_REFERENCE_RE.test(value),
  email: (value) => !CONTROL_CHARACTER_RE.test(value),
  "date-time": (value) => DATE_TIME_RE.test(value),
};

/** Register the four formats on an ajv instance. */
export function addDatatypeFormats(ajv: Ajv): Ajv {
  for (const [name, validate] of Object.entries(datatypeRules)) ajv.addFormat(name, { type: "string", validate });
  return ajv;
}

// ---------------------------------------------------------------------------------------------------------------
// Self-test

type Format = keyof typeof datatypeRules;

/** Each entry: the format, the value, and whether the rule accepts it. */
const cases: Array<[Format, string, boolean]> = [
  // RFC 3986, section 1.1.2
  ...[
    "ftp://ftp.is.co.za/rfc/rfc1808.txt",
    "http://www.ietf.org/rfc/rfc2396.txt",
    "ldap://[2001:db8::7]/c=GB?objectClass?one",
    "mailto:John.Doe@example.com",
    "news:comp.infosystems.www.servers.unix",
    "tel:+1-816-555-1212",
    "telnet://192.0.2.16:80/",
    "urn:oasis:names:specification:docbook:dtd:xml:4.1.2",
    // The URI forms of PRS-017.07
    "https://example.org/a",
    "ftp://u:pw@h:21/x",
    "http://[::1]/",
    "urn:example:ns",
    // The production URI accepts nothing after the scheme. The pattern of the schema rejects it.
    "http:",
    // IPv6 forms
    "http://[1:2:3:4:5:6:7:8]/",
    "http://[1:2:3:4:5:6:1.2.3.4]/",
    "http://[::]/",
    "http://[1::]/",
    "http://[v7.a:b]/",
  ].flatMap((value): Array<[Format, string, boolean]> => [["uri", value, true], ["uri-reference", value, true]]),
  // RFC 3986, section 5.4: relative references
  ...[
    "g:h", "g", "./g", "g/", "/g", "//g", "?y", "g?y", "#s", "g#s", "g?y#s", ";x", "g;x", "g;x?y#s",
    "", ".", "./", "..", "../", "../g", "../..", "../../g", "/./g", "g.", ".g", "g..", "..g", "./../g", "g/./h",
    "g?y/./x", "g?y/../x", "g#s/./x", "g#s/../x",
    // The relative forms of PRS-017.07
    "#a", "../x", "a%20b", "./a:b", "//h/p", "?q",
  ].map((value): [Format, string, boolean] => ["uri-reference", value, true]),
  // A relative reference is not a URI
  ...["", "a/b", "//h/p", "#a", "?q", "../x", "1http://x", ":a"].map((value): [Format, string, boolean] => [
    "uri",
    value,
    false,
  ]),
  // The classes of fault of design.md, D3. A fast format library can accept `%zz` and `http://[x`.
  ...[
    "a b", // PRS-017.01 space
    "%zz", // PRS-017.02 invalid escape
    "%a", // a truncated escape
    "http://[x", // PRS-017.03 open bracket
    "http://[1::2::3]/", // two "::"
    "http://[1:2:3:4:5:6:7]/", // too few groups
    "http://[12345::]/", // a group of five digits
    "#a ", // PRS-017.04 trailing space
    "java\tscript:alert(1)", // PRS-017.05 control character
    "http://exa mple.org", // PRS-017.06 space
    "http://é.example/", // PRS-017.10 non-ASCII
    "/a\\b", // PRS-017.11 backslash
    "#a\n", // PRS-017.12 trailing line feed
    "#a\u0001",
    "#a\u007f",
    ":a", // a first segment with a colon, and no scheme
    "http://h:8a/", // a port with a letter
    "a#b#c", // two fragments
    "<a>", // a character outside the grammar
    '"a"',
    "{a}",
    "^a",
    "|a",
    "`a",
  ].map((value): [Format, string, boolean] => ["uri-reference", value, false]),
  ...["a b", "%zz", "http://[x", "http://exa mple.org", "http://é.example/", "http:\\\\x", "http://x/\n"].map(
    (value): [Format, string, boolean] => ["uri", value, false],
  ),
  // PRS-018: an email address holds no ASCII control character, and no other rule applies
  ...["a@b", "用户@例子.广告", "a b@c", "a@b@c", "@", "a@b.org\u0080", "a@b "].map((value): [Format, string, boolean] => [
    "email",
    value,
    true,
  ]),
  ...["a@b\u0001.org", "a@b\u007f.org", "a@b\t", "a@b\n", "\u0000a@b", "a@b\u001f"].map((value): [Format, string, boolean] => [
    "email",
    value,
    false,
  ]),
  // PRS-019: the production date-time of RFC 3339
  ...[
    "2026-01-01T00:00:00Z",
    "2026-01-01T00:00:00z", // the grammar accepts a lowercase "z". The pattern of the schema rejects it.
    "2026-01-01t00:00:00Z",
    "2026-01-01T00:00:00.123456789Z",
    "2026-01-01T23:59:60Z",
    "2026-01-01T00:00:00+14:00",
    "2026-01-01T00:00:00-12:00",
    "2026-12-31T23:59:59-23:59",
  ].map((value): [Format, string, boolean] => ["date-time", value, true]),
  ...[
    "19-02-29T00:00:00Z", // PRS-019.01
    "2026-01-01T00:00:00", // no offset
    "2026-01-01 00:00:00Z", // no "T"
    "2026-13-01T00:00:00Z",
    "2026-00-01T00:00:00Z",
    "2026-01-32T00:00:00Z",
    "2026-01-00T00:00:00Z",
    "2026-01-01T24:00:00Z",
    "2026-01-01T00:60:00Z",
    "2026-01-01T00:00:61Z",
    "2026-01-01T00:00:00.Z",
    "2026-01-01T00:00:00+24:00",
    "2026-01-01T00:00:00+0000",
    "2026-01-01T00:00:00Z\n",
    " 2026-01-01T00:00:00Z",
    "20260-01-01T00:00:00Z",
  ].map((value): [Format, string, boolean] => ["date-time", value, false]),
];

function selfTest(): number {
  let failed = 0;
  for (const [format, value, want] of cases) {
    const got = datatypeRules[format](value);
    if (got !== want) {
      failed++;
      console.log(`FAIL  ${format} ${JSON.stringify(value)}: want ${want ? "accept" : "reject"}, got ${got ? "accept" : "reject"}`);
    }
  }
  console.log(failed ? `\n${failed} FAILED of ${cases.length}` : `all ${cases.length} datatype-rules cases pass`);
  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest());
}
