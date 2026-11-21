/**
 * Generates and checks the constraint manifest of each OSCAL release in the store (openspec/specs/constraint-validation,
 * CNS-004). The inputs of manifest/<release>/constraints.json are metaschema/<release>/, manifest/<release>/names.json,
 * schemas/<release>/oscal_complete_schema.json and manifest/<release>/constraint-exclusions.json.
 *
 *   npm run constraints:write       regenerate each constraints.json
 *   npm run constraints:check       validate each file, regenerate in memory, and compare with the committed file
 *   npm run constraints:self-test   run the rule scenarios
 */
import fs from "node:fs";
import path from "node:path";
import { Ajv } from "ajv";
import { check } from "iregexp-check";
import { checkFailures, checkQueries, unitsOf } from "./constraints-check.js";
import { corpusDocuments, elementsOf, generatedDocuments } from "./constraints-docs.js";
import { Generator, serializeManifest, type ConstraintManifest, type Entry } from "./constraints-lib.js";
import { evaluateManifest } from "./constraints-manifest.js";
import { GenerationError, toIRegexp, datatypeIRegexp } from "./constraints-regex.js";
import { compile, run, runOnce } from "./jsonpath.js";
import { compareLocations, inLocationOrder } from "./location-order.js";
import { allNodes, loadDoc } from "./metapath.js";
import type { Constraint } from "./metaschema.js";
import { storeReleases } from "./names-lib.js";

const SCHEMA_FILE = "manifest/constraints.schema.json";
const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(file, "utf8"));
const fileOf = (release: string) => `manifest/${release}/constraints.json`;

export function checkSchema(schema: object, data: unknown): string[] {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  return validate(data) ? [] : (validate.errors ?? []).map((e) => `[schema] ${e.instancePath || "/"} ${e.message}`);
}

/** The queries of an entry. */
export const queriesOf = (e: Entry): string[] => [
  ...e.context.document,
  ...Object.values(e.context.elements).flat(),
  ...e.target,
  ...(e["key-fields"] ?? []).flatMap((k) => k.target),
  ...(e.test ? [e.test] : []),
];

