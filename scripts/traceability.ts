/**
 * Checks the traceability record of a binding against its pinned store (openspec/specs/binding-surface, SRF-013).
 * scripts/binding-check.ts calls checkRecord(). Each failure starts with the name of the rule that failed.
 *
 *   npx tsx scripts/traceability.ts --self-test   run the rule scenarios on in-memory records
 */
import fs from "node:fs";
import path from "node:path";

import { Ajv } from "ajv";

import { canonical, parseSpec } from "./spec-ids.js";
import { type Files, SPEC_PATH } from "./spec-markdown.js";

export const RECORD = "openspec/traceability.json";
export const RECORD_SCHEMA = "openspec/traceability.schema.json";
export const INDEX = "openspec/requirements.json";

export interface RequirementIndex {
  requirements: Array<{ id: string }>;
}

interface Entry {
  name: string;
  requirements?: string[];
  "binding-local"?: string;
}

/**
 * Checks `record` against the JSON Schema `schema` and the requirement index `index` of the store. `files` holds the
 * main specs of the binding. `storePrefixes` holds the prefixes of the store ledger.
 */
export function checkRecord(
  record: unknown,
  schema: object,
  index: RequirementIndex,
  files: Files,
  storePrefixes: Set<string>,
): string[] {
  const failures: string[] = [];

  // record-schema: the record conforms to the JSON Schema of the store (SRF-007). The other rules need its shape.
  const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);
  if (!validate(record)) {
    for (const error of validate.errors ?? []) {
      failures.push(`[record-schema] ${error.instancePath || "/"} ${error.message}.`);
    }
    return failures;
  }
  const entries = (record as { operations: Entry[] }).operations;

  // record-contract: each contract identifier names a requirement of the pinned index (SRF-004).
  const indexed = new Set(index.requirements.map((r) => r.id));
  for (const entry of entries) {
    for (const id of entry.requirements ?? []) {
      if (!indexed.has(id)) {
        failures.push(`[record-contract] ${entry.name}: ${id} is not in the requirement index of the store.`);
      }
    }
  }

  // record-local: each binding-local identifier names a live requirement of the binding (SRF-003), and its prefix is
  // not a store prefix (SRF-010).
  const local = new Set<string>();
  for (const [file, text] of Object.entries(files)) {
    if (!SPEC_PATH.test(file)) continue;
    for (const heading of parseSpec(file, text).headings) {
      if (heading.kind === "requirement" && heading.id) local.add(heading.id);
    }
  }
  for (const entry of entries) {
    const id = entry["binding-local"];
    if (id === undefined) continue;
    if (storePrefixes.has(id.split("-")[0])) {
      failures.push(`[record-local] ${entry.name}: ${id} uses a prefix of the store.`);
    } else if (!local.has(canonical(id)!)) {
      failures.push(`[record-local] ${entry.name}: ${id} names no requirement in the main specs of the binding.`);
    }
  }

  // record-duplicate: each operation name is in one entry only (SRF-003).
  const seen = new Map<string, number>();
  for (const entry of entries) seen.set(entry.name, (seen.get(entry.name) ?? 0) + 1);
  for (const [name, count] of seen) {
    if (count > 1) failures.push(`[record-duplicate] operation ${name} is in ${count} entries.`);
  }

  return failures;
}

function selfTest(): number {
  const schema = JSON.parse(fs.readFileSync(RECORD_SCHEMA, "utf8"));
  const index: RequirementIndex = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  const storePrefixes = new Set(index.requirements.map((r) => r.id.split("-")[0]));
  const files: Files = {
    "openspec/specs/python-api/spec.md":
      "# python-api Specification\n\n## Purpose\nTest.\n\n## Requirements\n\n" +
      "### Requirement: PYB-001 Parse with a callback\n\nText.\n\n" +
      "#### Scenario: PYB-001.01 Callback gets the result\n\n- **WHEN** x\n- **THEN** y\n",
  };
  const record = (...operations: unknown[]) => ({ format: 1, operations });
  const valid = record(
    { name: "parse_oscal", requirements: ["PRS-001"] },
    { name: "parse_with_callback", "binding-local": "PYB-001" },
  );

  let failed = 0;
  /** `expect` null: zero failures. Otherwise some failure starts with `[rule]` and contains `needle`. */
  const scenario = (name: string, data: unknown, expect: { rule: string; needle: string } | null) => {
    const out = checkRecord(data, schema, index, files, storePrefixes);
    const ok =
      expect === null
        ? out.length === 0
        : out.some((line) => line.startsWith(`[${expect.rule}]`) && line.includes(expect.needle));
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      ${JSON.stringify(out)}`}`);
  };

  console.log("## traceability record");
  scenario(
    "SRF-013.01 an entry with both kinds of identifier fails the JSON Schema",
    record({ name: "f", requirements: ["PRS-001"], "binding-local": "PYB-001" }),
    { rule: "record-schema", needle: "/operations/0" },
  );
  const retired = record({ name: "build_model", requirements: ["MDL-004"] });
  scenario("SRF-013.02 the retired contract identifier MDL-004 fails", retired, {
    rule: "record-contract",
    needle: "MDL-004",
  });
  scenario("SRF-004.02 the retired requirement MDL-004 does not resolve in the index", retired, {
    rule: "record-contract",
    needle: "MDL-004 is not in the requirement index",
  });
  scenario(
    "SRF-013.03 the binding-local identifier PYB-009 with no heading fails",
    record({ name: "f", "binding-local": "PYB-009" }),
    { rule: "record-local", needle: "PYB-009 names no requirement" },
  );
  scenario(
    "SRF-013.04 an operation name in two entries fails",
    record({ name: "parse_oscal", requirements: ["PRS-001"] }, { name: "parse_oscal", requirements: ["PRS-003"] }),
    { rule: "record-duplicate", needle: "operation parse_oscal" },
  );
  scenario("SRF-013.05 a record with PRS-001 and the live binding-local PYB-001 passes", valid, null);
  scenario("SRF-004.01 the live requirement PRS-001 resolves in the index", valid, null);
  scenario(
    "record-local: a binding-local identifier with a store prefix fails",
    record({ name: "f", "binding-local": "PRS-101" }),
    { rule: "record-local", needle: "PRS-101 uses a prefix of the store" },
  );
  scenario("record-schema: an empty record passes", record(), null);

  console.log(failed ? `\n${failed} FAILED` : "\nall traceability record scenarios pass");
  return failed ? 1 : 0;
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "traceability.ts") {
  if (process.argv.includes("--self-test")) process.exit(selfTest());
  console.error("usage: npx tsx scripts/traceability.ts --self-test");
  process.exit(2);
}
