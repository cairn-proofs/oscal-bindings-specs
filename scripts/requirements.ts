/**
 * Generates and checks the requirement index openspec/requirements.json (openspec/specs/binding-surface, SRF-006).
 * The index lists each requirement of the main specs with its identifier, capability, and title. A binding checks the
 * contract identifiers of its traceability record against the index of the spec artifact version that it pins.
 *
 *   npm run requirements:write       regenerate openspec/requirements.json
 *   npm run requirements:check       regenerate in memory and compare with the committed file
 *   npm run requirements:self-test   run the generator scenarios on in-memory specs, and check the traceability
 *                                    record JSON Schema openspec/traceability.schema.json (SRF-007) on sample records
 */
import fs from "node:fs";
import path from "node:path";

import { Ajv } from "ajv";

import { type Files, readRepository, SPEC_PATH } from "./spec-markdown.js";
import { ID, parseSpec, render } from "./spec-ids.js";

export const INDEX = "openspec/requirements.json";
export const RECORD_SCHEMA = "openspec/traceability.schema.json";
export const FORMAT = 1;

export interface IndexEntry {
  id: string;
  capability: string;
  title: string;
}

/** Prefix in code-point order, then number. */
function compareIds(a: string, b: string): number {
  const [, pa, na] = ID.exec(a)!;
  const [, pb, nb] = ID.exec(b)!;
  if (pa !== pb) return pa < pb ? -1 : 1;
  return Number(na) - Number(nb);
}

/** The index of the main specs in `files`. No output when a requirement heading has no well-formed identifier. */
export function buildIndex(files: Files): { output?: string; failures: string[] } {
  const failures: string[] = [];
  const entries: IndexEntry[] = [];
  for (const file of Object.keys(files).filter((f) => SPEC_PATH.test(f)).sort()) {
    const capability = SPEC_PATH.exec(file)![1];
    const parsed = parseSpec(file, files[file]);
    failures.push(...parsed.bad.filter((line) => line.startsWith("[requirement-id]")));
    for (const heading of parsed.headings) {
      if (heading.kind !== "requirement" || heading.id === undefined) continue;
      entries.push({ id: render(heading.id), capability, title: heading.text.replace(/^\S+\s+/, "").trim() });
    }
  }
  if (failures.length) return { failures };
  entries.sort((a, b) => compareIds(a.id, b.id));
  return { output: `${JSON.stringify({ format: FORMAT, requirements: entries }, null, 2)}\n`, failures };
}

/** Failures when the committed index is missing or differs from the generator output. */
export function compareIndex(committed: string | undefined, output: string): string[] {
  if (committed === undefined) return [`[index] ${INDEX} does not exist. Run \`npm run requirements:write\`.`];
  if (committed !== output) {
    return [`[index] ${INDEX} differs from the generator output. Run \`npm run requirements:write\` and commit it.`];
  }
  return [];
}

function main(mode: "write" | "check"): number {
  const root = process.cwd();
  const { output, failures } = buildIndex(readRepository(root));
  if (output === undefined) {
    for (const failure of failures) console.error(failure);
    console.error(`${failures.length} failure(s); ${INDEX} was not ${mode === "write" ? "written" : "checked"}`);
    return 1;
  }
  const file = path.join(root, INDEX);
  const count = (JSON.parse(output) as { requirements: unknown[] }).requirements.length;
  if (mode === "write") {
    fs.writeFileSync(file, output);
    console.log(`wrote ${INDEX} (${count} requirements)`);
    return 0;
  }
  const problems = compareIndex(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined, output);
  for (const problem of problems) console.error(problem);
  console.log(problems.length ? `\n${problems.length} requirement index failure(s)` : `requirement index: ok (${count} requirements)`);
  return problems.length ? 1 : 0;
}

