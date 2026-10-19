/**
 * Generates and checks the naming manifest of each OSCAL release in the store (openspec/specs/naming-manifest).
 *
 * The inputs of manifest/<release>/names.json are schemas/<release>/oscal_complete_schema.json,
 * manifest/<release>/overrides.json, and the names.json of the previous OSCAL release in the store, when one exists.
 * Releases run in release order, so each release can pin the names of the one before it.
 *
 *   npm run names:write        regenerate each names.json
 *   npm run names:check        validate each file, regenerate in memory, and compare with the committed names.json
 *   npm run names:self-test    run the rule scenarios on small schemas in memory
 */
import fs from "node:fs";
import path from "node:path";
import {
  derive,
  emptyOverrides,
  parsePointer,
  resolvePointer,
  serialize,
  sha256,
  storeReleases,
  validateManifest,
  validateOverrides,
  type DeriveInput,
  type Json,
  type Manifest,
  type Overrides,
} from "./names-lib.js";

const SCHEMA_FILE = "oscal_complete_schema.json";

const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(file, "utf8"));

interface ReleaseRun {
  release: string;
  failures: string[];
  dropped: string[];
  output?: string;
}

/** Derives the manifest of each release in order. A release reads the committed names.json of the release before it. */
export function runReleases(root = "."): ReleaseRun[] {
  const runs: ReleaseRun[] = [];
  let previous: { release: string; manifest?: Manifest } | undefined;
  for (const release of storeReleases(root)) {
    const failures: string[] = [];
    const schemaPath = path.join(root, "schemas", release, SCHEMA_FILE);
    const overridesPath = path.join(root, "manifest", release, "overrides.json");
    if (!fs.existsSync(schemaPath)) {
      runs.push({ release, failures: [`[schema] ${schemaPath} does not exist`], dropped: [] });
      continue;
    }
    const schemaBytes = fs.readFileSync(schemaPath);
    const overrides = readJson(overridesPath) as Overrides;
    failures.push(...validateOverrides(overrides).map((f) => `${overridesPath}: ${f}`));
    if (overrides["oscal-release"] !== release) failures.push(`${overridesPath}: oscal-release is not ${release}`);
    let prior: Manifest | undefined;
    if (previous) {
      const file = path.join(root, "manifest", previous.release, "names.json");
      const priorSchema = path.join(root, "schemas", previous.release, SCHEMA_FILE);
      if (fs.existsSync(file) && fs.existsSync(priorSchema)) {
        const data = readJson(file);
        const problems = validateManifest(data, fs.readFileSync(priorSchema), previous.release);
        if (problems.length) failures.push(...problems.map((f) => `previous manifest ${file}: ${f}`));
        else prior = data as Manifest;
      }
    }
    if (failures.length) {
      runs.push({ release, failures, dropped: [] });
      previous = { release };
      continue;
    }
    const input: DeriveInput = { release, schemaFile: SCHEMA_FILE, schemaBytes, overrides, previous: prior };
    const result = derive(input);
    runs.push({
      release,
      failures: result.failures,
      dropped: result.dropped,
      output: result.manifest ? serialize(result.manifest as unknown as Json) : undefined,
    });
    previous = { release };
  }
  return runs;
}

