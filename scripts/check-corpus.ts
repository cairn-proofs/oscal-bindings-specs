/**
 * Checks the conformance corpus in corpus/<release>/ against its case index, cases.json. The checks use the vendored
 * schema and an independent JSON Schema validator, so the corpus does not depend on any one binding:
 *
 * 1. Each case is well-formed, and each case id is unique.
 * 2. Each error category has at least one case.
 * 3. Each file under documents/ and elements/ has a case.
 * 4. A round-trip input is valid against the schema, its source hash matches, and its expected file is its canonical
 *    form (docs/canonical-json.md).
 * 5. A parse input fails as its category states: not JSON, not UTF-8, or not valid against the schema.
 * 6. A typed-parse, parse-file, assessment-period, or validate-element case has the precondition its category needs.
 * 7. A yaml-round-trip input reads with the reference YAML reader (scripts/yaml-reader.ts), and the canonical form of
 *    its JSON text is its expected file. A yaml-round-trip case that copies a source names the expected file of a JSON
 *    round-trip case, and --write does not write that file.
 * 8. The reference YAML reader rejects a yaml-parse input, and the notes of the case name the fault code.
 * 9. Each cited requirement or scenario identifier names a heading in the specs.
 * 10. No case has a `known-defects` field, and the index has no `defect-twins` field. Each binding keeps its own
 *     expected failures (VER-006).
 * 11. An `expected-max-failures` value is consistent with PRS-013: the case is a parse case, the value is an integer of
 *     1 or more and not less than `expected-min-failures`, an input whose root keys name one document type is not
 *     valid against the schema branch of that type, and an input with two or more root keys has no maximum.
 * 12. An assessment-period case has either `expected-category` or `expected-period`, not both and not neither. With
 *     `expected-category`, the input is not an Assessment Plan or Assessment Results. With `expected-period`, the input
 *     is a valid Assessment Plan or Assessment Results, and the canonical form of each bound that FAC-005 to FAC-007
 *     compute from it equals the value of the field.
 * 13. The list of element-type names (ELV-002) is the kebab-case form of the `name` of each type in the naming
 *     manifest, in code-point order. No two types give the same name. An element-types case has no input, and its
 *     expected file is the canonical form of the list. A validate-element case with `expected-valid` names an element
 *     type in the list, and an unknown-element-type case names one that is not in the list.
 * 14. A builder case (build-hash, build-rlink, build-resource) has `arguments` and no input. A build-hash or build-rlink
 *     case has exactly one of `expected-element` and `expected-category`. A build-resource case has exactly one of
 *     `expected-uuid`, `expected-element`, and `expected-category`. The checker makes the element that the arguments
 *     give, and validates it against the schema: the hash definition, the rlink item schema, or the resource item
 *     schema. A hash gets the algorithm SHA-256 when it has none (BMB-001). A resource takes its `rlinks` as they are
 *     (BMB-003). A resource with no identifier and no key
 *     gets a fixed UUID, and its `uuid` is left out of the comparison (BMB-003). With `expected-element`, the element
 *     is valid, the canonical form of `expected-element` equals the canonical form of the element, and a build-resource
 *     case has no key and, with no identifier, no `uuid` in `expected-element`. With `expected-uuid`, the key is not
 *     empty, there is no identifier, and the UUID version 5 of the key (BMB-004) equals the value. With
 *     `expected-category`, the category is builder-error, and the case has one fault. For a hash or an rlink, the
 *     element is not valid. For a resource, the fault is one of these: an empty key with no identifier, a key with a
 *     valid identifier, or an element that is not valid. Only a builder case has `arguments` or `expected-element`.
 *     Only a build-resource case has `expected-uuid`.
 * 15. The BMB-004 namespace is the UUID version 5 of its URL in the URL namespace, the text of BMB-004 in the main spec
 *     contains the namespace, and docs/back-matter-keys.md contains the URL and the namespace.
 * 16. A facade case has an `input-form` that is absent, `bytes`, or `path`, and only a facade case has `path`. It has
 *     exactly one of `expected` and `expected-category`. With `expected`, the input is valid against the schema, its only
 *     root key is `document-type`, `expected` is the expected file of a round-trip case, and `expected` is the canonical
 *     form of the input, so the body, the metadata, the OSCAL version, and the identifier that the facade reads come
 *     from a known document. With `expected-category`, the category is not-found, the form is `path`, and the input
 *     does not exist.
 * 17. A case field `expected-constraints` (CNS-020) applies to a parse, validate-element, or builder case. Its input
 *     conforms to the schema, and the reference evaluator (scripts/constraint-reference.ts) gives the failures that the
 *     field lists by `id`, once for each failure. A parse input that conforms to the schema, a validate-element input
 *     with `expected-valid` false that conforms to it, and a builder element that conforms to it and fails the manifest
 *     need the field. Each reportable entry of the constraint manifest has a case whose input fails it. No input that a
 *     case expects to be valid, and no element that a builder case expects, fails an entry.
 *
 *   npm run corpus:check           check the corpus
 *   npm run corpus:write           regenerate each expected file, then check
 *   npm run corpus:self-test       run the rule scenarios of check 17
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Ajv, type ValidateFunction } from "ajv";
import addFormatsModule from "ajv-formats";

import { canonicalize, normalizeDatetime } from "./canonical-json.js";
import { CorpusConstraints, type EntryFailure } from "./corpus-constraints.js";
import type { Entry } from "./constraints-lib.js";
import { checkSchemaForReader, readYaml } from "./yaml-reader.js";

const addFormats = addFormatsModule as unknown as (ajv: Ajv) => Ajv;

const RELEASE = fs.readFileSync("VERSION", "utf8").trim().split("+oscal.")[1];
const ROOT = `corpus/${RELEASE}`;
const SCHEMA = `schemas/${RELEASE}/oscal_complete_schema.json`;
const DOCUMENT_TYPES = [
  "catalog",
  "profile",
  "component-definition",
  "system-security-plan",
  "assessment-plan",
  "assessment-results",
  "plan-of-action-and-milestones",
  "mapping-collection",
];
const OPERATIONS = [
  "round-trip",
  "parse",
  "parse-typed",
  "parse-file",
  "assessment-period",
  "validate-element",
  "yaml-round-trip",
  "yaml-parse",
  "element-types",
  "build-resource",
  "build-hash",
  "build-rlink",
  "facade",
];
const BUILDERS = ["build-hash", "build-rlink", "build-resource"];
const ARGUMENT_FIELDS: Record<string, string[]> = {
  "build-hash": ["value", "algorithm"],
  "build-rlink": ["href", "media-type", "hashes"],
  "build-resource": ["key", "title", "identifier", "document-ids", "rlinks"],
};
interface Expectations {
  /** CNS-020: the failures equal the `expected-constraints` of the case, and each failed entry counts as covered. */
  expectFailures: (c: Case, failures: EntryFailure[]) => void;
  /** CNS-020: an input that the case expects to be valid fails no entry. */
  expectNone: (c: Case, failures: EntryFailure[]) => void;
}
function expectations(fail: (id: string, message: string) => void, covered: Set<number>): Expectations {
  return {
    expectFailures: (c, failures) => {
      const message = constraintMismatch(c["expected-constraints"], failures);
      if (message) fail(c.id, message);
      for (const f of failures) covered.add(f.entry);
    },
    expectNone: (c, failures) => {
      if (failures.length) fail(c.id, `the input is expected to be valid, but it fails ${JSON.stringify(failures.map((f) => idOf(f.id)))}`);
    },
  };
}
/** The element type that each builder makes (ELV-002). */
const TYPE_OF: Record<string, string> = { "build-hash": "hash", "build-rlink": "back-matter-resource-rlink", "build-resource": "back-matter-resource" };
const ID = /^[A-Z]{2,5}-\d{3}(?:\.\d{2})?$/;

