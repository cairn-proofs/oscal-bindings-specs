/**
 * The binding checker (openspec/specs/binding-surface, SRF-010 and SRF-011). It checks the specs, the identifier
 * ledger and the traceability record of the binding in the current directory against a store: the root directory of
 * the extracted spec artifact that the binding pins. `npm run templates:write` bundles this file into
 * templates/binding/bin/check-binding.mjs, which runs with Node.js and git, and no installed package.
 *
 *   node check-binding.mjs --store <dir> [--record <path>]
 *
 * SPEC_IDS_BASE names the git ref whose scenario identifiers must not vanish (default HEAD). Each failure starts with
 * the name of the rule that failed. The exit code is 1 on a failure, 2 on a usage error, and 0 otherwise.
 */
import fs from "node:fs";
import path from "node:path";

import { checkSpecIds, readBase, storeSpecs } from "./check-spec-ids.js";
import { LEDGER } from "./spec-ids.js";
import { readRepository } from "./spec-markdown.js";
import { checkRecord, INDEX, RECORD, RECORD_SCHEMA } from "./traceability.js";

const USAGE = "usage: node check-binding.mjs --store <dir> [--record <path>]";

/** Runs the binding checker with the arguments `argv` in the directory `cwd`. Gives the exit code. */
export function main(argv: string[], cwd: string): number {
  const option = (name: string) => {
    const at = argv.indexOf(name);
    return at === -1 ? undefined : argv[at + 1];
  };
  const storeDir = option("--store");
  if (storeDir === undefined) {
    console.error(USAGE);
    return 2;
  }
  const store = path.resolve(cwd, storeDir);
  const missing = [LEDGER, "openspec/specs", INDEX, RECORD_SCHEMA].filter((p) => !fs.existsSync(path.join(store, p)));
  if (missing.length) {
    console.error(`${store} is not an extracted spec artifact. It has no ${missing.join(", ")}.`);
    return 2;
  }

  const failures: string[] = [];
  const storeFiles = readRepository(store, [LEDGER]);
  const pinned = storeSpecs(storeFiles, failures);
  if (pinned) {
    const files = readRepository(cwd, [LEDGER]);
    failures.push(...checkSpecIds(files, readBase(cwd, process.env.SPEC_IDS_BASE || "HEAD"), pinned));

    const recordPath = option("--record") ?? RECORD;
    const recordFile = path.resolve(cwd, recordPath);
    if (!fs.existsSync(recordFile)) {
      failures.push(`[record] ${recordPath} does not exist. A binding keeps one traceability record (SRF-003).`);
    } else {
      let record: unknown;
      try {
        record = JSON.parse(fs.readFileSync(recordFile, "utf8"));
      } catch (error) {
        failures.push(`[record] ${recordPath} is not valid JSON: ${(error as Error).message}`);
      }
      if (record !== undefined) {
        const schema = JSON.parse(fs.readFileSync(path.join(store, RECORD_SCHEMA), "utf8"));
        const index = JSON.parse(fs.readFileSync(path.join(store, INDEX), "utf8"));
        failures.push(...checkRecord(record, schema, index, files, new Set(pinned.ledger.prefixes.keys())));
      }
    }
  }

  for (const failure of failures) console.error(failure);
  console.log(failures.length ? `\n${failures.length} binding check failure(s)` : "binding check: ok");
  return failures.length ? 1 : 0;
}

const script = process.argv[1] === undefined ? "" : path.basename(process.argv[1]);
if (script === "binding-check.ts" || script === "check-binding.mjs") {
  process.exit(main(process.argv.slice(2), process.cwd()));
}
