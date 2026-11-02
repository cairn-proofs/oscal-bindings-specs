/**
 * The reference reader for YAML inputs (yaml-documents capability, YML-002 to YML-004, YML-009, YML-010). The corpus
 * checker uses it to prove each YAML case without a binding. The contract does not require a binding to read YAML
 * this way (design.md of the define-yaml-documents change, D4).
 *
 * 1. Decode the bytes as UTF-8, and parse with the `yaml` package: failsafe schema, no known tags, so that a tag does
 *    not change a node. A warning is not an error.
 * 2. Build a tree of text from the content of each scalar. Resolve aliases, with a cycle check. Keys are compared by
 *    their text.
 * 3. Validate the tree with the schema. At each `type` error for a number, an integer, or a boolean, convert the text
 *    by the JSON grammar of that type. Repeat until no `type` error can be converted.
 * 4. Write the JSON text, with each number as the text of its scalar (YML-005), and validate its JSON value.
 *
 *   npm run yaml-reader:self-test     run the self-test
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";

import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import addFormatsModule from "ajv-formats";
import { isAlias, isMap, isScalar, isSeq, parseAllDocuments, type Document, type Node } from "yaml";

/** Why the reader rejects an input. Each corpus case and self-test input names one reason. */
export type YamlFault =
  | "not-utf-8"
  | "syntax"
  | "no-document"
  | "two-documents"
  | "duplicate-key"
  | "non-scalar-key"
  | "alias-cycle"
  | "grammar"
  | "schema";

export type YamlReadResult =
  | { ok: true; json: string; value: unknown }
  | { ok: false; fault: YamlFault; detail: string; locations: string[] };

/** The number grammar of RFC 8259, section 6. */
const JSON_NUMBER = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
const JSON_BOOLEAN = /^(?:true|false)$/;

class Fault extends Error {
  constructor(
    readonly fault: YamlFault,
    detail: string,
    readonly locations: string[] = [],
  ) {
    super(detail);
  }
}

const escapePointer = (key: string) => key.replace(/~/g, "~0").replace(/\//g, "~1");
const unescapePointer = (part: string) => part.replace(/~1/g, "/").replace(/~0/g, "~");

/** Step 2: the tree of text. Each scalar gives its content. An alias gives the value of its anchored node. */
function textTree(doc: Document, node: unknown, pointer: string, ancestors: Set<unknown>): unknown {
  if (isAlias(node)) {
    const target = node.resolve(doc);
    if (target === undefined) throw new Fault("syntax", `alias *${node.source} has no anchor`, [pointer]);
    if (ancestors.has(target)) throw new Fault("alias-cycle", `alias *${node.source} is inside its own anchored node`, [pointer]);
    return textTree(doc, target, pointer, ancestors);
  }
  if (node === null || node === undefined) return "";
  if (isScalar(node)) return String(node.source ?? "");
  const inner = new Set(ancestors).add(node);
  if (isSeq(node)) return node.items.map((item, i) => textTree(doc, item, `${pointer}/${i}`, inner));
  if (isMap(node)) {
    const out: Record<string, unknown> = {};
    for (const pair of node.items) {
      let key: unknown = pair.key;
      if (isAlias(key)) key = key.resolve(doc);
      if (key !== null && key !== undefined && !isScalar(key))
        throw new Fault("non-scalar-key", "a mapping key is not a scalar", [pointer]);
      const text = key === null || key === undefined ? "" : String(key.source ?? "");
      if (Object.hasOwn(out, text)) throw new Fault("duplicate-key", `the key "${text}" occurs two times`, [pointer]);
      out[text] = textTree(doc, pair.value, `${pointer}/${escapePointer(text)}`, inner);
    }
    return out;
  }
  throw new Fault("syntax", `unsupported YAML node at ${pointer || "/"}`, [pointer]);
}

/** The scalar types that a `type` error names, in the order of YML-004 after string. */
function expectedTypes(errors: ErrorObject[]): string[] {
  const named = new Set<string>();
  for (const e of errors) {
    const t = (e.params as { type?: string | string[] }).type;
    for (const one of Array.isArray(t) ? t : [t]) if (one) named.add(one);
  }
  return ["number", "integer", "boolean"].filter((t) => named.has(t));
}

/** Step 3: convert the text at each `type` error, by the grammar of the first named type that the text matches. */
function convertScalars(tree: unknown, validate: ValidateFunction, numbers: Set<string>): void {
  for (;;) {
    if (validate(tree)) return;
    const byPath = new Map<string, ErrorObject[]>();
    for (const e of validate.errors ?? []) {
      if (e.keyword !== "type") continue;
      byPath.set(e.instancePath, [...(byPath.get(e.instancePath) ?? []), e]);
    }
    let converted = 0;
    const failures: string[] = [];
    for (const [path, errors] of byPath) {
      const parts = path.split("/").slice(1).map(unescapePointer);
      if (parts.length === 0) continue;
      let parent = tree as Record<string, unknown>;
      for (const part of parts.slice(0, -1)) parent = parent[part] as Record<string, unknown>;
      const key = parts[parts.length - 1];
      const text = parent[key];
      if (typeof text !== "string") continue;
      const types = expectedTypes(errors);
      if (types.length === 0) continue;
      const type = types.find((t) => (t === "boolean" ? JSON_BOOLEAN : JSON_NUMBER).test(text));
      if (type === undefined) {
        failures.push(path);
      } else if (type === "boolean") {
        parent[key] = text === "true";
        converted++;
      } else {
        parent[key] = Number(text);
        numbers.add(path);
        converted++;
      }
    }
    if (failures.length) throw new Fault("grammar", "a scalar matches no grammar of the type at its location", failures);
    if (converted === 0) return;
  }
}

/** Step 4: JSON text with each converted number written as the text of its scalar. */
function jsonText(value: unknown, pointer: string, numbers: Set<string>, texts: Map<string, string>): string {
  if (typeof value === "number") return numbers.has(pointer) ? (texts.get(pointer) as string) : JSON.stringify(value);
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v, i) => jsonText(v, `${pointer}/${i}`, numbers, texts)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>);
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${jsonText(v, `${pointer}/${escapePointer(k)}`, numbers, texts)}`).join(",")}}`;
}