interface Case {
  id: string;
  operation: string;
  input?: string;
  "input-form"?: string;
  "document-type"?: string;
  "element-type"?: string;
  expected?: string;
  "expected-category"?: string;
  "expected-valid"?: boolean;
  "expected-min-failures"?: number;
  "expected-max-failures"?: number;
  "expected-period"?: { start: string; end: string };
  arguments?: {
    key?: string;
    title?: string;
    identifier?: string;
    "document-ids"?: unknown[];
    rlinks?: unknown[];
    value?: string;
    algorithm?: string;
    href?: string;
    "media-type"?: string;
    hashes?: unknown[];
  };
  "expected-element"?: unknown;
  "expected-uuid"?: string;
  "expected-constraints"?: string[];
  requirements: string[];
  source?: { repository: string; commit: string; path: string; sha256: string };
  notes?: string;
}

// BMB-004 and docs/back-matter-keys.md: the namespace of a derived resource identifier, and the URL that it comes from.
const KEY_NAMESPACE = "3942257f-e1cf-5e06-9c6f-eeb97ecabe77";
const KEY_NAMESPACE_URL = "https://oscalregistry.org/ns/oscal/back-matter-resource";
const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
const UUID_V4_OR_V5 = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[45][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/;
/** The UUID version 5 of RFC 9562, Section 5.5: SHA-1 of the namespace bytes and the UTF-8 bytes of the name. */
function uuidV5(namespace: string, name: string): string {
  const digest = createHash("sha1")
    .update(Buffer.from(namespace.replaceAll("-", ""), "hex"))
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = digest.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const GENERATED_UUID = "0c6b8f1e-4a2d-4b7e-9c3f-5d6e7f8a9b0c";
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

const idOf = (id: string | null) => id ?? "(no id)";
/** CNS-020: the `id` values of the failures equal the list of the case, with each repeat. Undefined when they are equal. */
export function constraintMismatch(listed: string[] | undefined, failures: EntryFailure[]): string | undefined {
  const got = failures.map((f) => idOf(f.id)).sort();
  const want = [...(listed ?? [])].sort();
  if (JSON.stringify(got) === JSON.stringify(want)) return undefined;
  return `expected-constraints is ${JSON.stringify(want)}, but the reference evaluator gives ${JSON.stringify(got)}`;
}
/** CNS-020: a message for each reportable entry that no case fails. */
export function uncoveredEntries(entries: Entry[], covered: Set<number>): string[] {
  return entries.flatMap((e, i) =>
    e.reportable && !covered.has(i) ? [`no case has an input that fails the reportable entry ${i} (${idOf(e.id)}, ${e.kind} on ${e.definition})`] : [],
  );
}

interface Instant {
  seconds: number;
  fraction: string;
}
/** The instant of a datetime with an offset, with every fraction digit. The JavaScript Date type keeps milliseconds only. */
function instantOf(value: string): Instant | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!m) return undefined;
  const [y, mo, d, h, mi, sec] = m.slice(1, 7).map(Number);
  const offset = m[8] === "Z" ? 0 : (m[9] === "-" ? -1 : 1) * (Number(m[10]) * 60 + Number(m[11]));
  return { seconds: Date.UTC(y, mo - 1, d, h, mi, sec) / 1000 - offset * 60, fraction: m[7] ?? "" };
}
function compareInstants(a: Instant, b: Instant): number {
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1;
  const width = Math.max(a.fraction.length, b.fraction.length);
  const x = a.fraction.padEnd(width, "0");
  const y = b.fraction.padEnd(width, "0");
  return x < y ? -1 : x > y ? 1 : 0;
}
/** The period of FAC-005 to FAC-007: the values in document order, replaced only by a strictly earlier or later instant. */
function assessmentPeriod(doc: Record<string, unknown>): { start?: string; end?: string } {
  const starts: string[] = [];
  const ends: string[] = [];
  const walkTasks = (tasks: unknown) => {
    if (!Array.isArray(tasks)) return;
    for (const task of tasks as Record<string, Record<string, Record<string, string>> | unknown>[]) {
      const timing = task.timing as Record<string, Record<string, string>> | undefined;
      const onDate = timing?.["on-date"]?.date;
      if (onDate !== undefined) {
        starts.push(onDate);
        ends.push(onDate);
      }
      const range = timing?.["within-date-range"];
      if (range) {
        starts.push(range.start);
        ends.push(range.end);
      }
      walkTasks(task.tasks);
    }
  };
  if (Object.hasOwn(doc, "assessment-plan")) walkTasks((doc["assessment-plan"] as { tasks?: unknown }).tasks);
  else
    for (const result of (doc["assessment-results"] as { results: { start?: string; end?: string }[] }).results) {
      if (result.start !== undefined) starts.push(result.start);
      if (result.end !== undefined) ends.push(result.end);
    }
  const pick = (values: string[], sign: number): string | undefined => {
    let best: string | undefined;
    for (const value of values)
      if (best === undefined || compareInstants(instantOf(value)!, instantOf(best)!) === sign) best = value;
    return best;
  };
  return { start: pick(starts, -1), end: pick(ends, 1) };
}
/** The requirement and scenario identifiers on the headings of every spec under openspec/. */
function specIdentifiers(): Set<string> {
  const ids = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === "spec.md") {
        for (const m of fs.readFileSync(rel, "utf8").matchAll(/^#{3,4} (?:Requirement|Scenario): ([A-Z]{2,5}-\d{3}(?:\.\d{2})?) /gm))
          ids.add(m[1]);
      }
    }
  };
  walk("openspec");
  return ids;
}

