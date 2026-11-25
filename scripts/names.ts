/**
 * Generates and checks the naming manifest of each OSCAL release in the contract store (openspec/specs/contract-store).
 *
 * The inputs of manifest/<release>/names.json are schemas/<release>/oscal_complete_schema.json,
 * manifest/<release>/overrides.json, and the names.json of the previous OSCAL release in the contract store, when one exists.
 * Releases run in release order, so each release can pin the names of the one before it.
 *
 *   npm run names:write        regenerate each names.json
 *   npm run names:check        validate each file, regenerate in memory, and compare with the committed names.json
 *   npm run names:self-test    run the rule scenarios on small schemas in memory, and on small stores in a temporary directory
 */
import fs from "node:fs";
import os from "node:os";
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

/** The problems of the committed names.json of a release: it does not validate, or it differs from the generated text. */
export function committedProblems(root: string, release: string, output: string): string[] {
  const file = path.join(root, "manifest", release, "names.json");
  const committed = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
  const schemaBytes = fs.readFileSync(path.join(root, "schemas", release, SCHEMA_FILE));
  const problems = committed === undefined ? [`${file} does not exist`] : validateManifest(JSON.parse(committed), schemaBytes, release);
  if (committed !== undefined && committed !== output) {
    problems.push(`${file} differs from the generator output. Edit overrides.json and run npm run names:write.`);
  }
  return problems;
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
    const problems = committedProblems(".", run.release, run.output);
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
  test("STO-034.01 local name maps to PascalCase", () => nameAt(run(schemaOf({ [param]: obj({ id: str }) })), D(param)) === "Parameter");
  test("STO-033.01 local name of a definition", () => {
    // The local name is the key after the colon. An inline object takes the canonical name of this parent plus its own key.
    const hashKey = "oscal-complete-oscal-metadata:hash";
    const r = run(schemaOf({ [hashKey]: obj({ extra: obj({ value: str }) }) }));
    return nameAt(r, D(hashKey)) === "Hash" && nameAt(r, `${D(hashKey)}/properties/extra`) === "HashExtra";
  });
  test("STO-033.02 local name of a list item", () => {
    const obsKey = "oscal-complete-oscal-assessment-common:observation";
    const items = `${D(obsKey)}/properties/methods/items`;
    const r = run(schemaOf({ [obsKey]: obj({ methods: list(obj({ step: str })) }) }), { "local-names": { [items]: "method" } });
    return nameAt(r, items) === "ObservationMethod" && entryNamed(r, "ObservationMethods") === undefined;
  });
  test("STO-032.02 schema reorder does not change names", () => {
    const a = run(schemaOf({ "oscal-complete-oscal-catalog:profile": obj({}) }, ["catalog", "profile"]));
    const b = run(schemaOf({ "oscal-complete-oscal-catalog:profile": obj({}) }, ["profile", "catalog"]));
    return entryNamed(a, "CatalogDocument") !== undefined && entryNamed(b, "CatalogDocument") !== undefined && entryNamed(b, "ProfileDocument") !== undefined;
  });
  const poam = "oscal-complete-oscal-poam:poam-item";
  const originsItems = `${D(poam)}/properties/origins/items`;
  test("STO-043.06 list items use the singular local name", () =>
    nameAt(run(schemaOf({ [poam]: obj({ origins: list(obj({ actor: str })) }) }), { "local-names": { [originsItems]: "origin" } }), originsItems) ===
    "PoamItemOrigin");
  test("STO-037.01 wrapper named from its body field", () => {
    const r = run(schemaOf({ "oscal-complete-oscal-catalog:system-security-plan": obj({}) }, ["system-security-plan"]));
    const e = entryNamed(r, "SystemSecurityPlanDocument");
    return e?.kind === "document" && e["body-field"] === "system-security-plan";
  });
  test("STO-037.02 schema directive field is excluded", () => entryNamed(run(schemaOf({})), "CatalogDocument")?.["body-field"] === "catalog");
  test("STO-037.03 the eight wrapper names", () => {
    const names = ["CatalogDocument", "ProfileDocument", "ComponentDefinitionDocument", "SystemSecurityPlanDocument", "AssessmentPlanDocument", "AssessmentResultsDocument", "PlanOfActionAndMilestonesDocument", "MappingCollectionDocument"];
    const release = runReleases().find((r) => r.release === "1.2.3");
    if (release?.output === undefined) return JSON.stringify(release?.failures);
    const documents = (JSON.parse(release.output) as Manifest).types.filter((t) => t.kind === "document").map((t) => t.name);
    return JSON.stringify([...documents].sort()) === JSON.stringify([...names].sort()) || JSON.stringify(documents);
  });
  test("STO-035.01 root schema name", () => {
    const e = entryNamed(run(schemaOf({})), "OscalDocument");
    return e?.kind === "document-union" && e.sites[0] === "#";
  });
  test("document union lists the wrappers", () =>
    JSON.stringify(entryNamed(run(schemaOf({ "oscal-complete-oscal-catalog:profile": obj({}) }, ["profile", "catalog"])), "OscalDocument")?.members) ===
    '["CatalogDocument","ProfileDocument"]');
  const cdci = "oscal-complete-oscal-component-definition:control-implementation";
  const sspci = "oscal-complete-oscal-ssp:control-implementation";
  test("STO-038.01 colliding short names get module-prefixed names", () => {
    const r = run(schemaOf({ [cdci]: obj({ a: str }), [sspci]: obj({ b: str }) }));
    return nameAt(r, D(cdci)) === "ComponentDefinitionControlImplementation" && nameAt(r, D(sspci)) === "SspControlImplementation";
  });
  test("STO-051.01 clashing definitions are not merged", () => {
    // The two definitions have the same structure, because equal structure alone MUST NOT merge two places (STO-049).
    const r = run(schemaOf({ [cdci]: obj({ a: str }), [sspci]: obj({ a: str }) }));
    const a = entryNamed(r, "ComponentDefinitionControlImplementation");
    const b = entryNamed(r, "SspControlImplementation");
    return a?.sites.length === 1 && b?.sites.length === 1 && a.sites[0] === D(cdci) && b.sites[0] === D(sspci);
  });
  test("STO-049.02 same local name with different structure is not deduplicated", () => {
    const r = run(schemaOf({ [cdci]: obj({ a: str }), [sspci]: obj({ a: obj({ x: str }) }) }));
    return r.manifest !== undefined && r.manifest.types.filter((t) => t.name.endsWith("ControlImplementation")).length === 2 && r.manifest.types.every((t) => t.sites.length === 1 || t.kind === "document-union");
  });
  const sspStatus = "oscal-complete-oscal-ssp:status";
  const sysComp = "oscal-complete-oscal-implementation-common:system-component";
  const finding = "oscal-complete-oscal-assessment-common:finding-target";
  test("STO-038.03 a definition that clashes only with an inline type keeps its local name", () => {
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
  test("STO-039.01 merge branches are named With their property", () => {
    const r = run(mergeSchema);
    const u = entryNamed(r, "Merge");
    return (
      u?.kind === "union" &&
      JSON.stringify(u.variants) ===
        '[{"type":"MergeWithAsIs","property":"as-is"},{"type":"MergeWithCustom","property":"custom"},{"type":"MergeWithFlat","property":"flat"}]'
    );
  });
  test("STO-039.03 branch children use the union name", () => entryNamed(run(mergeSchema), "MergeCustom")?.sites.length === 1);
  test("STO-049.03 combine copies in three branches merge into one type", () => entryNamed(run(mergeSchema), "MergeCombine")?.sites.length === 3);
  const group = "oscal-complete-oscal-catalog:group";
  test("STO-039.02 branch named from its distinguishing property", () => {
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
  test("STO-040.01 each variant records its distinguishing property when the branch defines it as optional", () => {
    const r = run(
      schemaOf({
        [group]: {
          type: "object",
          anyOf: [{ properties: { title: str, groups: list(ref(group)) } }, { properties: { title: str, controls: list(str) } }],
        },
      }),
    );
    const u = entryNamed(r, "Group");
    return (
      u?.kind === "union" &&
      JSON.stringify(u.variants) === '[{"type":"GroupWithControls","property":"controls"},{"type":"GroupWithGroups","property":"groups"}]'
    );
  });
  test("STO-043.01 inline object named from its parent", () =>
    nameAt(run(schemaOf({ [sysComp]: obj({ status: obj({ state: str }) }) })), `${D(sysComp)}/properties/status`) === "SystemComponentStatus");
  test("STO-043.02 two inline types with the same local name stay distinct", () => {
    const r = run(schemaOf({ [sysComp]: obj({ status: obj({ state: str }) }), [finding]: obj({ status: obj({ reason: str }) }) }));
    return nameAt(r, `${D(sysComp)}/properties/status`) === "SystemComponentStatus" && nameAt(r, `${D(finding)}/properties/status`) === "FindingTargetStatus";
  });
  const backMatter = "oscal-complete-oscal-metadata:back-matter";
  const resources = `${D(backMatter)}/properties/resources/items`;
  test("STO-043.03 nested inline type uses the canonical name of its parent", () => {
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
  test("STO-043.04 inline type in a union branch uses the name of the union", () => {
    const r = run(taskSchema);
    return nameAt(r, timing) === "TaskTiming" && nameAt(r, `${timing}/anyOf/0/properties/on-date`) === "TaskTimingOnDate" && nameAt(r, `${timing}/anyOf/0`) === "TaskTimingWithOnDate";
  });
  const risk = "oscal-complete-oscal-assessment-common:risk";
  const riskLog = `${D(risk)}/properties/risk-log`;
  test("STO-043.05 override name of a parent carries down", () => {
    const r = run(schemaOf({ [risk]: obj({ "risk-log": obj({ entries: list(obj({ start: str })) }) }) }), {
      names: { [riskLog]: "RiskLog" },
      "local-names": { [`${riskLog}/properties/entries/items`]: "entry" },
    });
    return nameAt(r, riskLog) === "RiskLog" && nameAt(r, `${riskLog}/properties/entries/items`) === "RiskLogEntry";
  });
  const hash = "oscal-complete-oscal-metadata:hash";
  test("STO-045.01 enum named from owner and property", () =>
    nameAt(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) })), `${D(hash)}/properties/algorithm/anyOf/1`) === "HashAlgorithm");
  const sel = "oscal-complete-oscal-control-common:parameter-selection";
  test("STO-044.02 closed enum gets a type", () => {
    const e = entryNamed(run(schemaOf({ [sel]: obj({ "how-many": closedEnum("one", "one-or-more") }) })), "ParameterSelectionHowMany");
    return e?.kind === "enum" && e.closed === true;
  });
  test("STO-044.03 open enum is marked open", () => entryNamed(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) })), "HashAlgorithm")?.closed === false);
  const riskStatus = "oscal-complete-oscal-assessment-common:risk-status";
  test("STO-045.02 enum held directly by a definition", () => {
    const e = entryNamed(run(schemaOf({ [riskStatus]: { anyOf: [ref("TokenDatatype"), { enum: ["open", "closed"] }] } })), "RiskStatus");
    return e?.kind === "enum" && e.closed === false && e.sites[0] === `${D(riskStatus)}/anyOf/1`;
  });
  const statusSchema = schemaOf({
    [sspStatus]: obj({ state: closedEnum("operational") }),
    [sysComp]: obj({ status: obj({ state: closedEnum("under-development") }) }),
    [finding]: obj({ status: obj({ state: closedEnum("satisfied"), reason: openEnum("pass") }) }),
  });
  test("STO-045.03 enums of an inline owner share its canonical name", () => {
    const r = run(statusSchema);
    return entryNamed(r, "FindingTargetStatusState") !== undefined && entryNamed(r, "FindingTargetStatusReason") !== undefined;
  });
  test("STO-045.04 enums with the same owner local name stay distinct", () => {
    const r = run(statusSchema);
    return ["StatusState", "SystemComponentStatusState", "FindingTargetStatusState"].every((n) => entryNamed(r, n)?.sites.length === 1);
  });
  test("STO-045.05 enum in a list property uses the singular name", () => {
    const obs = "oscal-complete-oscal-assessment-common:observation";
    const items = `${D(obs)}/properties/methods/items`;
    return nameAt(run(schemaOf({ [obs]: obj({ methods: list(openEnum("TEST")) }) }), { "local-names": { [items]: "method" } }), `${items}/anyOf/1`) === "ObservationMethod";
  });
  const mc = "oscal-complete-oscal-mapping:mapping-collection";
  const mapping = "oscal-complete-oscal-mapping-common:mapping";
  test("STO-046.01 one-or-list property is a single-or-many type", () => {
    const r = run(schemaOf({ [mapping]: obj({ uuid: str }), [mc]: obj({ mappings: { anyOf: [ref(mapping), { type: "array", minItems: 1, items: ref(mapping) }] } }) }));
    const e = entryNamed(r, "MappingCollectionMappings");
    return e?.kind === "single-or-many" && e.item === "Mapping";
  });
  test("override name replaces a rule-derived name", () =>
    nameAt(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) }), { names: { [`${D(hash)}/properties/algorithm/anyOf/1`]: "DigestAlgorithm" } }), `${D(hash)}/properties/algorithm/anyOf/1`) ===
    "DigestAlgorithm");
  test("STO-023.03 a name change is an override edit", () => {
    const schema = schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) });
    const site = `${D(hash)}/properties/algorithm/anyOf/1`;
    const before = run(schema);
    const after = run(schema, { names: { [site]: "DigestAlgorithm" } });
    if (before.manifest === undefined || after.manifest === undefined) return JSON.stringify([before.failures, after.failures]);
    const text = serialize(after.manifest as unknown as Json);
    return (
      nameAt(before, site) === "HashAlgorithm" &&
      nameAt(after, site) === "DigestAlgorithm" &&
      text.includes('"name": "DigestAlgorithm"') &&
      !text.includes("HashAlgorithm")
    );
  });
  test("STO-048.03 scalar definition with an enum has an entry", () => {
    const e = entryNamed(run(schemaOf({ [riskStatus]: { anyOf: [ref("TokenDatatype"), { enum: ["open", "closed"] }] } })), "RiskStatus");
    const real = committedEntry("RiskStatus");
    return (e?.kind === "enum" && real?.kind === "enum" && real.sites[0] === `${D(riskStatus)}/anyOf/1`) || JSON.stringify([e, real]);
  });
  test("STO-048.04 scalar definition without an enum has no entry", () => {
    const constrained = "oscal-complete-oscal-metadata:email-address";
    const wrapped = "oscal-complete-oscal-metadata:remarks";
    const r = run(schemaOf({ [constrained]: { type: "string", pattern: "^.+@.+$", minLength: 1 }, [wrapped]: { $ref: "#/definitions/StringDatatype" }, [hash]: obj({}) }));
    const holds = (site: string) => r.manifest?.types.some((t) => t.sites.some((p) => p === site || p.startsWith(`${site}/`)));
    return (r.manifest !== undefined && holds(D(hash)) === true && holds(D(constrained)) === false && holds(D(wrapped)) === false) || JSON.stringify(r.failures);
  });
  const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  test("STO-017.01 document entry records its body field", () => {
    const e = entryNamed(run(schemaOf({ "oscal-complete-oscal-catalog:system-security-plan": obj({}) }, ["system-security-plan"])), "SystemSecurityPlanDocument");
    const real = committedEntry("SystemSecurityPlanDocument");
    return (e?.kind === "document" && e["body-field"] === "system-security-plan" && real?.kind === "document" && real["body-field"] === "system-security-plan") || JSON.stringify([e, real]);
  });
  test("STO-017.02 union entry records each branch", () => {
    const groupSchema = schemaOf({
      [group]: { type: "object", anyOf: [{ properties: { title: str, groups: list(ref(group)) } }, { properties: { title: str, controls: list(str) } }] },
    });
    const branches = (e: Manifest["types"][number] | undefined, prefix: string) =>
      sameJson(
        [...(e?.variants ?? [])].sort((a, b) => a.property.localeCompare(b.property)).map((v) => ({ property: v.property, type: v.type })),
        [
          { property: "controls", type: `${prefix}WithControls` },
          { property: "groups", type: `${prefix}WithGroups` },
        ],
      );
    const e = entryNamed(run(groupSchema), "Group");
    const real = committedEntry("CatalogGroup");
    return (e?.kind === "union" && real?.kind === "union" && branches(e, "Group") && branches(real, "CatalogGroup")) || JSON.stringify([e, real]);
  });
  test("STO-017.03 enum entry records whether it is open", () => {
    const e = entryNamed(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) })), "HashAlgorithm");
    const real = committedEntry("HashAlgorithm");
    return (e?.kind === "enum" && e.closed === false && real?.kind === "enum" && real.closed === false) || JSON.stringify([e, real]);
  });
  test("STO-017.04 single-or-many entry records its item type", () => {
    const e = entryNamed(run(schemaOf({ [mapping]: obj({ uuid: str }), [mc]: obj({ mappings: { anyOf: [ref(mapping), { type: "array", minItems: 1, items: ref(mapping) }] } }) })), "MappingCollectionMappings");
    const real = committedEntry("MappingCollectionMappings");
    return (e?.kind === "single-or-many" && e.item === "Mapping" && real?.kind === "single-or-many" && real.item === "Mapping") || JSON.stringify([e, real]);
  });
  const members = (e: Manifest["types"][number] | undefined) => Object.keys(e ?? {}).sort();
  test("STO-018.01 enum entry holds no enum value", () => {
    const e = entryNamed(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) })), "HashAlgorithm");
    const real = committedEntry("HashAlgorithm");
    const keys = ["closed", "kind", "name", "sites"];
    return (sameJson(members(e), keys) && sameJson(members(real), keys) && !JSON.stringify([e, real]).includes("SHA-256")) || JSON.stringify([e, real]);
  });
  test("STO-018.02 object entry holds no field name", () => {
    const e = entryNamed(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256"), value: str }) })), "Hash");
    const real = committedEntry("Hash");
    const keys = ["kind", "name", "sites"];
    return (sameJson(members(e), keys) && sameJson(members(real), keys) && !JSON.stringify([e, real]).includes("algorithm")) || JSON.stringify([e, real]);
  });
  test("STO-036.01 override name replaces a rule-derived name", () => {
    const s = schemaOf({ [risk]: obj({ "risk-log": obj({ start: str }) }) });
    return nameAt(run(s), riskLog) === "RiskRiskLog" && nameAt(run(s, { names: { [riskLog]: "RiskLog" } }), riskLog) === "RiskLog";
  });
  test("empty object definition is an object type", () => entryNamed(run(schemaOf({ "oscal-complete-oscal-control-common:include-all": obj({}) })), "IncludeAll")?.kind === "object");
  test("scalar definition has no entry", () => entryNamed(run(schemaOf({ "oscal-complete-oscal-metadata:remarks": str })), "Remarks") === undefined);
  test("STO-047.01 scalar wrapper has no object entry", () => {
    const uuidKey = "oscal-complete-oscal-metadata:uuid";
    const r = run(schemaOf({ [uuidKey]: { type: "string", pattern: "^[0-9A-Fa-f]{8}$" } }));
    return r.manifest !== undefined && entryNamed(r, "Uuid") === undefined && nameAt(r, D(uuidKey)) === undefined;
  });
  test("STO-047.02 preserved wrappers stay wrappers", () => {
    const m = "oscal-complete-oscal-mapping:mapping-collection";
    const mp = "oscal-complete-oscal-mapping-common:mapping";
    const r = run(schemaOf({ [mp]: obj({ uuid: str }), [m]: obj({ mappings: { anyOf: [ref(mp), { type: "array", minItems: 1, items: ref(mp) }] } }) }));
    return entryNamed(r, "OscalDocument")?.kind === "document-union" && entryNamed(r, "MappingCollectionMappings")?.kind === "single-or-many";
  });
  test("lists of references need no singular name", () => run(schemaOf({ [hash]: obj({ links: list(ref(hash)) }) })).manifest !== undefined);

  // The committed manifest of OSCAL 1.2.3, for the scenarios that name an entry of it.
  const committed = JSON.parse(fs.readFileSync("manifest/1.2.3/names.json", "utf8")) as Manifest;
  const committedEntry = (name: string) => committed.types.find((t) => t.name === name);
  test("STO-015.01 definition identified by its definition pointer", () => {
    const pointer = D(hash);
    const derived = entryNamed(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) })), "Hash");
    const real = committedEntry("Hash");
    return (
      (JSON.stringify(derived?.sites) === JSON.stringify([pointer]) && JSON.stringify(real?.sites) === JSON.stringify([pointer]) && pointer === "#/definitions/oscal-complete-oscal-metadata:hash") ||
      JSON.stringify([derived?.sites, real?.sites])
    );
  });

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
  test("STO-049.03 copies in union branches merge", () => {
    const r = run(partySchema(ext), { "local-names": partyLocals });
    return entryNamed(r, "MetadataPartyExternalId")?.sites.length === 2 && entryNamed(r, "MetadataPartyExternalIdScheme")?.sites.length === 2;
  });
  const mp = "oscal-complete-oscal-mapping-common:mapping-provenance";
  const twoMethods = schemaOf({ [mapping]: obj({ method: closedEnum("human", "automation") }), [mp]: obj({ method: closedEnum("human", "automation") }) });
  test("STO-049.04 equal enum values at unrelated places do not merge", () => {
    const r = run(twoMethods);
    return entryNamed(r, "MappingMethod")?.sites.length === 1 && entryNamed(r, "MappingProvenanceMethod")?.sites.length === 1;
  });
  test("STO-049.01 a shared type used by many document types yields one canonical type", () => {
    const metadata = "oscal-complete-oscal-metadata:metadata";
    const r = run(
      schemaOf(
        {
          [metadata]: obj({ title: str }),
          "oscal-complete-oscal-catalog:catalog": obj({ metadata: ref(metadata) }),
          "oscal-complete-oscal-catalog:profile": obj({ metadata: ref(metadata) }),
          "oscal-complete-oscal-catalog:system-security-plan": obj({ metadata: ref(metadata) }),
        },
        ["catalog", "profile", "system-security-plan"],
      ),
    );
    const metadataTypes = r.manifest?.types.filter((t) => t.name.includes("Metadata")) ?? [];
    return (metadataTypes.length === 1 && metadataTypes[0].name === "Metadata" && metadataTypes[0].sites.length === 1) || JSON.stringify(r.failures);
  });
  test("STO-050.01 identical places merge into one type that records both places", () => {
    const sites = [`${D(mapping)}/properties/method/allOf/1`, `${D(mp)}/properties/method/allOf/1`];
    const e = entryNamed(run(twoMethods, { merges: [sites] }), "MappingMethod");
    return e?.sites.length === 2 && entryNamed(run(twoMethods, { merges: [sites] }), "MappingProvenanceMethod") === undefined;
  });

  // Task 2.5: guards.
  test("STO-041.01 ambiguous wrapper aborts and names it", () => {
    const s = JSON.parse(schemaOf({})) as Schema;
    ((s.oneOf as Schema[])[0].properties as Schema).profile = str;
    return failsWith(run(JSON.stringify(s)), "#/oneOf/0");
  });
  test("STO-041.02 wrapper count mismatch aborts", () => {
    const s = JSON.parse(schemaOf({})) as Schema;
    (s.oneOf as Json[]).push({ type: "string" });
    return failsWith(run(JSON.stringify(s)), "wrapper-count");
  });
  test("STO-041.03 uncovered collisions are all reported", () => {
    const r = run(
      schemaOf({ [sysComp]: obj({ a: obj({}), b: obj({}) }) }),
      { names: { [`${D(sysComp)}/properties/a`]: "Same", [`${D(sysComp)}/properties/b`]: "Same" } },
    );
    // An unlucky concatenation: foo + bar-baz and foo-bar + baz both give FooBarBaz.
    const r2 = run(schemaOf({ "oscal-complete-oscal-x:foo": obj({ "bar-baz": obj({}) }), "oscal-complete-oscal-y:foo-bar": obj({ baz: obj({}) }) }));
    return failsWith(r, "Same names 2 types") === true && failsWith(r2, "FooBarBaz names 2 types");
  });
  test("STO-041.03 every collision appears in one report", () => {
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
  test("STO-052.01 missing singular name aborts and names the list", () =>
    failsWith(run(schemaOf({ [poam]: obj({ origins: list(obj({ actor: str })) }) })), `the list ${D(poam)}/properties/origins needs`));
  test("STO-052.04 each missing singular name is reported", () => {
    const other = "oscal-complete-oscal-assessment-common:finding";
    const r = run(schemaOf({ [poam]: obj({ origins: list(obj({ actor: str })) }), [other]: obj({ targets: list(obj({ id: str })) }) }));
    const missing = r.failures.filter((f) => f.startsWith("[missing-singular]"));
    return (
      (r.manifest === undefined && missing.length === 2 && missing.some((f) => f.includes(`${D(poam)}/properties/origins`)) && missing.some((f) => f.includes(`${D(other)}/properties/targets`))) ||
      JSON.stringify(r.failures)
    );
  });
  test("STO-052.02 branch without a distinguishing property aborts", () =>
    failsWith(run(schemaOf({ [group]: { type: "object", anyOf: [{ properties: { title: str } }, { properties: { title: str } }] } })), `${D(group)}/anyOf/0`));
  test("STO-052.03 merge of different structures aborts and names both", () => {
    const s = schemaOf({ [mapping]: obj({ method: closedEnum("human") }), [mp]: obj({ method: closedEnum("automation") }) });
    const a = `${D(mapping)}/properties/method/allOf/1`;
    const b = `${D(mp)}/properties/method/allOf/1`;
    const r = run(s, { merges: [[a, b]] });
    return (r.failures.some((f) => f.includes(a) && f.includes(b) && f.startsWith("[merge-structure]")) && r.manifest === undefined) || JSON.stringify(r.failures);
  });
  test("STO-052.03 branch copies that differ abort", () => failsWith(run(partySchema(obj({ id: str })), { "local-names": partyLocals }), "[merge-structure]"));
  test("STO-024.01 override with an unknown pointer fails", () => failsWith(run(schemaOf({}), { names: { "#/definitions/nope": "Nope" } }), "#/definitions/nope does not resolve"));
  test("STO-024.02 unused override fails", () =>
    failsWith(run(schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }) }), { names: { [`${D(hash)}/properties/algorithm/anyOf/1`]: "HashAlgorithm" } }), "[unused-override]"));
  test("STO-024.03 explicit merge with an unknown pointer fails", () => {
    const sites = [`${D(mapping)}/properties/method/allOf/1`, "#/definitions/nope"];
    return failsWith(run(twoMethods, { merges: [sites] }), "#/definitions/nope does not resolve");
  });
  test("STO-023 local name on a place that is not a list item fails", () => failsWith(run(schemaOf({ [hash]: obj({}) }), { "local-names": { [D(hash)]: "hash" } }), "[unused-override]"));
  test("STO-023 merge of one type fails", () => failsWith(run(schemaOf({ [hash]: obj({}) }), { merges: [[D(hash), D(hash)]] }), "[unused-override]"));

  // Task 2.6: pinning.
  const prev = (types: Manifest["types"]): Manifest => ({ format: 1, "oscal-release": "1.2.2", schema: { file: SCHEMA_FILE, sha256: "0".repeat(64) }, types });
  test("STO-027.01 existing type keeps its name", () => {
    const r = run(schemaOf({ [sspStatus]: obj({}) }), {}, prev([{ name: "Status", kind: "object", sites: [D(sspStatus)] }]));
    return nameAt(r, D(sspStatus)) === "Status" && r.dropped.length === 0;
  });
  test("STO-027.01 pinned name wins over a changed rule", () =>
    nameAt(run(schemaOf({ [hash]: obj({}) }), {}, prev([{ name: "Digest", kind: "object", sites: [D(hash)] }])), D(hash)) === "Digest");
  test("STO-027.02 new clashing definition is qualified", () => {
    const other = "oscal-complete-oscal-poam:status";
    const r = run(schemaOf({ [sspStatus]: obj({}), [other]: obj({ x: str }) }), {}, prev([{ name: "Status", kind: "object", sites: [D(sspStatus)] }]));
    return nameAt(r, D(sspStatus)) === "Status" && nameAt(r, D(other)) === "PoamStatus";
  });
  test("STO-028.01 dropped name is reported", () => {
    const r = run(schemaOf({}), {}, prev([{ name: "Gone", kind: "object", sites: [D("oscal-complete-oscal-x:gone")] }]));
    return r.dropped.some((d) => d.startsWith("Gone")) || JSON.stringify(r.dropped);
  });
  test("STO-028.02 each dropped name is reported", () => {
    const r = run(
      schemaOf({ [hash]: obj({}) }),
      {},
      prev([
        { name: "Gone", kind: "object", sites: [D("oscal-complete-oscal-x:gone")] },
        { name: "Missing", kind: "object", sites: [D("oscal-complete-oscal-y:missing")] },
        { name: "Hash", kind: "object", sites: [D(hash)] },
      ]),
    );
    return (r.dropped.length === 2 && r.dropped.some((d) => d.startsWith("Gone")) && r.dropped.some((d) => d.startsWith("Missing"))) || JSON.stringify(r.dropped);
  });
  test("STO-027 override name changes a pinned name", () =>
    nameAt(run(schemaOf({ [hash]: obj({}) }), { names: { [D(hash)]: "Digest" } }, prev([{ name: "Hash", kind: "object", sites: [D(hash)] }])), D(hash)) === "Digest");

  // A contract store on disk in a temporary directory, for the scenarios of the checks that read the contract store. Each release holds
  // the generated manifest, and `tamper` can change the committed copy of a release.
  const withStore = <T>(releases: string[], schema: string, tamper: (release: string, manifest: Manifest) => Manifest, fn: (root: string) => T): T => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "names-store-"));
    try {
      let previous: Manifest | undefined;
      for (const release of releases) {
        fs.mkdirSync(path.join(root, "schemas", release), { recursive: true });
        fs.mkdirSync(path.join(root, "manifest", release), { recursive: true });
        fs.writeFileSync(path.join(root, "schemas", release, SCHEMA_FILE), schema);
        fs.writeFileSync(path.join(root, "manifest", release, "overrides.json"), JSON.stringify(emptyOverrides(release)));
        const manifest = derive({ release, schemaFile: SCHEMA_FILE, schemaBytes: schema, overrides: emptyOverrides(release), previous }).manifest;
        if (manifest === undefined) throw new Error("the test schema gives no manifest");
        fs.writeFileSync(path.join(root, "manifest", release, "names.json"), serialize(tamper(release, structuredClone(manifest)) as unknown as Json));
        previous = manifest;
      }
      return fn(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
  const storeSchema = schemaOf({ [hash]: obj({ algorithm: openEnum("SHA-256") }), [sspStatus]: obj({}) });
  const renameHash = (m: Manifest): Manifest => {
    m.types.find((t) => t.name === "Hash")!.name = "Digest";
    return m;
  };
  const problemsOf = (root: string, release: string) => committedProblems(root, release, runReleases(root).find((r) => r.release === release)!.output!);
  test("STO-025.01 hand edit of the manifest fails the check", () => {
    const edited = withStore(["1.2.3"], storeSchema, (_r, m) => renameHash(m), (root) => problemsOf(root, "1.2.3"));
    const clean = withStore(["1.2.3"], storeSchema, (_r, m) => m, (root) => problemsOf(root, "1.2.3"));
    return (clean.length === 0 && edited.length === 1 && edited[0].includes("differs from the generator output")) || JSON.stringify([clean, edited]);
  });
  test("STO-025.03 edit of a previous release manifest fails the check", () => {
    const problems = withStore(["1.2.2", "1.2.3"], storeSchema, (r, m) => (r === "1.2.2" ? renameHash(m) : m), (root) => ({
      previous: problemsOf(root, "1.2.2"),
    }));
    return (problems.previous.length === 1 && problems.previous[0].includes("1.2.2") && problems.previous[0].includes("differs from the generator output")) || JSON.stringify(problems);
  });

  test("STO-026.01 previous manifest with a wrong schema hash", () => {
    const failuresOf = (tamper: (m: Manifest) => Manifest) =>
      withStore(["1.2.2", "1.2.3"], storeSchema, (r, m) => (r === "1.2.2" ? tamper(m) : m), (root) => runReleases(root).find((r) => r.release === "1.2.3")!.failures);
    const wrong = failuresOf((m) => ({ ...m, schema: { ...m.schema, sha256: "0".repeat(64) } }));
    const right = failuresOf((m) => m);
    return (
      (right.length === 0 && wrong.length === 1 && wrong[0].includes("previous manifest") && wrong[0].includes("schema.sha256 does not match")) || JSON.stringify([right, wrong])
    );
  });

  // Task 2.7: writer.
  test("STO-025.02 generation is reproducible", () => {
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
      { name: "Hash", kind: "object", sites: [D(hash)] },
      { name: "OscalDocument", kind: "document-union", members: ["SystemSecurityPlanDocument"], sites: ["#"] },
    ],
  };
  const schemaOnly = (data: unknown) => validateManifest(data, "{}", "1.2.3").filter((f) => f.startsWith("[json-schema]"));
  const mutate = (fn: (m: Manifest) => void) => {
    const m = JSON.parse(JSON.stringify(sketch)) as Manifest;
    fn(m);
    return schemaOnly(m);
  };
  test("names.schema: the D4 sketch passes", () => schemaOnly(sketch).length === 0 || JSON.stringify(schemaOnly(sketch)));
  test("STO-019.03 a name with a final newline fails", () => mutate((m) => (m.types[1].name = "HashAlgorithm\n")).length > 0);
  test("STO-019.01 a name with - fails", () => mutate((m) => (m.types[1].name = "Bad-Name")).length > 0);
  test("STO-019.01 a name with a quote fails", () => mutate((m) => (m.types[1].name = 'Bad"Name')).length > 0);
  test("STO-019.01 a name with a space fails", () => mutate((m) => (m.types[1].name = "Bad Name")).length > 0);
  test("STO-021.01 an entry without a kind fails", () => mutate((m) => delete (m.types[1] as Partial<Manifest["types"][number]>).kind).length > 0);
  test("STO-022.01 schema file name with a path fails", () => mutate((m) => (m.schema.file = "../x.json")).length > 0);
  test("names.schema: a pointer with % fails", () => mutate((m) => (m.types[1].sites = ["#/definitions/a%20b"])).length > 0);
  test("STO-022.02 an unknown member of an entry fails", () => mutate((m) => ((m.types[1] as unknown as Schema).extra = 1)).length > 0);
  test("STO-022.02 an unknown member fails in an entry of each kind", () => {
    const passed = sketch.types.map((_, i) => mutate((m) => ((m.types[i] as unknown as Schema).extra = 1)).length > 0);
    return passed.every(Boolean) || JSON.stringify(passed);
  });
  test("STO-020.01 a manifest that is not an object, or has no format member, gives one manifest failure", () => {
    const outs = [validateManifest([], "{}", "1.2.3"), validateManifest("x", "{}", "1.2.3"), validateManifest(null, "{}", "1.2.3"), validateManifest((({ format: _f, ...rest }) => rest)(sketch), "{}", "1.2.3")];
    return outs.every((o) => o.length === 1 && o[0].startsWith("[manifest]")) || JSON.stringify(outs);
  });
  test("GEN-003.01 format 2 gives one manifest failure that names 2", () => {
    const out = validateManifest({ ...sketch, format: 2 }, "{}", "1.2.3");
    return (out.length === 1 && out[0].startsWith("[manifest]") && out[0].includes("2")) || JSON.stringify(out);
  });
  test("GEN-003.02 format 2 and an unknown member give one failure and no json-schema failure", () => {
    const out = validateManifest({ ...sketch, format: 2, extra: 1 }, "{}", "1.2.3");
    return (out.length === 1 && !out.some((f) => f.startsWith("[json-schema]"))) || JSON.stringify(out);
  });
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
  test("STO-019.02 duplicate name is invalid", () => cross((m) => (m.types[1].name = m.types[0].name), "occurs more than once"));
  test("STO-019.04 reference to a missing entry is invalid", () => cross((m) => (m.types.find((t) => t.kind === "union")!.variants![0].type = "Missing"), "names no entry"));
  test("STO-048.02 unresolvable pointer is invalid", () => cross((m) => (m.types[0].sites = ["#/definitions/missing"]), "does not resolve"));
  test("STO-048.01 a pointer in two entries is invalid", () => cross((m) => (m.types[1].sites = [...m.types[0].sites]), "more than one entry"));
  test("STO-016.03 schema hash mismatch is detected", () => cross((m) => (m.schema.sha256 = "0".repeat(64)), "sha256 does not match"));
  test("GEN-001.02 manifest of another OSCAL release is rejected", () => cross((m) => (m["oscal-release"] = "1.2.4"), "is not 1.2.3"));
  test("STO-021.03 distinguishing property that is not a key fails", () =>
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