/** The text of each scalar at each pointer of the tree, before conversion. */
function scalarTexts(value: unknown, pointer: string, out: Map<string, string>): Map<string, string> {
  if (typeof value === "string") out.set(pointer, value);
  else if (Array.isArray(value)) value.forEach((v, i) => scalarTexts(v, `${pointer}/${i}`, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) scalarTexts(v, `${pointer}/${escapePointer(k)}`, out);
  return out;
}

/** Reads a YAML input as the yaml-documents capability defines. `validate` is the validator of the document schema. */
export function readYaml(bytes: Uint8Array, validate: ValidateFunction): YamlReadResult {
  try {
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Fault("not-utf-8", "the input is not valid UTF-8");
    }
    const docs = parseAllDocuments(source, { schema: "failsafe", resolveKnownTags: false, uniqueKeys: false });
    const list = Array.isArray(docs) ? docs : [];
    for (const doc of list) {
      if (doc.errors.length) throw new Fault("syntax", doc.errors.map((e) => e.message).join("; "));
    }
    if (list.length === 0) throw new Fault("no-document", "the stream holds no document");
    if (list.length > 1) throw new Fault("two-documents", `the stream holds ${list.length} documents`);
    const doc = list[0];
    const tree = textTree(doc, doc.contents as Node | null, "", new Set());
    const texts = scalarTexts(tree, "", new Map());
    const numbers = new Set<string>();
    convertScalars(tree, validate, numbers);
    const json = jsonText(tree, "", numbers, texts);
    const value: unknown = JSON.parse(json);
    if (!validate(value))
      throw new Fault(
        "schema",
        (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`).join("; "),
        [...new Set((validate.errors ?? []).map((e) => e.instancePath))],
      );
    return { ok: true, json, value };
  } catch (error) {
    if (error instanceof Fault) return { ok: false, fault: error.fault, detail: error.message, locations: error.locations };
    throw error;
  }
}

type SchemaNode = Record<string, unknown>;

/**
 * The start-up check of design.md, D4. It throws when a `type` keyword names more than one type, or when a union
 * allows a string and another scalar type at one location. For such a schema the ajv method of step 3 can disagree
 * with YML-004.
 */
export function checkSchemaForReader(schema: { $id: string; definitions: Record<string, unknown> }): void {
  const problems: string[] = [];
  const resolve = (ref: string): SchemaNode | undefined => {
    const m = /#\/definitions\/(.+)$/.exec(ref);
    return m ? (schema.definitions[m[1]] as SchemaNode | undefined) : undefined;
  };
  const memo = new Map<SchemaNode, Set<string>>();
  // The scalar types that a value at this schema node can have, as far as the node itself says.
  const scalarTypes = (node: SchemaNode | undefined): Set<string> => {
    const out = new Set<string>();
    if (!node || typeof node !== "object") return out;
    const cached = memo.get(node);
    if (cached) return cached;
    memo.set(node, out);
    const type = node.type;
    for (const t of Array.isArray(type) ? type : type === undefined ? [] : [type])
      if (t === "string" || t === "number" || t === "integer" || t === "boolean") out.add(t);
    if (typeof node.$ref === "string") for (const t of scalarTypes(resolve(node.$ref))) out.add(t);
    for (const key of ["allOf", "anyOf", "oneOf"])
      for (const branch of (node[key] as SchemaNode[] | undefined) ?? []) for (const t of scalarTypes(branch)) out.add(t);
    return out;
  };
  const walk = (node: unknown, where: string) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${where}/${i}`));
    if (!node || typeof node !== "object") return;
    const n = node as SchemaNode;
    if (Array.isArray(n.type)) problems.push(`${where}: a type keyword names ${JSON.stringify(n.type)}`);
    for (const key of ["anyOf", "oneOf"]) {
      if (!Array.isArray(n[key])) continue;
      const types = new Set<string>();
      for (const branch of n[key] as SchemaNode[]) for (const t of scalarTypes(branch)) types.add(t);
      if (types.has("string") && types.size > 1) problems.push(`${where}/${key}: a union allows ${[...types].join(", ")}`);
    }
    for (const [k, v] of Object.entries(n)) walk(v, `${where}/${k}`);
  };
  walk(schema, "#");
  if (problems.length) throw new Error(`the schema breaks an assumption of the YAML reader:\n  ${problems.join("\n  ")}`);
}