/** The kebab-case form of a canonical type name: a hyphen before each capital that follows a lowercase letter or a digit. */
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Every file under documents/ and elements/, relative to the corpus root. */
function corpusFiles(): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const child = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  walk("documents");
  walk("elements");
  return out.sort();
}

/** The checks of a builder case (check 14). The validators come from the schema. */
function checkBuilderFactory(constraints: CorpusConstraints, { expectFailures, expectNone }: Expectations, fail: (id: string, message: string) => void) {
  // CNS-020: the failures of the element of a builder case against the constraint manifest, or none when it is not valid.
  const manifestFailures = (type: string, element: unknown, valid: boolean): EntryFailure[] => (valid ? constraints.ofElement(type, element) : []);
  return (c: Case, v: { validateResource: ValidateFunction; validateRlink: ValidateFunction; validateHash: ValidateFunction }) => {
    const category = c["expected-category"];
    if (c.input !== undefined) fail(c.id, `a ${c.operation} case has no input`);
    const args = c.arguments;
    if (args === null || typeof args !== "object" || Array.isArray(args)) {
      fail(c.id, `a ${c.operation} case needs arguments`);
      return;
    }
    const record = args as Record<string, unknown>;
    for (const name of Object.keys(record))
      if (!ARGUMENT_FIELDS[c.operation].includes(name)) fail(c.id, `arguments has the unknown field "${name}"`);
    for (const name of ["key", "title", "identifier", "value", "algorithm", "href", "media-type"])
      if (record[name] !== undefined && typeof record[name] !== "string") fail(c.id, `arguments.${name} is not a string`);
    for (const name of ["document-ids", "hashes", "rlinks"])
      if (record[name] !== undefined && !Array.isArray(record[name])) fail(c.id, `arguments.${name} is not an array`);
    const required = c.operation === "build-hash" ? "value" : c.operation === "build-rlink" ? "href" : undefined;
    if (required !== undefined && typeof record[required] !== "string") {
      fail(c.id, `a ${c.operation} case needs arguments with a string ${required}`);
      return;
    }
    const results = [c["expected-uuid"], c["expected-element"], category].filter((value) => value !== undefined).length;
    if (results !== 1 || (c.operation !== "build-resource" && c["expected-uuid"] !== undefined)) {
      fail(c.id, `a ${c.operation} case needs exactly one of ${c.operation === "build-resource" ? "expected-uuid, " : ""}expected-element and expected-category`);
      return;
    }
    const withoutUndefined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined));
    let element: Record<string, unknown>;
    let validate: ValidateFunction;
    if (c.operation === "build-hash") {
      element = withoutUndefined({ algorithm: args.algorithm ?? "SHA-256", value: args.value });
      validate = v.validateHash;
    } else if (c.operation === "build-rlink") {
      element = withoutUndefined({ href: args.href, "media-type": args["media-type"], hashes: args.hashes });
      validate = v.validateRlink;
    } else {
      const generated = args.identifier === undefined && (args.key === undefined || args.key === "");
      const uuid = args.identifier ?? (args.key ? uuidV5(KEY_NAMESPACE, args.key) : GENERATED_UUID);
      element = withoutUndefined({ uuid, title: args.title, rlinks: args.rlinks, "document-ids": args["document-ids"] });
      validate = v.validateResource;
      if (c["expected-element"] !== undefined && args.key !== undefined) fail(c.id, "a build-resource case with expected-element has no key");
      if (generated && c["expected-element"] !== undefined && typeof c["expected-element"] === "object" && c["expected-element"] !== null && Object.hasOwn(c["expected-element"], "uuid") && args.identifier === undefined)
        fail(c.id, "the identifier is generated, so expected-element has no uuid");
      if (generated && args.key === undefined && c["expected-element"] !== undefined) {
        const valid = validate(element);
        if (!valid) fail(c.id, `the element is not valid: ${JSON.stringify(validate.errors)}`);
        expectNone(c, manifestFailures("back-matter-resource", element, valid));
        delete element.uuid;
        compareElement(c, element, c["expected-element"], fail);
        return;
      }
      if (c["expected-uuid"] !== undefined) {
        if (args.key === undefined || args.key === "") fail(c.id, "the key is empty, so the builder reports an error");
        if (args.identifier !== undefined) fail(c.id, "the case has a key and an identifier, so the builder reports an error");
        else if (args.key && uuidV5(KEY_NAMESPACE, args.key) !== c["expected-uuid"])
          fail(c.id, `expected-uuid is ${c["expected-uuid"]}, but BMB-004 gives ${uuidV5(KEY_NAMESPACE, args.key)}`);
        return;
      }
    }
    const valid = validate(element) as boolean;
    const failures = manifestFailures(TYPE_OF[c.operation], element, valid);
    if (c["expected-element"] !== undefined) {
      if (!valid) fail(c.id, `the element is not valid: ${JSON.stringify(validate.errors)}`);
      expectNone(c, failures);
      compareElement(c, element, c["expected-element"], fail);
      return;
    }
    if (category !== "builder-error") fail(c.id, `a ${c.operation} case has the category builder-error`);
    // CNS-020: an element that conforms to the schema and fails the manifest is invalid input (BMB-005), and the case lists the failures.
    if (failures.length > 0 || c["expected-constraints"] !== undefined) expectFailures(c, failures);
    if (c.operation !== "build-resource") {
      if (valid && failures.length === 0) fail(c.id, "the element is valid and meets the constraint manifest, so the builder reports no error");
      return;
    }
    const emptyKey = args.key === "" && args.identifier === undefined;
    const keyAndIdentifier = args.key !== undefined && args.key !== "" && args.identifier !== undefined && UUID_V4_OR_V5.test(args.identifier);
    if ([emptyKey, keyAndIdentifier, !valid, failures.length > 0].filter(Boolean).length !== 1)
      fail(c.id, "the case needs one fault: an empty key with no identifier, a key with a valid identifier, an element that is not valid, or an element that fails the constraint manifest");
  };
}
function compareElement(c: Case, element: unknown, expected: unknown, fail: (id: string, message: string) => void) {
  if (canonicalize(JSON.stringify(element)) !== canonicalize(JSON.stringify(expected)))
    fail(c.id, `expected-element is not the element that the arguments give: ${JSON.stringify(element)}`);
}

