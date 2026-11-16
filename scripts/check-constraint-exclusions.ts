/**
 * Checks the exclusion list of each OSCAL release in the store (openspec/specs/constraint-validation, CNS-003):
 *
 * 1. manifest/<release>/constraint-exclusions.json conforms to manifest/constraint-exclusions.schema.json.
 * 2. Each item of the lists `excluded` and `cannot-fail` identifies exactly one constraint of metaschema/<release>/.
 *    An item identifies a constraint by its `id`, or, for a constraint without an `id`, by its module, its declaring
 *    definition (`kind:name`) and its kind.
 *
 *   npm run exclusions:check
 *   npm run exclusions:self-test
 */
import fs from "node:fs";
import path from "node:path";
import { Ajv } from "ajv";
import { loadModel, type Constraint } from "./metaschema.js";
import { storeReleases } from "./names-lib.js";

export interface Identity {
  id?: string;
  module?: string;
  definition?: string;
  kind?: string;
}
export type Row = Pick<Constraint, "id" | "module" | "kind"> & { definition: string };
export interface Exclusions {
  excluded: Identity[];
  "cannot-fail": Identity[];
}

const SCHEMA_FILE = "manifest/constraint-exclusions.schema.json";
const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(file, "utf8"));

export const rows = (constraints: Constraint[]): Row[] =>
  constraints.map((c) => ({ id: c.id, module: c.module, kind: c.kind, definition: `${c.def.kind}:${c.def.name}` }));

/** The constraints that an item identifies. */
export function identify(item: Identity, all: Row[]): Row[] {
  if (item.id !== undefined) return all.filter((c) => c.id === item.id);
  return all.filter((c) => c.id === null && c.module === item.module && c.definition === item.definition && c.kind === item.kind);
}
const describe = (item: Identity) => (item.id !== undefined ? `id ${item.id}` : `${item.module} ${item.definition} ${item.kind}`);

export function checkItems(data: Exclusions, all: Row[]): string[] {
  const failures: string[] = [];
  for (const list of ["excluded", "cannot-fail"] as const) {
    for (const item of data[list]) {
      const n = identify(item, all).length;
      if (n !== 1) failures.push(`[${list}] ${describe(item)} identifies ${n} constraints, not 1`);
    }
  }
  return failures;
}

export function checkSchema(schema: object, data: unknown): string[] {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  return validate(data) ? [] : (validate.errors ?? []).map((e) => `[schema] ${e.instancePath || "/"} ${e.message}`);
}

function main(): number {
  const schema = readJson(SCHEMA_FILE) as object;
  let failures: string[] = [];
  for (const release of storeReleases()) {
    const file = `manifest/${release}/constraint-exclusions.json`;
    if (!fs.existsSync(file)) {
      if (fs.existsSync(`metaschema/${release}`)) failures.push(`${file} is missing`);
      continue;
    }
    const data = readJson(file);
    const schemaFailures = checkSchema(schema, data);
    failures = failures.concat(schemaFailures.map((f) => `${file}: ${f}`));
    if (schemaFailures.length) continue;
    failures = failures.concat(checkItems(data as Exclusions, rows(loadModel(release).constraints)).map((f) => `${file}: ${f}`));
  }
  for (const f of failures) console.error(f);
  console.log(failures.length ? `\n${failures.length} exclusion list failure(s)` : "constraint exclusions: ok");
  return failures.length ? 1 : 0;
}

function selfTest(): number {
  const all: Row[] = [
    { id: "a", module: "m", kind: "matches", definition: "assembly:x" },
    { id: "a", module: "m", kind: "matches", definition: "assembly:y" },
    { id: "b", module: "m", kind: "expect", definition: "assembly:x" },
    { id: null, module: "m", kind: "allowed-values", definition: "field:f" },
    { id: null, module: "m", kind: "allowed-values", definition: "flag:g" },
    { id: null, module: "m", kind: "allowed-values", definition: "flag:g" },
  ];
  const schema = readJson(SCHEMA_FILE) as object;
  const issue = "https://github.com/usnistgov/OSCAL/issues/1";
  const doc = (excluded: object[], cannotFail: object[] = []) => ({ format: 1, "oscal-release": "1.2.3", excluded, "cannot-fail": cannotFail });
  const cases: Array<[string, () => boolean | string]> = [];
  const test = (name: string, fn: () => boolean | string) => cases.push([name, fn]);
  test("CNS-003: items that identify one constraint each pass", () => {
    const d = doc([{ id: "b", issue }, { module: "m", definition: "field:f", kind: "allowed-values", issue }], [{ id: "b", reason: "r" }]);
    return (checkSchema(schema, d).length === 0 && checkItems(d, all).length === 0) || JSON.stringify([checkSchema(schema, d), checkItems(d, all)]);
  });
  test("CNS-003.01: an unknown id fails", () => checkItems(doc([{ id: "zz", issue }]) as Exclusions, all).some((f) => f.includes("identifies 0")));
  test("CNS-003: an unknown id in cannot-fail fails", () => checkItems(doc([], [{ id: "zz", reason: "r" }]) as Exclusions, all).some((f) => f.includes("[cannot-fail]")));
  test("CNS-003: an id that two constraints share fails", () => checkItems(doc([{ id: "a", issue }]) as Exclusions, all).some((f) => f.includes("identifies 2")));
  test("CNS-003: a module, definition and kind that two constraints share fails", () =>
    checkItems(doc([{ module: "m", definition: "flag:g", kind: "allowed-values", issue }]) as Exclusions, all).some((f) => f.includes("identifies 2")));
  test("CNS-003: a module, definition and kind never identify a constraint that has an id", () =>
    checkItems(doc([{ module: "m", definition: "assembly:x", kind: "expect", issue }]) as Exclusions, all).some((f) => f.includes("identifies 0")));
  test("CNS-003.02: an item without an issue fails the schema", () => checkSchema(schema, doc([{ id: "b" }])).length > 0);
  test("CNS-003.02: an issue outside usnistgov/OSCAL fails the schema", () =>
    checkSchema(schema, doc([{ id: "b", issue: "https://github.com/other/repo/issues/1" }])).length > 0);
  test("CNS-021: a cannot-fail item without a reason fails the schema", () => checkSchema(schema, doc([], [{ id: "b" }])).length > 0);
  test("an item with an id and a module fails the schema", () => checkSchema(schema, doc([{ id: "b", module: "m", definition: "flag:g", kind: "expect", issue }])).length > 0);
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

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "check-constraint-exclusions.ts") {
  process.exit(process.argv.includes("--self-test") ? selfTest() : main());
}