/** The I-Regexp patterns of an entry: its pattern, and the patterns of the function `match()` in its queries. */
export function patternsOf(e: Entry): string[] {
  const out: string[] = e.pattern === undefined ? [] : [e.pattern];
  const re = /match\((?:[^,'[]|\[[^\]]*\]|'(?:[^'\\]|\\.)*')*?, '((?:[^'\\]|\\.)*)'\)/g;
  for (const q of queriesOf(e)) for (const m of q.matchAll(re)) out.push(m[1].replace(/\\\\/g, "\\").replace(/\\'/g, "'"));
  return out;
}

/** The failures of a manifest: the JSON Schema, the RFC 9535 syntax of each query, and the I-Regexp of each pattern. */
export function checkManifest(schema: object, data: unknown): string[] {
  const failures = checkSchema(schema, data);
  if (failures.length) return failures;
  for (const [i, e] of (data as ConstraintManifest).entries.entries()) {
    const at = `entry ${i} (${e.id ?? "no id"}, ${e.kind} on ${e.definition})`;
    for (const q of queriesOf(e)) {
      try {
        compile(q);
      } catch (error) {
        failures.push(`${at}: the query ${q} is not accepted: ${(error as Error).message}`);
      }
    }
    // CNS-024: a target query runs on an array that holds only the context node, and selects only the context node or
    // nodes in it. On an array, only a query with no segment (`$`) selects the array itself.
    for (const q of e.target) {
      try {
        if (compile(q).segments.length === 0) failures.push(`${at}: the target query ${q} selects the array that holds the context node`);
      } catch {
        // The loop above reports a query that is not accepted.
      }
    }
    for (const p of patternsOf(e)) if (!check(p)) failures.push(`${at}: the pattern ${p} is not an I-Regexp`);
  }
  return failures;
}

/** CNS-019 and CNS-022: the queries and the failures of the manifest on the generated and the corpus documents. */
function checkAgainstReference(gen: Generator, entries: Entry[]): string[] {
  const schemaFile = `schemas/${gen.release}/oscal_complete_schema.json`;
  const docs = [
    ...generatedDocuments(gen.model, schemaFile, (d, n) => gen.schemaHoldsFlag(d, n)),
    ...corpusDocuments(gen.model, schemaFile, `corpus/${gen.release}/documents/valid`),
  ];
  const units = unitsOf(docs, elementsOf(docs, gen.targets().values(), gen.model));
  const { selected } = gen.select();
  return [...checkQueries(selected, entries, units), ...checkFailures(selected, entries, units)];
}

/** CNS-004: the problems of a committed manifest file, given the text that the generation gives. */
export function checkCommitted(schema: object, file: string, committed: string | undefined, output: string): string[] {
  const problems = committed === undefined ? [`${file} does not exist`] : checkManifest(schema, JSON.parse(committed));
  if (committed !== undefined && committed !== output) problems.push(`${file} differs from the generator output. Run npm run constraints:write.`);
  return problems;
}

function main(mode: "write" | "check"): number {
  const schema = readJson(SCHEMA_FILE) as object;
  let failed = 0;
  for (const release of storeReleases()) {
    if (!fs.existsSync(`metaschema/${release}`)) continue;
    const file = fileOf(release);
    const generator = new Generator(release);
    const result = generator.generate();
    if (!result.manifest) {
      for (const f of result.failures) console.error(`${release}: ${f}`);
      console.error(`${release}: ${result.failures.length} failure(s); ${file} was not ${mode === "write" ? "written" : "checked"}`);
      failed++;
      continue;
    }
    const output = serializeManifest(result.manifest);
    const entries = result.manifest.entries;
    if (mode === "write") {
      fs.writeFileSync(file, output);
      console.log(`${release}: wrote ${file} (${entries.length} entries, ${entries.filter((e) => e.reportable).length} reportable)`);
      continue;
    }
    const committed = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
    const problems = checkCommitted(schema, file, committed, output);
    if (problems.length === 0) problems.push(...checkAgainstReference(generator, entries));
    for (const p of problems) console.error(`${release}: ${p}`);
    if (problems.length) failed++;
    else console.log(`${release}: ${file} matches the generator output`);
  }
  return failed ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Self-test

function selfTest(): number {
  const schema = readJson(SCHEMA_FILE) as object;
  const gen = new Generator("1.2.3");
  const result = gen.generate();
  const manifest = result.manifest!;
  const entries = manifest.entries;
  const byId = (id: string, kind?: string) => entries.filter((e) => e.id === id && (kind === undefined || e.kind === kind));
  const one = (id: string, kind?: string) => {
    const found = byId(id, kind);
    if (found.length !== 1) throw new Error(`${found.length} entries with the id ${id}`);
    return found[0];
  };
  const { selected, cannotFail } = gen.select();
  const inputs = { partial: new Set(["by-component-uuid"]), cannotFail, elementTypesOf: gen.elementTypesOfAllowedValues(selected) };
  const model = gen.model;
  const base = (id: string) => model.constraints.find((c) => c.id === id)!;
  /** A constraint made for a test, declared on the definition of the constraint `like`. */
  const custom = (like: string, fields: Partial<Constraint>): Constraint => ({ ...base(like), id: "custom", target: ".", ...fields });
  const failsBuild = (c: Constraint, needle: string) => {
    try {
      gen.buildEntry(c, inputs);
      return "the build did not fail";
    } catch (error) {
      return (error instanceof GenerationError && error.message.includes(needle)) || `${error}`;
    }
  };
  const matchAll = (pattern: string, values: string[]) => run(`$[?match(@, '${pattern.replace(/\\/g, "\\\\")}')]`, values).map((h) => h.value);
  const edited = (fn: (m: ConstraintManifest) => void) => {
    const m = JSON.parse(JSON.stringify(manifest)) as ConstraintManifest;
    fn(m);
    return m;
  };
  const cases: Array<[string, () => boolean | string]> = [];
  const test = (name: string, fn: () => boolean | string) => cases.push([name, fn]);

  test("D5: the generation succeeds and gives 319 entries, of which 233 are reportable", () =>
    (result.failures.length === 0 && entries.length === 319 && entries.filter((e) => e.reportable).length === 233) || JSON.stringify([result.failures, entries.length]));
  test("CNS-004.02: the manifest conforms to its JSON Schema", () => checkSchema(schema, manifest).length === 0 || JSON.stringify(checkSchema(schema, manifest).slice(0, 3)));
  test("CNS-004.02: a manifest that does not conform fails the check", () =>
    checkManifest(schema, edited((m) => delete (m.entries[0] as Partial<Entry>).kind)).length > 0 &&
    checkManifest(schema, edited((m) => m.entries.push({ ...m.entries[0], bogus: 1 } as Entry))).length > 0 &&
    checkManifest(schema, edited((m) => (m.format = 2))).length > 0);
  const committedText = fs.readFileSync(fileOf("1.2.3"), "utf8");
  const generated1 = serializeManifest(manifest);
  test("CNS-004.01: the committed manifest is the result of the generation, so the check passes", () =>
    checkCommitted(schema, fileOf("1.2.3"), committedText, generated1).length === 0 || JSON.stringify(checkCommitted(schema, fileOf("1.2.3"), committedText, generated1).slice(0, 3)));
  test("CNS-004.01: a manifest that a person edits by hand differs from the generation and fails the check", () => {
    const edit = committedText.replace('"reportable": true', '"reportable": false');
    const problems = checkCommitted(schema, fileOf("1.2.3"), edit, generated1);
    return (edit !== committedText && problems.length === 1 && problems[0].includes("differs from the generator output")) || JSON.stringify(problems);
  });
  test("CNS-004.01: an edit that changes only the layout of the file fails the check", () =>
    checkCommitted(schema, fileOf("1.2.3"), `${committedText}\n`, generated1).some((p) => p.includes("differs from the generator output")));
  test("CNS-004.01: a manifest file that does not exist fails the check", () => checkCommitted(schema, fileOf("1.2.3"), undefined, generated1).some((p) => p.includes("does not exist")));
  test("CNS-006: a pattern that is not an I-Regexp fails the check", () => checkManifest(schema, edited((m) => (m.entries.find((e) => e.id === "oscal-check-hash-length-SHA2-3-256")!.pattern = "\\d+"))).length > 0);
  test("CNS-006: every query compiles and every pattern is an I-Regexp", () => checkManifest(schema, manifest).length === 0);
  test("CNS-005.01: the manifest holds no entry of the level WARNING", () => entries.every((e) => e.level === "ERROR" || e.level === "CRITICAL"));
  test("CNS-005.02: the manifest holds no excluded constraint", () =>
    gen.exclusions.excluded.every((x) => !("id" in x) || byId(x.id!).length === 0) && byId("oscal-metadata-action-type-values").length === 0);
  test("CNS-005: two entries can have the same id", () => byId("oscal-metadata-prop-name-values").length === 2);

  // CNS-021
  test("CNS-021.01: an open allowed-values entry is not reportable", () => !one("oscal-assessment-part-values").reportable);
  test("CNS-021: an allowed-values entry that the JSON Schema enforces is not reportable", () => !one("oscal-timing-unit-values").reportable);
  test("CNS-021: a closed allowed-values entry that the schema does not enforce is reportable", () => one("oscal-control-prop-name").reportable);
  test("CNS-021.02: an entry that the list cannot-fail names is not reportable", () => !one("oscal-profile-req-merge-combine").reportable && !one("oscal-diagram-datatype-uri-reference").reportable);
  test("CNS-021: an index-has-key entry with a partial index is not reportable", () => !one("oscal-by-component-uuid-index").reportable);
  test("CNS-021: the entries without an id are not reportable", () => entries.filter((e) => e.id === null).every((e) => !e.reportable) && entries.filter((e) => e.id === null).length === 9);
  test("CNS-021: the generation fails for a reportable entry without an id", () => failsBuild(custom("oscal-parameter-depends-on-deprecated", { id: null }), "no id"));

  // D9, CNS-014, CNS-015
  test("CNS-014.02: the index entry with a doc() branch states that its index is partial", () => one("oscal-ssp-by-component-uuid-index").partial === true && one("oscal-index-metadata-party-uuid", "index").partial === false);
  test("CNS-007.01: the target queries of that entry select the nodes of the same document", () => !one("oscal-ssp-by-component-uuid-index").target.some((q) => q.includes("doc")));

  // D7, CNS-012, CNS-013
  test("CNS-012.02: a key field with the pattern #(.*) has the prefix #", () => JSON.stringify(one("oscal-by-component-uuid-index")["key-fields"]![0].prefix) === '"#"');
  test("D7.3: a key field can select several values in an index-has-key entry", () =>
    one("oscal-index-inventory-item-responsible-party-party-uuid")["key-fields"]![0].target.some((q) => q.includes("[*]")));
  test("D7.4: the generation fails for a key field of an is-unique entry that can select several values", () =>
    failsBuild(custom("oscal-metadata-responsible-party-index-metadata-role-id", { kind: "is-unique", target: ".", keyFields: [{ target: "party-uuid" }] }), "several values"));
  test("D7.4: the generation fails for a key field of an index entry that can select several values", () =>
    failsBuild(custom("oscal-metadata-responsible-party-index-metadata-role-id", { kind: "index", target: ".", indexName: "x", keyFields: [{ target: "party-uuid" }] }), "several values"));
  test("the generation fails for a key-field pattern that is not a literal prefix and (.*)", () =>
    failsBuild(custom("oscal-by-component-uuid-index", { keyFields: [{ target: "@href", pattern: "#(.+)" }] }), "literal prefix") === true &&
    failsBuild(custom("oscal-by-component-uuid-index", { keyFields: [{ target: "@href", pattern: "(#|!)(.*)" }] }), "literal prefix") === true);

  // CNS-010, D11
  test("D11: the anchors are removed, and (?: is written as (", () => toIRegexp("^(?:ab|c)+$") === "(ab|c)+");
  test("D11: \\S is written as a character class", () => toIRegexp("\\S(.*\\S)?") === "[^ \\t\\n\\r](.*[^ \\t\\n\\r])?");
  test("D11: a comma moves out of a character class", () => toIRegexp("[a,b]") === "([ab]|,)" && matchAll(toIRegexp("[a,b]"), ["a", ",", "b", "c"]).length === 3);
  test("D11: a literal hyphen moves to the end of its character class", () => toIRegexp("[a-z-.]") === "[a-z.-]" && toIRegexp("[-ab]") === "[ab-]");
  test("D11: an escaped hyphen and a range stay", () => toIRegexp("[a-zA-Z0-9+\\-.]") === "[a-zA-Z0-9+\\-.]");
  test("CNS-010: the generation fails for a pattern that is not an I-Regexp", () => failsBuild(custom("oscal-check-hash-length-SHA2-3-256", { regex: "\\d+" }), "not an I-Regexp"));
  test("CNS-010: the generation fails for a datatype without a pattern", () => failsBuild(custom("oscal-check-hash-length-SHA2-3-256", { regex: undefined, datatype: "nothing" }), "has no pattern"));
  test("D11: the integer pattern rejects `high` and accepts a signed integer", () => {
    const p = datatypeIRegexp("1.2.3", "integer");
    return JSON.stringify(matchAll(p, ["high", "5", "-7", "+3", "", "1.5"])) === '["5","-7","+3"]';
  });
  test("D11: the vendored IPv4 pattern is used as written", () => matchAll(datatypeIRegexp("1.2.3", "ip-v4-address"), ["10.0.0.1", "10.0.0", "999.1.1.1"]).join() === "10.0.0.1");
  test("CNS-010: the hash entry matches the full value", () => {
    const e = one("oscal-check-hash-length-SHA2-3-256");
    return matchAll(e.pattern!, ["a".repeat(64), "a".repeat(63), "a".repeat(65), `${"a".repeat(63)}g`]).length === 1;
  });

  // CNS-007, CNS-009, D8
  test("CNS-007.02: an element of the type hash has context queries for the hash entries", () => {
    const e = one("oscal-check-hash-length-SHA2-3-256");
    const q = e.context.elements["hash"];
    return (q !== undefined && q.some((x) => run(x, [{ algorithm: "SHA-256", value: "x" }]).length === 1)) || JSON.stringify(q);
  });
  test("CNS-007: the document context queries select the instances of the declaring definition", () => {
    const e = one("oscal-check-hash-length-SHA2-3-256");
    const doc = { catalog: { "back-matter": { resources: [{ rlinks: [{ hashes: [{ algorithm: "SHA-256", value: "x" }] }] }] } } };
    return e.context.document.flatMap((q) => run(q, doc)).length === 1;
  });
  test("CNS-009.01: the property entry has no element context queries for the type property", () => {
    const e = byId("oscal-metadata-prop-name-values").find((x) => x.definition === "assembly:property")!;
    return e.context.elements["property"] === undefined && e.context.elements["control"] !== undefined;
  });
  test("CNS-009: an entry on a control has element context queries for the type control", () => one("oscal-control-prop-name").context.elements["control"] !== undefined);
  test("CNS-007: a document context query of a root assembly selects the root", () => one("oscal-catalog-parts").context.document.join() === "$['catalog']");
  test("D8: the elements of the index entries are kept, and an element context query runs on an array", () =>
    Object.values(one("oscal-catalog-parts").context.elements).every((qs) => qs.every((q) => q.startsWith("$"))) );
  test("CNS-007: the entries on a flag select the flag of each definition that has it", () => {
    const e = byId("oscal-assessment-part-values")[0];
    return e.definition === "flag:name" && e.context.document.length > 0 && e.context.document.every((q) => q.endsWith("['name']"));
  });
  test("CNS-024: a target query that selects the array that holds the context node fails the check", () => {
    const withTarget = (q: string) => edited((m) => (m.entries[0].target = [q]));
    const bad = checkManifest(schema, withTarget("$"));
    return (bad.length === 1 && bad[0].includes("selects the array that holds the context node") && checkManifest(schema, withTarget("$[0]")).length === 0) || JSON.stringify(bad);
  });
  // runOnce is a speed-up of the constraint checks. It must give what run gives, for its own data only.
  test("runOnce gives the hits of run, and the same array for a repeated query", () => {
    const data = { a: [{ n: 1 }, { n: 2 }], b: { n: 3 } };
    const once = runOnce(data);
    return (
      JSON.stringify(once("$..n")) === JSON.stringify(run("$..n", data)) &&
      once("$..n") === once("$..n") &&
      JSON.stringify(once("$.a[0]")) === JSON.stringify(run("$.a[0]", data))
    );
  });
  test("runOnce keeps the results of different data apart", () => {
    const first = runOnce({ n: 1 });
    const second = runOnce({ n: 2 });
    return (first("$.n")[0]?.value === 1 && second("$.n")[0]?.value === 2) || JSON.stringify([first("$.n"), second("$.n")]);
  });
  // CNS-006.01: the nodes of several queries of one entry are one set, with each node once.
  const synthetic = (fields: Partial<Entry>): Entry => ({
    id: "synthetic",
    kind: "has-cardinality",
    level: "ERROR",
    reportable: true,
    module: "m",
    definition: "assembly:location",
    context: { document: ["$..['locations'][*]"], elements: {} },
    target: ["$[0]['title']"],
    ...fields,
  });
  const locations = (...items: object[]) => ({ catalog: { metadata: { locations: items } } });
  test("CNS-006.01: two target queries that select the same node count the node once", () => {
    const entry = synthetic({ "max-occurs": 1, target: ["$[0]['title']", "$[0]['title']", "$[0]['address']"] });
    const one = evaluateManifest([entry], locations({ uuid: "u", title: "t" }), { document: true });
    const two = evaluateManifest([entry], locations({ uuid: "u", title: "t", address: {} }), { document: true });
    return (one.length === 0 && two.length === 1) || JSON.stringify([one, two]);
  });
  test("CNS-006.01: two queries of a key field that select the same node give one value", () => {
    const entry = synthetic({ kind: "is-unique", target: ["$[0]"], "key-fields": [{ target: ["$[0]['uuid']", "$[0]['uuid']"] }] });
    const r = evaluateManifest([entry], locations({ uuid: "u" }), { document: true });
    return r.length === 0 || JSON.stringify(r);
  });

  // CNS-023.01: the element queries of mapping-collection-mappings are those of mapping, and a list is checked item by item.
  test("CNS-023.01: the element context queries of mapping-collection-mappings are those of mapping", () => {
    const withQueries = entries.filter((e) => e.context.elements["mapping"] !== undefined || e.context.elements["mapping-collection-mappings"] !== undefined);
    return (
      (withQueries.length > 0 && withQueries.every((e) => JSON.stringify(e.context.elements["mapping"]) === JSON.stringify(e.context.elements["mapping-collection-mappings"]))) ||
      "an entry has other queries for the single-or-many type than for its item type"
    );
  });
  test("CNS-023.01: the queries apply to each of the two mappings of a list, on an array that holds only the mapping", () => {
    const list = [{ uuid: "a" }, { uuid: "b", props: [{ name: "bogus", value: "v" }] }];
    const form = { element: "mapping-collection-mappings" };
    const perItem = list.map((item) => evaluateManifest(entries, [item], form).map((f) => `${f.id} ${f.location}`));
    return (
      JSON.stringify(perItem) === JSON.stringify([[], ["oscal-metadata-prop-name-values $[0]['props'][0]['name']"]]) || JSON.stringify(perItem)
    );
  });
  // The three inputs of design D5. Their failures and locations are derived by hand from CNS-026, not from an evaluator.
  const orderCase = (file: string, expected: string[]) => () => {
    const json = readJson(`corpus/1.2.3/documents/invalid/${file}`);
    const got = evaluateManifest(entries, json, { document: true })
      .map((f) => `${f.id} ${f.location}`)
      .sort();
    return JSON.stringify(got) === JSON.stringify(expected) || JSON.stringify(got);
  };
  test(
    "CNS-014.04: a control inside the first control, with the id of the second control, gives the failure at the second control",
    orderCase("index-nested-control-id.json", ["oscal-catalog-controls $['catalog']['controls'][1]", "oscal-catalog-groups-controls-parts $['catalog']['controls'][1]"]),
  );
  test(
    "CNS-014.03: parts in the members `groups` and `controls`, with `groups` first in the document, give the failure at the part in `groups`",
    orderCase("index-parts-in-two-members.json", ["oscal-catalog-groups-controls-parts $['catalog']['groups'][0]['parts'][0]", "oscal-catalog-parts $['catalog']['groups'][0]['parts'][0]"]),
  );
  test(
    "CNS-026.01: two controls with the same id at the indexes 2 and 10 give the failure at the index 10",
    orderCase("index-control-ids-2-and-10.json", ["oscal-catalog-controls $['catalog']['controls'][10]", "oscal-catalog-groups-controls-parts $['catalog']['controls'][10]"]),
  );

  // CNS-026: the order of locations. No corpus input can hold the names of CNS-026.02 and CNS-026.03 (design Context 9).
  const before = (a: string, b: string) => compareLocations(a, b) < 0 && compareLocations(b, a) > 0;
  test("CNS-026.01: the index 2 comes before the index 10", () => before("$['a'][2]", "$['a'][10]") || "the order is the order of the text");
  test("CNS-026.02: the name `B` comes before the name `a`, because U+0042 is less than U+0061", () => before("$['B']", "$['a']") || "the order is the order of the text of the names");
  test("CNS-026.03: the name U+FF5E comes before the name U+1F600, by code point and not by UTF-16 code unit", () => {
    const bmp = "～";
    const astral = "\u{1F600}";
    return (before(`$['${bmp}']`, `$['${astral}']`) && astral < bmp) || "the order is the order of UTF-16 code units";
  });
  test("CNS-026.04: the location `$['a']` comes before the location `$['a']['b']`", () => before("$['a']", "$['a']['b']"));
  test("CNS-026: a name segment compares as the name that it gives, and not as its escaped text", () => {
    // The text of `a'` is `a\'`, and `\` (U+005C) is greater than `'` (U+0027) and less than `b`.
    return before("$['a']", "$['a\\'']") && before("$['a\\'']", "$['ab']") && before("$['\\u0041']", "$['B']") && compareLocations("$['\\u0041']", "$['A']") === 0;
  });
  test("CNS-026: the first segment that differs decides the order, and equal locations have no order", () =>
    before("$['a'][9]['z']", "$['b'][0]['a']") && compareLocations("$['a'][1]", "$['a'][1]") === 0 && before("$[0][1]", "$[0][1]['props']"));
  test("CNS-026: inLocationOrder sorts by location and is stable for equal locations", () => {
    const sorted = inLocationOrder(
      [
        { at: "$['a'][10]", n: 1 },
        { at: "$['a'][2]", n: 2 },
        { at: "$['a'][2]", n: 3 },
      ],
      (x) => x.at,
    );
    return JSON.stringify(sorted.map((x) => x.n)) === "[2,3,1]" || JSON.stringify(sorted);
  });
  test("CNS-023.02: a failure in the second item of a list has the location of the item in the list, then the rest of its location", () => {
    const list = [{ uuid: "a" }, { uuid: "b", props: [{ name: "bogus", value: "v" }] }];
    const got = evaluateManifest(entries, [list], { element: "mapping-collection-mappings" })
      .filter((f) => f.id === "oscal-metadata-prop-name-values")
      .map((f) => f.location);
    return JSON.stringify(got) === JSON.stringify(["$[0][1]['props'][0]['name']"]) || JSON.stringify(got);
  });
  test("CNS-007: the element types of kind document hold context nodes",() => one("oscal-catalog-parts").context.elements["catalog-document"] !== undefined);

  // CNS-019, CNS-022: the checks against the reference evaluator
  const schemaFile = "schemas/1.2.3/oscal_complete_schema.json";
  const generated = generatedDocuments(model, schemaFile, (d, n) => gen.schemaHoldsFlag(d, n));
  const units = unitsOf(generated, []);
  const position = (e: Entry) => entries.indexOf(e);
  const alone = (e: Entry, edit: (copy: Entry) => void) => {
    const copy = JSON.parse(JSON.stringify(e)) as Entry;
    edit(copy);
    return { constraints: [selected[position(e)]], entries: [copy] };
  };
  const hash = one("oscal-check-hash-length-SHA2-3-256");
  const hashDoc = (value: string) => {
    const json = { catalog: { "back-matter": { resources: [{ rlinks: [{ hashes: [{ algorithm: "SHA-256", value }] }] }] } } };
    return unitsOf([{ name: "hash", json, tree: loadDoc(json, model.roots), nodes: allNodes(loadDoc(json, model.roots)) }], []);
  };
  test("CNS-019: the generated documents conform to the schema and hold both forms of mappings", () =>
    generated.some((d) => JSON.stringify(d.json).includes('"mappings":{')) && generated.some((d) => JSON.stringify(d.json).includes('"mappings":[')));
  test("CNS-019: the query check passes for the unchanged entry", () => {
    const { constraints, entries: es } = alone(hash, () => {});
    return checkQueries(constraints, es, units).length === 0;
  });
  test("CNS-019.01: the query check fails for a context query that selects a node of another definition", () => {
    const { constraints, entries: es } = alone(hash, (c) => c.context.document.push("$..['rlinks'][*]"));
    return checkQueries(constraints, es, units).some((m) => m.includes("no context node")) || "the check passed";
  });
  test("CNS-019: the query check fails for a flag query that misses the singleton form of mappings", () => {
    const flag = entries.find((e) => e.definition === "flag:status" && e.context.document.some((q) => q.includes("['mappings']['status']")))!;
    const both = alone(flag, () => {});
    const list = alone(flag, (c) => (c.context.document = c.context.document.filter((q) => q.includes("['mappings'][*]"))));
    return checkQueries(both.constraints, both.entries, units).length === 0 && checkQueries(list.constraints, list.entries, units).some((m) => m.includes("miss")) || "the check passed";
  });
  test("CNS-022: the failure check passes for a valid hash and a wrong one", () => {
    const { constraints, entries: es } = alone(hash, () => {});
    return checkFailures(constraints, es, hashDoc("a".repeat(64))).length === 0 && checkFailures(constraints, es, hashDoc("a".repeat(63))).length === 0;
  });
  test("CNS-022.01: the failure check fails for a pattern that rejects a valid value", () => {
    const { constraints, entries: es } = alone(hash, (c) => (c.pattern = "[0-9a-f]{63}"));
    return checkFailures(constraints, es, hashDoc("a".repeat(64))).length > 0 || "the check passed";
  });

  let failed = 0;
  for (const [name, fn] of cases) {
    let out: boolean | string;
    try {
      out = fn();
    } catch (error) {
      out = `threw ${(error as Error).stack}`;
    }
    const ok = out === true;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || out === false ? "" : `\n      ${out}`}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  return failed ? 1 : 0;
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "constraints.ts") {
  process.exit(process.argv.includes("--self-test") ? selfTest() : main(process.argv.includes("--write") ? "write" : "check"));
}