/** The document validator for a release, with the start-up check of design.md, D4. */
export function documentValidator(schemaPath: string): ValidateFunction {
  const addFormats = addFormatsModule as unknown as (ajv: Ajv) => Ajv;
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as { $id: string; definitions: Record<string, unknown> };
  checkSchemaForReader(schema);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(schema);
  return ajv.getSchema(schema.$id) as ValidateFunction;
}

// ---------------------------------------------------------------------------------------------------------------
// Self-test

const METADATA = `    title: t
    last-modified: 2024-01-02T03:04:05Z
    version: "1"
    oscal-version: 1.2.3`;

/** A minimal catalog. `metadata` replaces the metadata lines, and `extra` adds lines to the catalog. */
const catalog = (metadata = METADATA, extra = "") =>
  `catalog:\n  uuid: 2f6e5c2a-6b0e-4b8e-9a3e-1c7d0b5f4a10\n  metadata:\n${metadata}\n${extra}`;

/** A minimal component definition with one component that holds `protocol` lines, then optional `props` lines. */
const componentDefinition = (protocol: string, props = "") => `component-definition:
  uuid: 2f6e5c2a-6b0e-4b8e-9a3e-1c7d0b5f4a11
  metadata:
${METADATA}
  components:
    - uuid: 2f6e5c2a-6b0e-4b8e-9a3e-1c7d0b5f4a12
      type: service
      title: c
      description: d
      protocols:
        - name: https
          port-ranges:
${protocol}
${props}`;

/** A minimal profile with a `merge` line. */
const profile = (merge: string) => `profile:
  uuid: 2f6e5c2a-6b0e-4b8e-9a3e-1c7d0b5f4a13
  metadata:
${METADATA}
  imports:
    - href: "#c"
      include-all: {}
  merge: {${merge}}
`;

type Expect = { at: string; is: unknown } | { fault: YamlFault; at?: string } | { json: (json: string) => boolean };

const props = (lines: string) => `    props:\n${lines}`;