function main(mode: "write" | "check"): number {
  const runs = runReleases();
  let failed = 0;
  for (const run of runs) {
    const file = path.join("manifest", run.release, "names.json");
    for (const name of run.dropped) console.log(`[dropped] ${run.release}: ${name}`);
    if (run.failures.length || run.output === undefined) {
      for (const f of run.failures) console.error(`${run.release}: ${f}`);
      console.error(`${run.release}: ${run.failures.length} failure(s); ${file} was not ${mode === "write" ? "written" : "checked"}`);
      failed++;
      continue;
    }
    if (mode === "write") {
      fs.writeFileSync(file, run.output);
      console.log(`${run.release}: wrote ${file} (${(JSON.parse(run.output) as Manifest).types.length} types)`);
      continue;
    }
    const committed = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
    const schemaBytes = fs.readFileSync(path.join("schemas", run.release, SCHEMA_FILE));
    const problems = committed === undefined ? [`${file} does not exist`] : validateManifest(JSON.parse(committed), schemaBytes, run.release);
    if (committed !== undefined && committed !== run.output) {
      problems.push(`${file} differs from the generator output. Edit overrides.json and run npm run names:write.`);
    }
    for (const p of problems) console.error(`${run.release}: ${p}`);
    if (problems.length) failed++;
    else console.log(`${run.release}: ${file} matches the generator output`);
  }
  if (!runs.length) console.log("names: no release under manifest/ has an overrides.json");
  return failed ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Self-test

type Schema = { [key: string]: Json };
const ref = (key: string): Json => ({ $ref: `#/definitions/${key}` });
const obj = (properties: Schema, extra: Schema = {}): Json => ({ type: "object", additionalProperties: false, properties, ...extra });
const str: Json = { type: "string" };
const list = (items: Json): Json => ({ type: "array", minItems: 1, items });
const openEnum = (...values: string[]): Json => ({ anyOf: [ref("StringDatatype"), { enum: values }] });
const closedEnum = (...values: string[]): Json => ({ allOf: [ref("TokenDatatype"), { enum: values }] });

/** A small complete schema: one catalog document plus the given definitions. */
function schemaOf(definitions: Schema, documents: string[] = ["catalog"], extra: Schema = {}): string {
  const defs: Schema = {
    "json-schema-directive": { type: "string" },
    StringDatatype: { type: "string" },
    TokenDatatype: { type: "string" },
    "oscal-complete-oscal-catalog:catalog": obj({ uuid: str }),
    ...definitions,
  };
  const oneOf = documents.map((body) =>
    obj({ $schema: ref("json-schema-directive"), [body]: ref(`oscal-complete-oscal-catalog:${body}`) }, { required: [body] }),
  );
  return JSON.stringify({ $id: "test", oneOf, definitions: defs, ...extra });
}

const D = (key: string) => `#/definitions/${key}`;

function run(schema: string, overrides: Partial<Overrides> = {}, previous?: Manifest) {
  return derive({
    release: "1.2.3",
    schemaFile: SCHEMA_FILE,
    schemaBytes: schema,
    overrides: { ...emptyOverrides("1.2.3"), ...overrides },
    previous,
  });
}
const nameAt = (r: ReturnType<typeof run>, site: string) => r.manifest?.types.find((t) => t.sites.includes(site))?.name;
const entryNamed = (r: ReturnType<typeof run>, name: string) => r.manifest?.types.find((t) => t.name === name);

function selfTest(): number {
  const cases: Array<[string, () => boolean | string]> = [];
  const test = (name: string, fn: () => boolean | string) => cases.push([name, fn]);
  const failsWith = (r: ReturnType<typeof run>, needle: string) =>
    r.manifest === undefined && r.failures.some((f) => f.includes(needle)) ? true : JSON.stringify(r.failures);

  // Task 2.1: pointers.
  test("pointer: escapes decode", () => JSON.stringify(parsePointer("#/a~1b/c~0d")) === '["a/b","c~d"]');
  test("pointer: percent is rejected", () => parsePointer("#/a%20b") === undefined);
  test("pointer: missing slash is rejected", () => parsePointer("#a") === undefined);
  test("pointer: bad escape is rejected", () => parsePointer("#/~2") === undefined);
  test("pointer: inherited members do not resolve", () => {
    const root = JSON.parse('{"a": {}}') as Json;
    return ["#/constructor", "#/toString", "#/__proto__", "#/a/hasOwnProperty"].every((p) => resolvePointer(root, p) === undefined);
  });
  test("pointer: own __proto__ and constructor keys resolve", () => {
    const root = JSON.parse('{"__proto__": {"x": true}, "constructor": {}}') as Json;
    return resolvePointer(root, "#/__proto__") !== undefined && resolvePointer(root, "#/constructor") !== undefined;
  });
  test("pointer: ~0 and ~1 keys resolve as own keys", () => {
    const root = JSON.parse('{"a~b": {}, "a/b": {}}') as Json;
    return resolvePointer(root, "#/a~0b") !== undefined && resolvePointer(root, "#/a~1b") !== undefined;
  });
  test("pointer: array index rules", () => {
    const root = JSON.parse('{"a": [{}, {}]}') as Json;
    return resolvePointer(root, "#/a/1") !== undefined && resolvePointer(root, "#/a/01") === undefined && resolvePointer(root, "#/a/2") === undefined;
  });
  test("pointer: scalar target does not resolve", () => resolvePointer(JSON.parse('{"a": 1}') as Json, "#/a") === undefined);

  // Task 2.3: naming rules.
  const param = "oscal-complete-oscal-control-common:parameter";
  test("MDL-001.01 local name maps to PascalCase", () => nameAt(run(schemaOf({ [param]: obj({ id: str }) })), D(param)) === "Parameter");
  test("MDL-001.02 schema reorder does not change names", () => {
    const a = run(schemaOf({ "oscal-complete-oscal-catalog:profile": obj({}) }, ["catalog", "profile"]));
    const b = run(schemaOf({ "oscal-complete-oscal-catalog:profile": obj({}) }, ["profile", "catalog"]));
    return entryNamed(a, "CatalogDocument") !== undefined && entryNamed(b, "CatalogDocument") !== undefined && entryNamed(b, "ProfileDocument") !== undefined;
  });
  const poam = "oscal-complete-oscal-poam:poam-item";
  const originsItems = `${D(poam)}/properties/origins/items`;
  test("MDL-001.03 list items use the singular local name", () =>
    nameAt(run(schemaOf({ [poam]: obj({ origins: list(obj({ actor: str })) }) }), { "local-names": { [originsItems]: "origin" } }), originsItems) ===
    "PoamItemOrigin");
  test("MDL-002.01 wrapper named from its body field", () => {
    const r = run(schemaOf({ "oscal-complete-oscal-catalog:system-security-plan": obj({}) }, ["system-security-plan"]));
    const e = entryNamed(r, "SystemSecurityPlanDocument");
    return e?.kind === "document" && e["body-field"] === "system-security-plan";
  });
  test("MDL-002.02 schema directive field is excluded", () => entryNamed(run(schemaOf({})), "CatalogDocument")?.["body-field"] === "catalog");
  test("document union lists the wrappers", () =>
    JSON.stringify(entryNamed(run(schemaOf({ "oscal-complete-oscal-catalog:profile": obj({}) }, ["profile", "catalog"])), "OscalDocument")?.members) ===
    '["CatalogDocument","ProfileDocument"]');
  const cdci = "oscal-complete-oscal-component-definition:control-implementation";
  const sspci = "oscal-complete-oscal-ssp:control-implementation";
  test("MDL-005.01 colliding short names get module-prefixed names", () => {
    const r = run(schemaOf({ [cdci]: obj({ a: str }), [sspci]: obj({ b: str }) }));
    return nameAt(r, D(cdci)) === "ComponentDefinitionControlImplementation" && nameAt(r, D(sspci)) === "SspControlImplementation";
  });
  const sspStatus = "oscal-complete-oscal-ssp:status";
  const sysComp = "oscal-complete-oscal-implementation-common:system-component";
  const finding = "oscal-complete-oscal-assessment-common:finding-target";
  test("MDL-005.03 a definition that clashes only with an inline type keeps its local name", () => {
    const r = run(schemaOf({ [sspStatus]: obj({ state: str }), [sysComp]: obj({ status: obj({ state: str }) }) }));
    return nameAt(r, D(sspStatus)) === "Status" && nameAt(r, `${D(sysComp)}/properties/status`) === "SystemComponentStatus";
  });
  const merge = "oscal-complete-oscal-profile:merge";
  const mergeSchema = schemaOf({
    [merge]: {
      type: "object",
      anyOf: [
        { properties: { combine: obj({}), flat: obj({}) }, required: ["flat"] },
        { properties: { combine: obj({}), "as-is": { type: "boolean" } }, required: ["as-is"] },
        { properties: { combine: obj({}), custom: obj({ groups: str }) }, required: ["custom"] },
      ],
    },
  });
  test("MDL-006.01 merge branches are named With their property", () => {
    const r = run(mergeSchema);
    const u = entryNamed(r, "Merge");
    return (
      u?.kind === "union" &&
      JSON.stringify(u.variants) ===
        '[{"type":"MergeWithAsIs","property":"as-is"},{"type":"MergeWithCustom","property":"custom"},{"type":"MergeWithFlat","property":"flat"}]'
    );
  });
  test("MDL-006 branch children use the union name", () => entryNamed(run(mergeSchema), "MergeCustom")?.sites.length === 1);
  test("MDL-013 combine copies in three branches merge into one type", () => entryNamed(run(mergeSchema), "MergeCombine")?.sites.length === 3);
  const group = "oscal-complete-oscal-catalog:group";
  test("MDL-006.02 branch named from its distinguishing property", () => {
    const r = run(
      schemaOf({
        [group]: {
          type: "object",
          anyOf: [{ properties: { title: str, groups: list(ref(group)) } }, { properties: { title: str, controls: list(str) } }],
        },
      }),
    );
    return nameAt(r, `${D(group)}/anyOf/0`) === "GroupWithGroups" && nameAt(r, `${D(group)}/anyOf/1`) === "GroupWithControls";
  });
  test("MDL-010.01 inline object named from its parent", () =>
    nameAt(run(schemaOf({ [sysComp]: obj({ status: obj({ state: str }) }) })), `${D(sysComp)}/properties/status`) === "SystemComponentStatus");
  test("MDL-010.02 two inline types with the same local name stay distinct", () => {
    const r = run(schemaOf({ [sysComp]: obj({ status: obj({ state: str }) }), [finding]: obj({ status: obj({ reason: str }) }) }));
    return nameAt(r, `${D(sysComp)}/properties/status`) === "SystemComponentStatus" && nameAt(r, `${D(finding)}/properties/status`) === "FindingTargetStatus";
  });
  const backMatter = "oscal-complete-oscal-metadata:back-matter";
  const resources = `${D(backMatter)}/properties/resources/items`;
  test("MDL-010.03 nested inline type uses the canonical name of its parent", () => {
    const r = run(schemaOf({ [backMatter]: obj({ resources: list(obj({ citation: obj({ text: str }) })) }) }), {
      "local-names": { [resources]: "resource" },
    });
    return nameAt(r, resources) === "BackMatterResource" && nameAt(r, `${resources}/properties/citation`) === "BackMatterResourceCitation";
  });
  const task = "oscal-complete-oscal-assessment-common:task";
  const timing = `${D(task)}/properties/timing`;
  const taskSchema = schemaOf({
    [task]: obj({
      timing: { type: "object", anyOf: [{ properties: { "on-date": obj({ date: str }) } }, { properties: { "at-frequency": obj({ unit: closedEnum("days", "hours") }) } }] },
    }),
  });
  test("MDL-010.04 inline type in a union branch uses the name of the union", () => {
    const r = run(taskSchema);
    return nameAt(r, timing) === "TaskTiming" && nameAt(r, `${timing}/anyOf/0/properties/on-date`) === "TaskTimingOnDate" && nameAt(r, `${timing}/anyOf/0`) === "TaskTimingWithOnDate";
  });
  const risk = "oscal-complete-oscal-assessment-common:risk";
  const riskLog = `${D(risk)}/properties/risk-log`;
  test("MDL-010.05 override name of a parent carries down", () => {
    const r = run(schemaOf({ [risk]: obj({ "risk-log": obj({ entries: list(obj({ start: str })) }) }) }), {
      names: { [riskLog]: "RiskLog" },
      "local-names": { [`${riskLog}/properties/entries/items`]: "entry" },
    });
    return nameAt(r, riskLog) === "RiskLog" && nameAt(r, `${riskLog}/properties/entries/items`) === "RiskLogEntry";
  });
  const hash = "oscal-complete-oscal-metadata:hash";
  test("MDL-011.01 enum named from owner and property", () =>
    nameAt(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) })), `${D(hash)}/properties/algorithm/anyOf/1`) === "HashAlgorithm");
  const sel = "oscal-complete-oscal-control-common:parameter-selection";
  test("MDL-011.02 closed enum gets a type", () => {
    const e = entryNamed(run(schemaOf({ [sel]: obj({ "how-many": closedEnum("one", "one-or-more") }) })), "ParameterSelectionHowMany");
    return e?.kind === "enum" && e.closed === true;
  });
  test("MDL-011.03 open enum is marked open", () => entryNamed(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) })), "HashAlgorithm")?.closed === false);
  const riskStatus = "oscal-complete-oscal-assessment-common:risk-status";
  test("MDL-011.04 enum held directly by a definition", () => {
    const e = entryNamed(run(schemaOf({ [riskStatus]: { anyOf: [ref("TokenDatatype"), { enum: ["open", "closed"] }] } })), "RiskStatus");
    return e?.kind === "enum" && e.closed === false && e.sites[0] === `${D(riskStatus)}/anyOf/1`;
  });
  const statusSchema = schemaOf({
    [sspStatus]: obj({ state: closedEnum("operational") }),
    [sysComp]: obj({ status: obj({ state: closedEnum("under-development") }) }),
    [finding]: obj({ status: obj({ state: closedEnum("satisfied"), reason: openEnum("pass") }) }),
  });
  test("MDL-011.05 enums of an inline owner share its canonical name", () => {
    const r = run(statusSchema);
    return entryNamed(r, "FindingTargetStatusState") !== undefined && entryNamed(r, "FindingTargetStatusReason") !== undefined;
  });
  test("MDL-011.06 enums with the same owner local name stay distinct", () => {
    const r = run(statusSchema);
    return ["StatusState", "SystemComponentStatusState", "FindingTargetStatusState"].every((n) => entryNamed(r, n)?.sites.length === 1);
  });
  test("list item enum uses the singular name", () => {
    const obs = "oscal-complete-oscal-assessment-common:observation";
    const items = `${D(obs)}/properties/methods/items`;
    return nameAt(run(schemaOf({ [obs]: obj({ methods: list(openEnum("TEST")) }) }), { "local-names": { [items]: "method" } }), `${items}/anyOf/1`) === "ObservationMethod";
  });
  const mc = "oscal-complete-oscal-mapping:mapping-collection";
  const mapping = "oscal-complete-oscal-mapping-common:mapping";
  test("MDL-012.01 one-or-list property is a single-or-many type", () => {
    const r = run(schemaOf({ [mapping]: obj({ uuid: str }), [mc]: obj({ mappings: { anyOf: [ref(mapping), { type: "array", minItems: 1, items: ref(mapping) }] } }) }));
    const e = entryNamed(r, "MappingCollectionMappings");
    return e?.kind === "single-or-many" && e.item === "Mapping";
  });
  test("override name replaces a rule-derived name", () =>
    nameAt(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) }), { names: { [`${D(hash)}/properties/algorithm/anyOf/1`]: "DigestAlgorithm" } }), `${D(hash)}/properties/algorithm/anyOf/1`) ===
    "DigestAlgorithm");
  test("empty object definition is an object type", () => entryNamed(run(schemaOf({ "oscal-complete-oscal-control-common:include-all": obj({}) })), "IncludeAll")?.kind === "object");
  test("scalar definition has no entry", () => entryNamed(run(schemaOf({ "oscal-complete-oscal-metadata:remarks": str })), "Remarks") === undefined);
  test("lists of references need no singular name", () => run(schemaOf({ [hash]: obj({ links: list(ref(hash)) }) })).manifest !== undefined);

  // Task 2.4: merges.
  const parties = "oscal-complete-oscal-metadata:metadata";
  const partiesItems = `${D(parties)}/properties/parties/items`;
  const ext = obj({ scheme: openEnum("http://orcid.org/") });
  const partySchema = (other: Json) =>
    schemaOf({
      [parties]: obj({
        parties: list({ type: "object", anyOf: [{ properties: { addresses: list(str), "external-ids": list(ext) } }, { properties: { "location-uuids": list(str), "external-ids": list(other) } }] }),
      }),
    });
  const partyLocals = {
    [partiesItems]: "party",
    [`${partiesItems}/anyOf/0/properties/external-ids/items`]: "external-id",
    [`${partiesItems}/anyOf/1/properties/external-ids/items`]: "external-id",
  };
  test("MDL-013.03 copies in union branches merge", () => {
    const r = run(partySchema(ext), { "local-names": partyLocals });
    return entryNamed(r, "MetadataPartyExternalId")?.sites.length === 2 && entryNamed(r, "MetadataPartyExternalIdScheme")?.sites.length === 2;
  });
  const mp = "oscal-complete-oscal-mapping-common:mapping-provenance";
  const twoMethods = schemaOf({ [mapping]: obj({ method: closedEnum("human", "automation") }), [mp]: obj({ method: closedEnum("human", "automation") }) });
  test("MDL-013.04 equal enum values at unrelated places do not merge", () => {
    const r = run(twoMethods);
    return entryNamed(r, "MappingMethod")?.sites.length === 1 && entryNamed(r, "MappingProvenanceMethod")?.sites.length === 1;
  });
  test("explicit merge produces one type", () => {
    const sites = [`${D(mapping)}/properties/method/allOf/1`, `${D(mp)}/properties/method/allOf/1`];
    const e = entryNamed(run(twoMethods, { merges: [sites] }), "MappingMethod");
    return e?.sites.length === 2 && entryNamed(run(twoMethods, { merges: [sites] }), "MappingProvenanceMethod") === undefined;
  });

  // Task 2.5: guards.
  test("MDL-007.01 ambiguous wrapper aborts and names it", () => {
    const s = JSON.parse(schemaOf({})) as Schema;
    ((s.oneOf as Schema[])[0].properties as Schema).profile = str;
    return failsWith(run(JSON.stringify(s)), "#/oneOf/0");
  });
  test("MDL-007.02 wrapper count mismatch aborts", () => {
    const s = JSON.parse(schemaOf({})) as Schema;
    (s.oneOf as Json[]).push({ type: "string" });
    return failsWith(run(JSON.stringify(s)), "wrapper-count");
  });
  test("MDL-007.03 uncovered collisions are all reported", () => {
    const r = run(
      schemaOf({ [sysComp]: obj({ a: obj({}), b: obj({}) }) }),
      { names: { [`${D(sysComp)}/properties/a`]: "Same", [`${D(sysComp)}/properties/b`]: "Same" } },
    );
    // An unlucky concatenation: foo + bar-baz and foo-bar + baz both give FooBarBaz.
    const r2 = run(schemaOf({ "oscal-complete-oscal-x:foo": obj({ "bar-baz": obj({}) }), "oscal-complete-oscal-y:foo-bar": obj({ baz: obj({}) }) }));
    return failsWith(r, "Same names 2 types") === true && failsWith(r2, "FooBarBaz names 2 types");
  });
  test("MDL-007.03 every collision appears in one report", () => {
    const r = run(schemaOf({ [sysComp]: obj({ a: obj({}), b: obj({}), c: obj({}), d: obj({}) }) }), {
      names: {
        [`${D(sysComp)}/properties/a`]: "One",
        [`${D(sysComp)}/properties/b`]: "One",
        [`${D(sysComp)}/properties/c`]: "Two",
        [`${D(sysComp)}/properties/d`]: "Two",
      },
    });
    return r.failures.filter((f) => f.startsWith("[collision]")).length === 2 || JSON.stringify(r.failures);
  });
  test("MDL-007.04 missing singular name aborts and names the list", () =>
    failsWith(run(schemaOf({ [poam]: obj({ origins: list(obj({ actor: str })) }) })), `the list ${D(poam)}/properties/origins needs`));
  test("MDL-007.05 branch without a distinguishing property aborts", () =>
    failsWith(run(schemaOf({ [group]: { type: "object", anyOf: [{ properties: { title: str } }, { properties: { title: str } }] } })), `${D(group)}/anyOf/0`));
  test("MDL-007.06 merge of different structures aborts and names both", () => {
    const s = schemaOf({ [mapping]: obj({ method: closedEnum("human") }), [mp]: obj({ method: closedEnum("automation") }) });
    const a = `${D(mapping)}/properties/method/allOf/1`;
    const b = `${D(mp)}/properties/method/allOf/1`;
    const r = run(s, { merges: [[a, b]] });
    return (r.failures.some((f) => f.includes(a) && f.includes(b) && f.startsWith("[merge-structure]")) && r.manifest === undefined) || JSON.stringify(r.failures);
  });
  test("MDL-007.06 branch copies that differ abort", () => failsWith(run(partySchema(obj({ id: str })), { "local-names": partyLocals }), "[merge-structure]"));
  test("NAM-005.01 override with an unknown pointer fails", () => failsWith(run(schemaOf({}), { names: { "#/definitions/nope": "Nope" } }), "#/definitions/nope does not resolve"));
  test("NAM-005.02 unused override fails", () =>
    failsWith(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) }), { names: { [`${D(hash)}/properties/algorithm/anyOf/1`]: "HashAlgorithm" } }), "[unused-override]"));
  test("NAM-005 local name on a place that is not a list item fails", () => failsWith(run(schemaOf({ [hash]: obj({}) }), { "local-names": { [D(hash)]: "hash" } }), "[unused-override]"));
  test("NAM-005 merge of one type fails", () => failsWith(run(schemaOf({ [hash]: obj({}) }), { merges: [[D(hash), D(hash)]] }), "[unused-override]"));

  // Task 2.6: pinning.
  const prev = (types: Manifest["types"]): Manifest => ({ format: 1, "oscal-release": "1.2.2", schema: { file: SCHEMA_FILE, sha256: "0".repeat(64) }, types });
  test("NAM-007.01 existing type keeps its name", () => {
    const r = run(schemaOf({ [sspStatus]: obj({}) }), {}, prev([{ name: "Status", kind: "object", sites: [D(sspStatus)] }]));
    return nameAt(r, D(sspStatus)) === "Status" && r.dropped.length === 0;
  });
  test("NAM-007 pinned name wins over a changed rule", () =>
    nameAt(run(schemaOf({ [hash]: obj({}) }), {}, prev([{ name: "Digest", kind: "object", sites: [D(hash)] }])), D(hash)) === "Digest");
  test("NAM-007.02 new clashing definition is qualified", () => {
    const other = "oscal-complete-oscal-poam:status";
    const r = run(schemaOf({ [sspStatus]: obj({}), [other]: obj({ x: str }) }), {}, prev([{ name: "Status", kind: "object", sites: [D(sspStatus)] }]));
    return nameAt(r, D(sspStatus)) === "Status" && nameAt(r, D(other)) === "PoamStatus";
  });
  test("NAM-007.03 dropped name is reported", () => {
    const r = run(schemaOf({}), {}, prev([{ name: "Gone", kind: "object", sites: [D("oscal-complete-oscal-x:gone")] }]));
    return r.dropped.some((d) => d.startsWith("Gone")) || JSON.stringify(r.dropped);
  });
  test("NAM-007 override name changes a pinned name", () =>
    nameAt(run(schemaOf({ [hash]: obj({}) }), { names: { [D(hash)]: "Digest" } }, prev([{ name: "Hash", kind: "object", sites: [D(hash)] }])), D(hash)) === "Digest");

  // Task 2.7: writer.
  test("NAM-006.02 generation is reproducible", () => {
    const s = schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }), [sspStatus]: obj({}) });
    const a = run(s).manifest;
    const b = run(s).manifest;
    return a !== undefined && serialize(a as unknown as Json) === serialize(b as unknown as Json);
  });
  test("writer: sorted keys, sorted entries, two-space indent, final newline", () => {
    const text = serialize(run(schemaOf({ [hash]: obj({}) })).manifest as unknown as Json);
    const m = JSON.parse(text) as Manifest;
    const names = m.types.map((t) => t.name);
    return (
      text.endsWith("}\n") &&
      text.startsWith('{\n  "format": 1,\n  "oscal-release"') &&
      JSON.stringify(names) === JSON.stringify([...names].sort()) &&
      m.schema.sha256 === sha256(schemaOf({ [hash]: obj({}) }))
    );
  });

  // Tasks 1.1 and 1.2: the JSON Schemas of the two files.
  const sketch: Manifest = {
    format: 1,
    "oscal-release": "1.2.3",
    schema: { file: SCHEMA_FILE, sha256: "a".repeat(64) },
    types: [
      { name: "CatalogGroup", kind: "union", sites: [D(group)], variants: [{ type: "CatalogGroupWithControls", property: "controls" }, { type: "CatalogGroupWithGroups", property: "groups" }] },
      { name: "HashAlgorithm", kind: "enum", closed: false, sites: [`${D(hash)}/properties/algorithm/anyOf/1`] },
      { name: "MappingCollectionMappings", kind: "single-or-many", item: "Mapping", sites: [`${D(mc)}/properties/mappings`] },
      { name: "SystemSecurityPlanDocument", kind: "document", "body-field": "system-security-plan", sites: ["#/oneOf/4"] },
    ],
  };
  const schemaOnly = (data: unknown) => validateManifest(data, "{}", "1.2.3").filter((f) => f.startsWith("[json-schema]"));
  const mutate = (fn: (m: Manifest) => void) => {
    const m = JSON.parse(JSON.stringify(sketch)) as Manifest;
    fn(m);
    return schemaOnly(m);
  };
  test("names.schema: the D4 sketch passes", () => schemaOnly(sketch).length === 0 || JSON.stringify(schemaOnly(sketch)));
  test("names.schema: a name with a final newline fails", () => mutate((m) => (m.types[1].name = "HashAlgorithm\n")).length > 0);
  test("names.schema: a name with - fails", () => mutate((m) => (m.types[1].name = "Bad-Name")).length > 0);
  test("names.schema: a name with a quote fails", () => mutate((m) => (m.types[1].name = 'Bad"Name')).length > 0);
  test("NAM-004.01 an entry without a kind fails", () => mutate((m) => delete (m.types[1] as Partial<Manifest["types"][number]>).kind).length > 0);
  test("NAM-004.02 schema file name with a path fails", () => mutate((m) => (m.schema.file = "../x.json")).length > 0);
  test("names.schema: a pointer with % fails", () => mutate((m) => (m.types[1].sites = ["#/definitions/a%20b"])).length > 0);
  test("names.schema: an unknown member fails", () => mutate((m) => ((m.types[1] as unknown as Schema).extra = 1)).length > 0);
  test("NAM-003.05 an unknown format fails", () => mutate((m) => (m.format = 2)).length > 0);
  test("names.schema: a reference with a final newline fails", () => mutate((m) => (m.types[2].item = "Mapping\n")).length > 0);
  const overridesSketch = { ...emptyOverrides("1.2.3"), "local-names": { [originsItems]: "origin" }, names: { [riskLog]: "RiskLog" } };
  test("overrides.schema: the D4 sketch passes", () => validateOverrides(overridesSketch).length === 0 || JSON.stringify(validateOverrides(overridesSketch)));
  test("overrides.schema: an unknown member fails", () => validateOverrides({ ...overridesSketch, extra: {} }).length > 0);
  test("overrides.schema: a merge with one pointer fails", () => validateOverrides({ ...overridesSketch, merges: [[D(hash)]] }).length > 0);
  test("overrides.schema: an invalid override name fails", () => validateOverrides({ ...overridesSketch, names: { [D(hash)]: "bad name" } }).length > 0);
  test("overrides.schema: an invalid local name fails", () => validateOverrides({ ...overridesSketch, "local-names": { [originsItems]: "Origin" } }).length > 0);

  // Task 4.1: rules that the JSON Schema cannot express.
  const real = run(mergeSchema).manifest as Manifest;
  const cross = (fn: (m: Manifest) => void, needle: string) => {
    const m = JSON.parse(JSON.stringify(real)) as Manifest;
    fn(m);
    const out = validateManifest(m, mergeSchema, "1.2.3");
    return out.some((f) => f.includes(needle)) || JSON.stringify(out);
  };
  test("validate: a generated manifest passes", () => validateManifest(real, mergeSchema, "1.2.3").length === 0 || JSON.stringify(validateManifest(real, mergeSchema, "1.2.3")));
  test("NAM-003.02 duplicate name is invalid", () => cross((m) => (m.types[1].name = m.types[0].name), "occurs more than once"));
  test("NAM-003.04 reference to a missing entry is invalid", () => cross((m) => (m.types.find((t) => t.kind === "union")!.variants![0].type = "Missing"), "names no entry"));
  test("NAM-001.03 unresolvable pointer is invalid", () => cross((m) => (m.types[0].sites = ["#/definitions/missing"]), "does not resolve"));
  test("NAM-001.02 a pointer in two entries is invalid", () => cross((m) => (m.types[1].sites = [...m.types[0].sites]), "more than one entry"));
  test("NAM-002.03 schema hash mismatch is detected", () => cross((m) => (m.schema.sha256 = "0".repeat(64)), "sha256 does not match"));
  test("NAM-003 other OSCAL release is rejected", () => cross((m) => (m["oscal-release"] = "1.2.4"), "is not 1.2.3"));
  test("NAM-004.03 distinguishing property that is not a key fails", () =>
    cross((m) => (m.types.find((t) => t.kind === "union")!.variants![0].property = "groups"), "is not a property of the branch"));

  let failed = 0;
  for (const [name, fn] of cases) {
    let out: boolean | string;
    try {
      out = fn();
    } catch (error) {
      out = `threw ${(error as Error).message}`;
    }
    const ok = out === true;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || out === false ? "" : `\n      ${out}`}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  return failed ? 1 : 0;
}

if (process.argv.includes("--self-test")) process.exit(selfTest());
else if (process.argv.includes("--write")) process.exit(main("write"));
else process.exit(main("check"));