function main(write: boolean): number {
  const failures: string[] = [];
  const fail = (id: string, message: string) => failures.push(`[corpus] ${id}: ${message}`);
  const constraints = CorpusConstraints.load(RELEASE);
  const coveredEntries = new Set<number>();
  const { expectFailures, expectNone } = expectations(fail, coveredEntries);
  const checkBuilder = checkBuilderFactory(constraints, { expectFailures, expectNone }, fail);

  const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8")) as {
    $id: string;
    definitions: Record<string, unknown>;
    oneOf: { required?: string[] }[];
  };
  checkSchemaForReader(schema);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(schema);
  const validateDocument = ajv.getSchema(schema.$id) as ValidateFunction;
  // The root keys of PRS-013: each required key of a root `oneOf` branch, other than `$schema`, selects that branch.
  const branchOfRootKey = new Map<string, ValidateFunction>();
  schema.oneOf.forEach((branch, i) => {
    const validate = ajv.getSchema(`${schema.$id}#/oneOf/${i}`) as ValidateFunction;
    for (const key of branch.required ?? []) if (key !== "$schema") branchOfRootKey.set(key, validate);
  });
  if ([...branchOfRootKey.keys()].sort().join() !== [...DOCUMENT_TYPES].sort().join())
    fail(SCHEMA, "the root keys of the oneOf branches are not the eight document types");
  const elementValidator = (type: string): ValidateFunction | undefined => {
    const keys = Object.keys(schema.definitions).filter((key) => key.split(":")[1] === type);
    return keys.length === 1 ? ajv.getSchema(`${schema.$id}#/definitions/${keys[0]}`) : undefined;
  };

  // The rlink and resource have no top-level definition. They are item schemas of the back-matter definition.
  const resourceItems = `${schema.$id}#/definitions/oscal-complete-oscal-metadata:back-matter/properties/resources/items`;
  const validateResource = ajv.getSchema(resourceItems);
  const validateRlink = ajv.getSchema(`${resourceItems}/properties/rlinks/items`);
  const validateHash = elementValidator("hash");
  if (!validateResource || !validateRlink || !validateHash) fail(SCHEMA, "the hash, rlink, or resource schema is missing");

  // The element-type names of ELV-002: one for each type of the naming manifest, in code-point order.
  const manifest = JSON.parse(fs.readFileSync(`manifest/${RELEASE}/names.json`, "utf8")) as { types: { name: string }[] };
  const typeNames = new Map<string, string>();
  for (const { name } of manifest.types) {
    const elementType = kebab(name);
    const other = typeNames.get(elementType);
    if (other !== undefined) fail(`manifest/${RELEASE}/names.json`, `${other} and ${name} give the element type ${elementType}`);
    typeNames.set(elementType, name);
  }
  const elementTypes = [...typeNames.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const index = JSON.parse(fs.readFileSync(`${ROOT}/cases.json`, "utf8")) as {
    "oscal-release": string;
    categories: string[];
    cases: Case[];
  };
  if (index["oscal-release"] !== RELEASE) fail("cases.json", `oscal-release is not ${RELEASE}`);
  if (Object.hasOwn(index, "defect-twins"))
    fail("cases.json", "the index has a defect-twins field. Each binding keeps its own expected failures (VER-006).");
  // The namespace of BMB-004 (check 15).
  if (uuidV5(URL_NAMESPACE, KEY_NAMESPACE_URL) !== KEY_NAMESPACE)
    fail("BMB-004", `the namespace ${KEY_NAMESPACE} is not the UUID version 5 of ${KEY_NAMESPACE_URL}`);
  const backMatterSpec = fs.readFileSync("openspec/specs/backmatter-builders/spec.md", "utf8");
  const bmb004 = /^### Requirement: BMB-004 [\s\S]*?(?=^### |(?![\s\S]))/m.exec(backMatterSpec)?.[0] ?? "";
  if (!bmb004.includes(KEY_NAMESPACE)) fail("BMB-004", `the text of BMB-004 does not contain the namespace ${KEY_NAMESPACE}`);
  const keysDocument = fs.readFileSync("docs/back-matter-keys.md", "utf8");
  for (const value of [KEY_NAMESPACE_URL, KEY_NAMESPACE])
    if (!keysDocument.includes(value)) fail("docs/back-matter-keys.md", `the document does not contain ${value}`);
  const ids = specIdentifiers();
  const jsonExpected = new Set(index.cases.filter((c) => c.operation === "round-trip").map((c) => c.expected));
  const seen = new Set<string>();
  const used = new Set<string>();
  const covered = new Set<string>();

  for (const c of index.cases) {
    if (seen.has(c.id)) fail(c.id, "the id is not unique");
    seen.add(c.id);
    if (!OPERATIONS.includes(c.operation)) fail(c.id, `unknown operation "${c.operation}"`);
    if (!Array.isArray(c.requirements) || c.requirements.length === 0) fail(c.id, "cites no requirement");
    for (const req of c.requirements ?? []) {
      if (!ID.test(req)) fail(c.id, `"${req}" is not a requirement or scenario identifier`);
      else if (!ids.has(req)) fail(c.id, `${req} names no heading in the specs`);
    }
    if (Object.hasOwn(c, "known-defects"))
      fail(c.id, "the case has a known-defects field. Each binding keeps its own expected failures (VER-006).");
    const max = c["expected-max-failures"];
    if (max !== undefined) {
      const min = c["expected-min-failures"];
      if (c.operation !== "parse") fail(c.id, "expected-max-failures applies only to a parse case");
      if (!Number.isInteger(max) || max < 1) fail(c.id, "expected-max-failures is not an integer of 1 or more");
      else if (min !== undefined && max < min) fail(c.id, "expected-max-failures is less than expected-min-failures");
    }
    const category = c["expected-category"];
    if (category !== undefined) {
      if (!index.categories.includes(category)) fail(c.id, `unknown category "${category}"`);
      covered.add(category);
    }
    const isBuilder = BUILDERS.includes(c.operation);
    if (!isBuilder) {
      if (c.arguments !== undefined) fail(c.id, "only a builder case has arguments");
      if (c["expected-element"] !== undefined) fail(c.id, "only a builder case has expected-element");
    }
    if (c.operation !== "build-resource" && c["expected-uuid"] !== undefined)
      fail(c.id, "only a build-resource case has expected-uuid");
    const listed = c["expected-constraints"];
    if (listed !== undefined) {
      if (c.operation !== "parse" && c.operation !== "validate-element" && !isBuilder)
        fail(c.id, "expected-constraints applies only to a parse, validate-element, or builder case");
      if (!Array.isArray(listed) || listed.length === 0 || listed.some((x) => typeof x !== "string"))
        fail(c.id, "expected-constraints is not a list of one or more identifiers");
    }
    if (isBuilder) {
      if (validateResource && validateRlink && validateHash) checkBuilder(c, { validateResource, validateRlink, validateHash });
      continue;
    }
    if (c.operation === "element-types") {
      if (c.input !== undefined) fail(c.id, "an element-types case has no input");
      if (!c.expected) {
        fail(c.id, "an element-types case needs an expected file");
        continue;
      }
      used.add(c.expected);
      const canonical = canonicalize(JSON.stringify(elementTypes));
      const expectedPath = path.join(ROOT, c.expected);
      if (write) {
        fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
        fs.writeFileSync(expectedPath, canonical);
      }
      if (!fs.existsSync(expectedPath) || fs.readFileSync(expectedPath, "utf8") !== canonical)
        fail(c.id, `${c.expected} is not the canonical form of the element-type list. Run \`npm run corpus:write\`.`);
      continue;
    }
    if (c.input === undefined) {
      fail(c.id, "the case has no input");
      continue;
    }
    const inputPath = path.join(ROOT, c.input);
    if (c.operation !== "parse-file" && !(c.operation === "facade" && category !== undefined)) {
      used.add(c.input);
      if (!fs.existsSync(inputPath)) {
        fail(c.id, `input ${c.input} does not exist`);
        continue;
      }
    }

    const form = c["input-form"];
    if (form !== undefined && !(form === "bytes" || (form === "path" && c.operation === "facade")))
      fail(c.id, `input-form "${form}" is not valid for a ${c.operation} case`);

    switch (c.operation) {
      case "round-trip": {
        const bytes = fs.readFileSync(inputPath);
        const doc: unknown = JSON.parse(bytes.toString("utf8"));
        if (!validateDocument(doc)) fail(c.id, `input is not valid: ${ajv.errorsText(validateDocument.errors)}`);
        else expectNone(c, constraints.ofDocument(doc));
        if (!c["document-type"] || !Object.hasOwn(doc as object, c["document-type"]))
          fail(c.id, `input root is not document-type "${c["document-type"]}"`);
        if (c.source && sha256(bytes) !== c.source.sha256) fail(c.id, "input sha256 does not match the source sha256");
        if (!c.expected) {
          fail(c.id, "a round-trip case needs an expected file");
          break;
        }
        used.add(c.expected);
        const canonical = canonicalize(bytes.toString("utf8"));
        const expectedPath = path.join(ROOT, c.expected);
        if (write) {
          fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
          fs.writeFileSync(expectedPath, canonical);
        }
        if (!fs.existsSync(expectedPath) || fs.readFileSync(expectedPath, "utf8") !== canonical)
          fail(c.id, `${c.expected} is not the canonical form of the input. Run \`npm run corpus:write\`.`);
        break;
      }
      case "parse": {
        const bytes = fs.readFileSync(inputPath);
        let text: string;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
          if (c["input-form"] !== "bytes") fail(c.id, 'input is not UTF-8, so input-form must be "bytes"');
          break;
        }
        let doc: unknown;
        try {
          doc = JSON.parse(text);
        } catch {
          break;
        }
        if (validateDocument(doc)) {
          if (c["expected-constraints"] === undefined) fail(c.id, "input is valid against the schema and the case has no expected-constraints, so parsing it is not an error");
          else expectFailures(c, constraints.ofDocument(doc));
          break;
        }
        if (c["expected-constraints"] !== undefined) fail(c.id, "the input does not conform to the schema, so the case has no expected-constraints");
        const min = c["expected-min-failures"];
        if (min !== undefined && (validateDocument.errors?.length ?? 0) < min)
          fail(c.id, `the schema reports ${validateDocument.errors?.length} failures, fewer than ${min}`);
        if (max !== undefined && doc !== null && typeof doc === "object" && !Array.isArray(doc)) {
          const rootKeys = Object.keys(doc).filter((key) => branchOfRootKey.has(key));
          const branch = branchOfRootKey.get(rootKeys[0]);
          if (rootKeys.length >= 2) fail(c.id, "the input has two or more root keys, so PRS-013 sets no maximum");
          else if (branch !== undefined && branch(doc))
            fail(c.id, `the input is valid against the ${rootKeys[0]} branch, so its fault is not in that type`);
        }
        break;
      }
      case "parse-typed": {
        const doc = JSON.parse(fs.readFileSync(inputPath, "utf8")) as object;
        if (!validateDocument(doc)) fail(c.id, "input is not valid, so the case would not isolate the type check");
        else expectNone(c, constraints.ofDocument(doc));
        if (!DOCUMENT_TYPES.includes(c["document-type"] ?? "")) fail(c.id, "document-type is not an OSCAL type");
        else if (Object.hasOwn(doc, c["document-type"] ?? "")) fail(c.id, "input is the requested document type");
        break;
      }
      case "parse-file":
        if (category === "not-found") {
          if (fs.existsSync(inputPath)) fail(c.id, `${c.input} exists, so it cannot test not-found`);
        } else if (category === "read-error") {
          if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isDirectory())
            fail(c.id, `${c.input} is not a directory, so it cannot test read-error`);
        } else fail(c.id, "a parse-file case has the category not-found or read-error");
        break;
      case "facade": {
        if ((category === undefined) === (c.expected === undefined)) {
          fail(c.id, "a facade case needs exactly one of expected and expected-category");
          break;
        }
        if (category !== undefined) {
          if (category !== "not-found") fail(c.id, "a facade case with expected-category has the category not-found");
          if (form !== "path") fail(c.id, 'a facade case with expected-category has input-form "path"');
          if (fs.existsSync(inputPath)) fail(c.id, `${c.input} exists, so it cannot test not-found`);
          break;
        }
        const expectedFile = c.expected as string;
        used.add(expectedFile);
        const text = fs.readFileSync(inputPath, "utf8");
        const doc: unknown = JSON.parse(text);
        if (!validateDocument(doc)) fail(c.id, `input is not valid: ${ajv.errorsText(validateDocument.errors)}`);
        else expectNone(c, constraints.ofDocument(doc));
        const rootKeys = doc !== null && typeof doc === "object" ? Object.keys(doc) : [];
        if (rootKeys.length !== 1 || rootKeys[0] !== c["document-type"])
          fail(c.id, `the root keys of the input are not only document-type "${c["document-type"]}"`);
        if (!jsonExpected.has(expectedFile)) fail(c.id, `${expectedFile} is not the expected file of a round-trip case`);
        const expectedPath = path.join(ROOT, expectedFile);
        if (!fs.existsSync(expectedPath) || fs.readFileSync(expectedPath, "utf8") !== canonicalize(text))
          fail(c.id, `${expectedFile} is not the canonical form of the input`);
        break;
      }
      case "assessment-period": {
        const doc = JSON.parse(fs.readFileSync(inputPath, "utf8")) as Record<string, unknown>;
        const supported = Object.hasOwn(doc, "assessment-plan") || Object.hasOwn(doc, "assessment-results");
        const expectedPeriod = c["expected-period"];
        if ((category === undefined) === (expectedPeriod === undefined)) {
          fail(c.id, "an assessment-period case needs exactly one of expected-category and expected-period");
          break;
        }
        if (expectedPeriod === undefined) {
          if (supported) fail(c.id, "input supports the assessment period, so it cannot test access-error");
          break;
        }
        if (!validateDocument(doc)) fail(c.id, `input is not valid: ${ajv.errorsText(validateDocument.errors)}`);
        else expectNone(c, constraints.ofDocument(doc));
        if (!supported) {
          fail(c.id, "input is not an Assessment Plan or Assessment Results, so it has no assessment period");
          break;
        }
        const period = assessmentPeriod(doc);
        for (const bound of ["start", "end"] as const) {
          const computed = period[bound];
          if (computed === undefined || normalizeDatetime(computed) !== expectedPeriod[bound])
            fail(c.id, `expected-period ${bound} is ${expectedPeriod[bound]}, but FAC-005 to FAC-007 give ${computed}`);
        }
        break;
      }
      case "validate-element": {
        const listed = elementTypes.includes(c["element-type"] ?? "");
        if (category === "unknown-element-type" ? listed : c["expected-valid"] !== undefined && !listed)
          fail(c.id, `element type "${c["element-type"]}" ${listed ? "is" : "is not"} in the element-type list`);
        const validate = elementValidator(c["element-type"] ?? "");
        if (category === "unknown-element-type") {
          if (validate) fail(c.id, `element type "${c["element-type"]}" exists`);
          break;
        }
        if (!validate) {
          fail(c.id, `element type "${c["element-type"]}" has no unique schema definition`);
          break;
        }
        const element: unknown = JSON.parse(fs.readFileSync(inputPath, "utf8"));
        const valid = validate(element);
        if (!valid) {
          if (c["expected-valid"] !== false) fail(c.id, `the schema reports valid=false, not ${c["expected-valid"]}: ${ajv.errorsText(validate.errors)}`);
          if (c["expected-constraints"] !== undefined) fail(c.id, "the input does not conform to the schema, so the case has no expected-constraints");
        } else if (c["expected-valid"] === true) {
          if (c["expected-constraints"] !== undefined) fail(c.id, "expected-valid is true, so the case has no expected-constraints");
          expectNone(c, constraints.ofElement(c["element-type"] ?? "", element));
        } else if (c["expected-constraints"] === undefined) fail(c.id, "the schema reports valid=true, not false, and the case has no expected-constraints");
        else expectFailures(c, constraints.ofElement(c["element-type"] ?? "", element));
        break;
      }
      case "yaml-round-trip": {
        const bytes = fs.readFileSync(inputPath);
        const result = readYaml(bytes, validateDocument);
        if (!result.ok) {
          fail(c.id, `the YAML reader rejects the input (${result.fault}): ${result.detail}`);
          break;
        }
        expectNone(c, constraints.ofDocument(result.value));
        if (!c["document-type"] || !Object.hasOwn(result.value as object, c["document-type"]))
          fail(c.id, `input root is not document-type "${c["document-type"]}"`);
        if (c.source && sha256(bytes) !== c.source.sha256) fail(c.id, "input sha256 does not match the source sha256");
        if (!c.expected) {
          fail(c.id, "a yaml-round-trip case needs an expected file");
          break;
        }
        used.add(c.expected);
        const canonical = canonicalize(result.json);
        const expectedPath = path.join(ROOT, c.expected);
        if (c.source) {
          // A copied NIST example uses the expected file of its JSON twin, so the reader does not set the expectation.
          if (!jsonExpected.has(c.expected)) fail(c.id, `${c.expected} is not the expected file of a round-trip case`);
        } else if (write) {
          fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
          fs.writeFileSync(expectedPath, canonical);
        }
        if (!fs.existsSync(expectedPath) || fs.readFileSync(expectedPath, "utf8") !== canonical)
          fail(c.id, `${c.expected} is not the canonical form of the YAML input`);
        break;
      }
      case "yaml-parse": {
        const result = readYaml(fs.readFileSync(inputPath), validateDocument);
        if (result.ok) {
          fail(c.id, "the YAML reader accepts the input, so parsing it is not an error");
          break;
        }
        if (result.fault === "not-utf-8" && c["input-form"] !== "bytes")
          fail(c.id, 'input is not UTF-8, so input-form must be "bytes"');
        if (!c.notes?.includes(`\`${result.fault}\``))
          fail(c.id, `the notes do not name the fault code \`${result.fault}\` of the reader: ${result.detail}`);
        const min = c["expected-min-failures"];
        if (min !== undefined && result.locations.length < min)
          fail(c.id, `the reader reports ${result.locations.length} failing locations, fewer than ${min}`);
        break;
      }
    }
  }

  for (const category of index.categories) {
    if (!covered.has(category)) fail("cases.json", `category ${category} has no case`);
  }
  for (const file of corpusFiles()) {
    if (!used.has(file)) fail(file, "no case uses this file");
  }
  for (const message of uncoveredEntries(constraints.entries, coveredEntries)) fail("cases.json", message);

  for (const failure of failures) console.error(failure);
  console.log(
    failures.length
      ? `\n${failures.length} corpus failure(s)`
      : `corpus: ok (${index.cases.length} cases, ${covered.size} error categories)`,
  );
  return failures.length ? 1 : 0;
}