const cases: Array<[string, string | Uint8Array, Expect[]]> = [
  // YML-002
  ["YML-002.01 syntax error", catalog(METADATA, "  params: [\n"), [{ fault: "syntax" }]],
  ["YML-002.02 two documents", `${catalog()}---\n${catalog()}`, [{ fault: "two-documents" }]],
  ["YML-002.03 no document", "# only a comment\n", [{ fault: "no-document" }]],
  ["YML-002.04 UTF-16 with a byte order mark", utf16(catalog()), [{ fault: "not-utf-8" }]],
  // YML-003
  [
    "YML-003.01 nested structure",
    catalog(`${METADATA}\n${props("      - {name: a, value: x}\n      - {name: b, value: y}")}`),
    [{ at: "/catalog/metadata/props/1/name", is: "b" }],
  ],
  ["YML-003.02 key that is not a scalar", catalog(`${METADATA}\n    ? [a, b]\n    : c`), [{ fault: "non-scalar-key" }]],
  ["YML-003.03 keys with the same text", catalog(`${METADATA}\n    "title": u`), [{ fault: "duplicate-key", at: "/catalog/metadata" }]],
  // YML-004
  ["YML-004.01 number form at a string location", catalog(METADATA.replace('version: "1"', "version: 1.0")), [{ at: "/catalog/metadata/version", is: "1.0" }]],
  ["YML-004.02 trailing zero at a string location", catalog(`${METADATA}\n${props("      - {name: a, value: 1.10}")}`), [{ at: "/catalog/metadata/props/0/value", is: "1.10" }]],
  ["YML-004.03 boolean form at a string location", catalog(METADATA.replace("title: t", "title: yes")), [{ at: "/catalog/metadata/title", is: "yes" }]],
  [
    "YML-004.04 null forms at a string location",
    catalog(`${METADATA}\n    remarks: null\n${props("      - name: a\n        value: x\n        remarks: ~\n      - name: b\n        value: y\n        remarks:")}`),
    [
      { at: "/catalog/metadata/remarks", is: "null" },
      { at: "/catalog/metadata/props/0/remarks", is: "~" },
      { at: "/catalog/metadata/props/1/remarks", is: "" },
    ],
  ],
  ["YML-004.05 scalar tag at a string location", catalog(`${METADATA}\n${props("      - {name: a, value: !!int 7}")}`), [{ at: "/catalog/metadata/props/0/value", is: "7" }]],
  ["YML-004.06 quoted scalar at a number location", componentDefinition('            - {start: "443", end: 443}'), [{ at: "/component-definition/components/0/protocols/0/port-ranges/0/start", is: 443 }]],
  ["YML-004.07 hexadecimal form at a number location", componentDefinition("            - {start: 0x1BB}"), [{ fault: "grammar", at: "/component-definition/components/0/protocols/0/port-ranges/0/start" }]],
  ["YML-004.08 boolean location with yes", profile("as-is: yes"), [{ fault: "grammar", at: "/profile/merge/as-is" }]],
  ["YML-004.08 boolean location with true", profile("as-is: true"), [{ at: "/profile/merge/as-is", is: true }]],
  ["YML-004.09 datetime text is kept", catalog(METADATA.replace("2024-01-02T03:04:05Z", "2024-01-02T03:04:05.1234567Z")), [{ at: "/catalog/metadata/last-modified", is: "2024-01-02T03:04:05.1234567Z" }]],
  ["YML-004.10 plus sign at a number location", componentDefinition("            - {start: +443}"), [{ fault: "grammar" }]],
  ["number grammar: underscore", componentDefinition("            - {start: 1_000}"), [{ fault: "grammar" }]],
  ["number grammar: leading zero", componentDefinition("            - {start: 0443}"), [{ fault: "grammar" }]],
  // YML-005
  [
    "YML-005.04 number text is the JSON number token",
    componentDefinition("            - {start: 443.0, end: 443}"),
    [{ json: (json) => json.includes('"start":443.0') }, { at: "/component-definition/components/0/protocols/0/port-ranges/0/start", is: 443 }],
  ],
  ["YML-005.03 unknown field is rejected", catalog(`${METADATA}\n    colour: blue`), [{ fault: "schema" }]],
  // YML-009
  [
    "YML-009.01 alias is read at its own location",
    componentDefinition("            - {start: &n 443, end: 443}", "      props:\n        - {name: a, value: *n}\n"),
    [
      { at: "/component-definition/components/0/protocols/0/port-ranges/0/start", is: 443 },
      { at: "/component-definition/components/0/props/0/value", is: "443" },
    ],
  ],
  ["YML-009.02 alias inside its own anchored node", catalog(`${METADATA}\n  back-matter: &a\n    resources: [*a]`), [{ fault: "alias-cycle" }]],
  [
    "YML-009.03 tag on a sequence",
    catalog(METADATA, '  back-matter:\n    resources:\n      - uuid: 2f6e5c2a-6b0e-4b8e-9a3e-1c7d0b5f4a14\n        rlinks: !!omap [{href: "https://example.com/a"}]'),
    [{ at: "/catalog/back-matter/resources/0/rlinks/0/href", is: "https://example.com/a" }],
  ],
  ["!!set tag on a mapping", catalog(METADATA).replace("  metadata:\n", "  metadata: !!set\n"), [{ at: "/catalog/metadata/title", is: "t" }]],
  ["!!binary tag on a string", catalog(METADATA.replace("title: t", "title: !!binary aGk=")), [{ at: "/catalog/metadata/title", is: "aGk=" }]],
  ["YML-009.04 merge key", `base: &m {title: t}\n${catalog(`${METADATA}\n    <<: *m`)}`, [{ fault: "schema" }]],
  // YML-010
  ["YML-010.01 grammar error names its location", componentDefinition("            - {start: 0x1BB, end: 0x1BC}"), [{ fault: "grammar", at: "/component-definition/components/0/protocols/0/port-ranges/0/end" }]],
  // Other
  ["empty scalar at a string with a pattern", catalog(`${METADATA}\n${props("      - name: a\n        value:")}`), [{ fault: "schema" }]],
  ["block scalar content", catalog(`${METADATA}\n    remarks: |\n      l1\n      l2`), [{ at: "/catalog/metadata/remarks", is: "l1\nl2\n" }]],
  ["escapes in a quoted scalar", catalog(METADATA.replace("title: t", 'title: "x\\u00e9"')), [{ at: "/catalog/metadata/title", is: "x\u00e9" }]],
];