function selfTest(): number {
  const spec = (cap: string, body: string) => `# ${cap} Specification\n\n## Purpose\nTest.\n\n## Requirements\n\n${body}`;
  const req = (id: string, title: string) =>
    `### Requirement: ${id} ${title}\n\nText.\n\n#### Scenario: ${id}.01 Example\n\n- **WHEN** x\n- **THEN** y\n\n`;
  const fixture = (): Files => ({
    "openspec/specs/widget-parsing/spec.md": spec(
      "widget-parsing",
      req("WID-010", "Widget size") + req("WID-002", "Widget key form") + req("WID-005", "One widget per type"),
    ),
    "openspec/specs/backmatter-widgets/spec.md": spec("backmatter-widgets", req("BWD-002", "Build a widget hash")),
    "openspec/specs/element-widgets/spec.md": spec("element-widgets", req("EWD-001", "Validate a widget")),
    "openspec/changes/x/specs/widget-parsing/spec.md": spec("widget-parsing", req("WID-099", "Change delta")),
    "docs/guide.md": "### Requirement: DOC-001 Not a spec\n",
  });
  const ids = (output: string | undefined) =>
    output === undefined ? [] : (JSON.parse(output) as { requirements: IndexEntry[] }).requirements.map((e) => e.id);

  let failed = 0;
  const scenario = (name: string, ok: boolean, detail: unknown) => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      ${JSON.stringify(detail)}`}`);
  };

  console.log("## requirement index");
  {
    const { output, failures } = buildIndex(fixture());
    const data = output === undefined ? undefined : JSON.parse(output);
    const entry = data?.requirements.find((e: IndexEntry) => e.id === "WID-002");
    scenario(
      "SRF-006.01: Index entry of a requirement",
      failures.length === 0 &&
        data?.format === FORMAT &&
        JSON.stringify(entry) === JSON.stringify({ id: "WID-002", capability: "widget-parsing", title: "Widget key form" }),
      { failures, entry },
    );
    scenario(
      "identifier order: prefix in code-point order, then number",
      JSON.stringify(ids(output)) === JSON.stringify(["BWD-002", "EWD-001", "WID-002", "WID-005", "WID-010"]),
      ids(output),
    );
    scenario("scope: change deltas and docs are out of scope", !ids(output).includes("WID-099") && !ids(output).includes("DOC-001"), ids(output));
    scenario("format: two-space indentation and a final newline", !!output?.startsWith('{\n  "format": 1,') && output.endsWith("}\n"), output);
    scenario("reproducible: two runs give the same bytes", buildIndex(fixture()).output === output, null);
  }
  {
    const committed = buildIndex(fixture()).output;
    const files = fixture();
    files["openspec/specs/element-widgets/spec.md"] += req("EWD-002", "Report an unknown widget");
    const stale = compareIndex(committed, buildIndex(files).output!);
    scenario("SRF-006.02: Stale index fails the check", stale.some((f) => f.includes("requirements:write")), stale);
    const missing = compareIndex(undefined, committed!);
    scenario("SRF-006.02: Missing index fails the check", missing.some((f) => f.includes("does not exist")), missing);
    scenario("SRF-006.02: Current index passes the check", compareIndex(committed, committed!).length === 0, null);
  }
  {
    const files = fixture();
    files["openspec/specs/widget-parsing/spec.md"] = files["openspec/specs/widget-parsing/spec.md"].replace(
      req("WID-005", "One widget per type"),
      "",
    );
    const out = ids(buildIndex(files).output);
    scenario("SRF-006.03: Retired requirement has no entry", !out.includes("WID-005") && out.includes("WID-010"), out);
  }
  {
    const files = fixture();
    files["openspec/specs/widget-parsing/spec.md"] += "### Requirement: Widget without an identifier\n\nText.\n";
    const { output, failures } = buildIndex(files);
    scenario(
      "malformed heading: no output and a named failure",
      output === undefined && failures.some((f) => f.startsWith("[requirement-id]") && f.includes("Widget without")),
      failures,
    );
  }

  console.log(failed ? `\n${failed} FAILED` : "\nall requirement index scenarios pass");
  return failed + recordSchemaSelfTest() ? 1 : 0;
}

/** Checks openspec/traceability.schema.json (SRF-007) against valid and invalid records. */
function recordSchemaSelfTest(): number {
  const validate = new Ajv({ allErrors: true, strict: true }).compile(JSON.parse(fs.readFileSync(RECORD_SCHEMA, "utf8")));
  const record = (...operations: unknown[]) => ({ format: FORMAT, operations });
  const example = record(
    { name: "parse_oscal", requirements: ["PRS-001", "PRS-003"] },
    { name: "OscalDoc", requirements: ["FAC-001", "FAC-002", "FAC-003", "FAC-004"] },
    { name: "parse_directory", "binding-local": "PYB-001" },
  );
  const cases: Array<[string, unknown, boolean]> = [
    ["design D3 example conforms", example, true],
    ["empty record conforms", record(), true],
    ["SRF-007.01: Entry with both kinds of identifier is invalid", record({ name: "f", requirements: ["PRS-001"], "binding-local": "PYB-001" }), false],
    ["SRF-007.02: Scenario identifier is invalid", record({ name: "f", requirements: ["PRS-001.01"] }), false],
    ["SRF-007.02: Scenario identifier as binding-local is invalid", record({ name: "f", "binding-local": "PYB-001.01" }), false],
    ["unknown member in an entry is invalid", record({ name: "f", requirements: ["PRS-001"], deprecated: true }), false],
    ["unknown member at the top is invalid", { ...example, version: "0.4.0" }, false],
    ["empty requirements list is invalid", record({ name: "f", requirements: [] }), false],
    ["repeated requirement identifier is invalid", record({ name: "f", requirements: ["PRS-001", "PRS-001"] }), false],
    ["entry with no identifier is invalid", record({ name: "f" }), false],
    ["name with a space is invalid", record({ name: "parse oscal", requirements: ["PRS-001"] }), false],
    ["empty name is invalid", record({ name: "", requirements: ["PRS-001"] }), false],
    ["under-padded identifier is invalid", record({ name: "f", requirements: ["PRS-1"] }), false],
    ["unknown format is invalid", { ...example, format: 2 }, false],
  ];
  let failed = 0;
  console.log("\n## traceability record schema");
  for (const [name, data, expected] of cases) {
    const ok = validate(data) === expected;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      ${JSON.stringify(validate.errors)}`}`);
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall traceability record schema scenarios pass");
  return failed;
}

if (process.argv.includes("--self-test")) process.exit(selfTest());
else process.exit(main(process.argv.includes("--write") ? "write" : "check"));