/** The rule scenarios of check 17 (CNS-020). They run the reference evaluator on documents made for the test. */
function selfTest(): number {
  const constraints = CorpusConstraints.load(RELEASE);
  const metadata = { title: "t", "last-modified": "2024-01-02T03:04:05Z", version: "1", "oscal-version": RELEASE };
  const catalog = (props: object[]) => ({ catalog: { uuid: "00000000-0000-4000-8000-000000000001", metadata, controls: [{ id: "c", title: "t", props, parts: [{ name: "statement" }] }] } });
  const bad = constraints.ofDocument(catalog([{ name: "bogus", value: "1" }]));
  const reportable = constraints.entries.map((e, i) => (e.reportable ? i : -1)).filter((i) => i >= 0);
  const hashFailures = constraints.ofElement("hash", { algorithm: "SHA-256", value: "abc" });
  const messages: string[] = [];
  const { expectFailures, expectNone } = expectations((id, message) => messages.push(`${id}: ${message}`), new Set());
  const run = (check: (c: Case, f: EntryFailure[]) => void, c: Partial<Case>, failures: EntryFailure[]) => {
    messages.length = 0;
    check({ id: "t", operation: "parse", requirements: [], ...c }, failures);
    return messages.length;
  };
  const cases: Array<[string, () => boolean | string]> = [
    ["a document with an unknown property name fails two closed entries, each with its id", () => JSON.stringify(bad.map((f) => f.id).sort()) === '["oscal-control-prop-name","oscal-metadata-prop-name-values"]' || JSON.stringify(bad)],
    ["a valid document fails no entry", () => constraints.ofDocument(catalog([{ name: "label", value: "1" }])).length === 0],
    ["CNS-020: the listed identifiers equal the failures", () => constraintMismatch(["oscal-metadata-prop-name-values", "oscal-control-prop-name"], bad) === undefined],
    ["CNS-020.01: a reportable entry without a case fails the check, one message for each entry", () => uncoveredEntries(constraints.entries, new Set()).length === reportable.length && uncoveredEntries(constraints.entries, new Set(reportable)).length === 0 && uncoveredEntries(constraints.entries, new Set(reportable.slice(1))).length === 1],
    ["CNS-020: an entry that is not reportable needs no case", () => reportable.length < constraints.entries.length && uncoveredEntries(constraints.entries, new Set(reportable)).length === 0],
    ["CNS-020: a wrong identifier fails the check", () => constraintMismatch(["oscal-metadata-prop-name-values", "oscal-control-prop-names"], bad) !== undefined],
    ["CNS-020: a missing repeat of an identifier fails the check", () => constraintMismatch(["oscal-control-prop-name"], bad) !== undefined && constraintMismatch(["oscal-control-prop-name", "oscal-control-prop-name", "oscal-metadata-prop-name-values"], bad) !== undefined],
    ["CNS-020: an identifier repeated for two failures passes", () => constraintMismatch(["a", "a"], [{ entry: 0, id: "a", location: "$" }, { entry: 1, id: "a", location: "$" }]) === undefined && constraintMismatch(["a"], [{ entry: 0, id: "a", location: "$" }, { entry: 1, id: "a", location: "$" }]) !== undefined],
    ["CNS-020: a case with failures that lists none fails the check", () => constraintMismatch(undefined, bad) !== undefined],
    ["CNS-020.02: a valid input that fails an entry fails the check", () => run(expectNone, {}, bad) === 1 && run(expectNone, {}, []) === 0],
    ["CNS-020: a listed failure that does not occur fails the check", () => run(expectFailures, { "expected-constraints": ["oscal-control-prop-name"] }, []) === 1],
    ["CNS-018.02: a hash element with a short value fails the entry of its algorithm", () => hashFailures.map((f) => f.id).join() === "oscal-check-hash-length-SHA2-3-256" || JSON.stringify(hashFailures)],
    ["CNS-018: an element type without a definition gives no failure", () => constraints.ofElement("no-such-type", {}).length === 0],
  ];
  let failed = 0;
  for (const [name, fn] of cases) {
    let out: boolean | string;
    try {
      out = fn();
    } catch (error) {
      out = `threw ${(error as Error).stack}`;
    }
    if (out !== true) failed++;
    console.log(`${out === true ? "PASS" : "FAIL"}  ${name}${out === true || out === false ? "" : `\n      ${out}`}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  return failed ? 1 : 0;
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "check-corpus.ts") {
  process.exit(process.argv.includes("--self-test") ? selfTest() : main(process.argv.includes("--write")));
}