function utf16(text: string): Uint8Array {
  const body = Buffer.from(text, "utf16le");
  return new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xfe]), body]));
}

function at(value: unknown, pointer: string): unknown {
  let v = value;
  for (const part of pointer.split("/").slice(1).map(unescapePointer)) v = (v as Record<string, unknown>)?.[part];
  return v;
}

function selfTest(): number {
  const validate = documentValidator("schemas/1.2.3/oscal_complete_schema.json");
  let failed = 0;
  for (const [name, input, expects] of cases) {
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
    const result = readYaml(bytes, validate);
    const problems: string[] = [];
    for (const expect of expects) {
      if ("fault" in expect) {
        if (result.ok) problems.push(`want fault ${expect.fault}, got a value`);
        else if (result.fault !== expect.fault) problems.push(`want fault ${expect.fault}, got ${result.fault}: ${result.detail}`);
        else if (expect.at !== undefined && !result.locations.includes(expect.at))
          problems.push(`want location ${expect.at}, got ${JSON.stringify(result.locations)}`);
      } else if (!result.ok) {
        problems.push(`want a value, got fault ${result.fault}: ${result.detail}`);
      } else if ("json" in expect) {
        if (!expect.json(result.json)) problems.push(`JSON text does not match: ${result.json}`);
      } else if (!Object.is(at(result.value, expect.at), expect.is)) {
        problems.push(`${expect.at}: want ${JSON.stringify(expect.is)}, got ${JSON.stringify(at(result.value, expect.at))}`);
      }
    }
    if (problems.length) failed++;
    console.log(`${problems.length ? "FAIL" : "PASS"}  ${name}${problems.map((p) => `\n      ${p}`).join("")}`);
  }
  // The start-up check rejects a union of a string and a number, and a type keyword with two types.
  for (const [name, schema] of [
    ["union of string and number", { $id: "x", definitions: { a: { anyOf: [{ type: "string" }, { type: "number" }] } } }],
    ["type keyword with two types", { $id: "x", definitions: { a: { type: ["string", "number"] } } }],
  ] as const) {
    let ok = false;
    try {
      checkSchemaForReader(schema);
    } catch {
      ok = true;
    }
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  start-up check rejects a ${name}`);
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall yaml-reader cases pass");
  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest());
}
