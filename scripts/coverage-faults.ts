/**
 * Measures which corpus cases detect a wrong manifest evaluator (design.md of the report-scenario-checks change, D4 and
 * D5). Each fault is a set of text patches on scripts/constraints-manifest.ts, the RFC 9535 evaluation of the manifest
 * (CNS-022). The runner applies a fault, runs the patched evaluator on the document-level corpus cases of
 * scripts/check-corpus.ts, and lists the cases whose result differs from the expected failures.
 *
 * 1. A patch that does not occur exactly once in the source fails the run, and the failure names the fault.
 * 2. The unpatched evaluator must give the expected failures for each case. Otherwise the run fails.
 * 3. A patched evaluator that throws for a case fails the run.
 * 4. A fault that no case detects fails the run.
 * 5. A fault is valid only when an input that conforms to the schema can change the list of failure identifiers that the
 *    runner compares. A fault that changes only the location, the entry, or the key of a failure is not valid, because the
 *    runner compares the `id` of each failure only.
 *
 * The faults are for `allowed-values` entries only. The report goes to the output, and to $GITHUB_STEP_SUMMARY when that
 * is set.
 *
 *   npm run coverage:faults             run the faults and write the report
 *   npm run coverage:faults:self-test   run the scenarios of the runner
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { constraintMismatch, documentCases, type DocumentInput, loadSchema, readCases } from "./check-corpus.js";
import type { Entry } from "./constraints-lib.js";
import { evaluateManifest, type ManifestFailure } from "./constraints-manifest.js";

const SOURCE = "scripts/constraints-manifest.ts";

export type Evaluate = typeof evaluateManifest;

/** A text to find in the source, and the text to put in its place. */
export interface Patch {
  find: string;
  replace: string;
}

export interface Fault {
  id: string;
  /** The identifier that the fault breaks. A requirement, when no scenario of it states the rule. */
  breaks: string;
  patches: Patch[];
}

/** The first set of faults, from #69. Each patch text occurs once in scripts/constraints-manifest.ts. */
export const FAULTS: Fault[] = [
  {
    id: "no-union",
    breaks: "CNS-017.03",
    patches: [
      { find: "if (!set.entries.includes(i)) set.entries.push(i);", replace: "set.entries.push(i);" },
      { find: "if (reported.has(id)) return; // CNS-017: at most one failure for one location, or for one location and one key", replace: "" },
    ],
  },
  {
    id: "descendant-as-child",
    breaks: "CNS-006",
    patches: [
      { find: "flatMap((q) => runOnData(q))", replace: 'flatMap((q) => runOnData(q.replaceAll("..[", "[").replaceAll("..", ".")))' },
      { find: "e.target.flatMap((q) => run(q, [ctx.value])", replace: 'e.target.flatMap((q) => run(q.replaceAll("..[", "[").replaceAll("..", "."), [ctx.value])' },
      { find: "kf.target.flatMap((q) => run(q, [t.value]))", replace: 'kf.target.flatMap((q) => run(q.replaceAll("..[", "[").replaceAll("..", "."), [t.value]))' },
    ],
  },
  {
    id: "entry-only-set",
    breaks: "CNS-008.01",
    patches: [
      { find: "if (set.some((i) => entries[i].values!.includes(String(value)))) continue;", replace: "" },
      {
        find: 'for (const i of set) if (!entries[i]["allow-other"]) add(i, path);',
        replace: 'for (const i of set) if (!entries[i]["allow-other"] && !entries[i].values!.includes(String(value))) add(i, path);',
      },
    ],
  },
  {
    id: "case-insensitive",
    breaks: "CNS-025.01",
    patches: [
      {
        find: "if (set.some((i) => entries[i].values!.includes(String(value)))) continue;",
        replace: "if (set.some((i) => entries[i].values!.some((v) => v.toLowerCase() === String(value).toLowerCase()))) continue;",
      },
    ],
  },
];

/** The text with each patch applied, or the failures. A patch applies only when its text occurs exactly once. */
export function applyPatches(fault: Fault, source: string): { text?: string; failures: string[] } {
  const failures: string[] = [];
  let text = source;
  for (const [i, patch] of fault.patches.entries()) {
    const count = patch.find === "" ? 0 : text.split(patch.find).length - 1;
    if (count !== 1) {
      failures.push(`[fault ${fault.id}] patch ${i + 1} does not apply: its text occurs ${count} times in ${SOURCE}, not once. The text is: ${patch.find}`);
    } else {
      text = text.replace(patch.find, () => patch.replace);
    }
  }
  return failures.length ? { failures } : { text, failures };
}

/**
 * Loads `evaluateManifest` from patched source text. The file is a `.mts` file in a temporary directory, with each relative
 * import changed to the absolute path of the module in scripts/. `tsx` loads a `.ts` file outside the package as CommonJS,
 * and the import of `json-p3` then fails. A `.mts` file loads as an ES module.
 */
export function loader(root: string): { load: (text: string, id: string) => Promise<Evaluate>; clean: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coverage-faults-"));
  return {
    load: async (text, id) => {
      const absolute = text.replace(/(\bfrom\s+")\.\/([^"]+?)\.js(")/g, (_m, a: string, name: string, c: string) => `${a}${pathToFileURL(path.join(root, "scripts", `${name}.ts`)).href}${c}`);
      const file = path.join(dir, `${id}.mts`);
      fs.writeFileSync(file, absolute);
      return ((await import(pathToFileURL(file).href)) as { evaluateManifest: Evaluate }).evaluateManifest;
    },
    clean: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

export interface Env {
  /** The text of scripts/constraints-manifest.ts. */
  source: string;
  entries: Entry[];
  cases: Array<{ id: string; input: DocumentInput }>;
  /** The unpatched evaluator. */
  evaluate: Evaluate;
  load: (text: string, id: string) => Promise<Evaluate>;
}

export interface FaultResult {
  fault: Fault;
  /** The ids of the cases that detect the fault. */
  detected: string[];
}

const failuresOf = (evaluate: Evaluate, env: Env, input: DocumentInput): ManifestFailure[] => evaluate(env.entries, input.document, { document: true });

/**
 * Runs each fault on each case. A fault that fails to apply or to run is in `failures`, and has no result. A fault that no
 * case detects is in `failures` and in `results`, so the report still lists it.
 */
export async function runFaults(faults: Fault[], env: Env): Promise<{ failures: string[]; results: FaultResult[] }> {
  const failures: string[] = [];
  const results: FaultResult[] = [];
  for (const c of env.cases) {
    let message: string | undefined;
    try {
      message = constraintMismatch(c.input.expected, failuresOf(env.evaluate, env, c.input));
    } catch (error) {
      message = `the unpatched evaluator throws: ${(error as Error).message}`;
    }
    if (message !== undefined) failures.push(`[unpatched] ${c.id}: ${message}`);
  }
  if (failures.length) return { failures, results };
  for (const fault of faults) {
    const applied = applyPatches(fault, env.source);
    if (applied.text === undefined) {
      failures.push(...applied.failures);
      continue;
    }
    let evaluate: Evaluate;
    try {
      evaluate = await env.load(applied.text, fault.id);
    } catch (error) {
      failures.push(`[fault ${fault.id}] the patched evaluator does not load: ${(error as Error).message}`);
      continue;
    }
    const detected: string[] = [];
    let threw = false;
    for (const c of env.cases) {
      try {
        if (constraintMismatch(c.input.expected, failuresOf(evaluate, env, c.input)) !== undefined) detected.push(c.id);
      } catch (error) {
        failures.push(`[fault ${fault.id}] the patched evaluator throws for the case ${c.id}: ${(error as Error).message}`);
        threw = true;
        break;
      }
    }
    if (threw) continue;
    results.push({ fault, detected });
    if (detected.length === 0) {
      failures.push(
        `[fault ${fault.id}] no case detects the fault, which breaks ${fault.breaks}. Add a corpus case that detects it, or remove the fault if no input that conforms to the schema can change the list of failure identifiers.`,
      );
    }
  }
  return { failures, results };
}

/**
 * The report for the output: each fault, the identifier that it breaks, and the number of cases that detect it. A fault
 * that no case detects is a gap. The cases are in `summaryReport`.
 */
export function report(results: FaultResult[]): string[] {
  const lines = ["## Fault detection of the corpus", "", "The faults change the manifest evaluator, and are for allowed-values entries only.", ""];
  for (const [i, { fault, detected }] of results.entries()) {
    const n = detected.length;
    lines.push(
      n === 0
        ? `${i + 1}. Gap: no case detects the fault \`${fault.id}\`, which breaks ${fault.breaks}.`
        : `${i + 1}. The fault \`${fault.id}\` breaks ${fault.breaks}. ${n} case${n === 1 ? "" : "s"} ${n === 1 ? "detects" : "detect"} it.`,
    );
  }
  return lines;
}

/** The report for the job summary: the same lines as `report`, and each case on its own line in a collapsed block. */
export function summaryReport(results: FaultResult[]): string[] {
  const lines = ["## Fault detection of the corpus", "", "The faults change the manifest evaluator, and are for allowed-values entries only.", ""];
  for (const { fault, detected } of results) {
    const n = detected.length;
    if (n === 0) {
      lines.push(`**\`${fault.id}\`** breaks ${fault.breaks}. Gap: no case detects it.`, "");
      continue;
    }
    lines.push(
      `**\`${fault.id}\`** breaks ${fault.breaks}. ${n} case${n === 1 ? "" : "s"} ${n === 1 ? "detects" : "detect"} it.`,
      "",
      `<details><summary>Cases that detect \`${fault.id}\`</summary>`,
      "",
      ...detected.map((id) => `- ${id}`),
      "",
      "</details>",
      "",
    );
  }
  return lines;
}

async function main(): Promise<number> {
  const root = process.cwd();
  const release = fs.readFileSync("VERSION", "utf8").trim().split("+oscal.")[1];
  const entries = (JSON.parse(fs.readFileSync(`manifest/${release}/constraints.json`, "utf8")) as { entries: Entry[] }).entries;
  const { validateDocument } = loadSchema();
  const cases = [...documentCases(readCases(), validateDocument)];
  const { load, clean } = loader(root);
  try {
    const { failures, results } = await runFaults(FAULTS, {
      source: fs.readFileSync(SOURCE, "utf8"),
      entries,
      cases,
      evaluate: evaluateManifest,
      load,
    });
    for (const failure of failures) console.error(failure);
    const lines = report(results);
    console.log(lines.join("\n"));
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryReport(results).join("\n")}\n`);
    console.log(failures.length ? `\n${failures.length} fault failure(s)` : `\nfaults: ok (${FAULTS.length} faults, ${cases.length} cases)`);
    return failures.length ? 1 : 0;
  } finally {
    clean();
  }
}

/** The scenarios of the runner. The first runs the real evaluator, and the rest use stubs. */
async function selfTest(): Promise<number> {
  const root = process.cwd();
  const real = fs.readFileSync(SOURCE, "utf8");
  const failure = (id: string): ManifestFailure => ({ entry: 0, id, location: "$" });
  const byCase = (broken: boolean): Evaluate =>
    ((_entries: Entry[], doc: unknown) => (doc === "c1" ? (broken ? [] : [failure("x")]) : [])) as unknown as Evaluate;
  /** Two cases. The unpatched stub fails the entry x for c1 only. A patched stub with the text BREAK gives no failure. */
  const env = (over: Partial<Env> = {}): Env => ({
    source: "alpha beta alpha gamma",
    entries: [],
    cases: [
      { id: "c1", input: { document: "c1", expected: ["x"] } },
      { id: "c2", input: { document: "c2", expected: [] } },
    ],
    evaluate: byCase(false),
    load: async (text) => byCase(text.includes("BREAK")),
    ...over,
  });
  const fault = (id: string, ...patches: Patch[]): Fault => ({ id, breaks: "WID-001.01", patches });
  const show = (x: unknown) => JSON.stringify(x);

  const cases: Array<[string, () => Promise<boolean | string>]> = [
    ["an empty patch of the real module gives the same failures as the unpatched module, for a case that fails entries", async () => {
      const { validateDocument } = loadSchema();
      const entries = (JSON.parse(fs.readFileSync(`manifest/${fs.readFileSync("VERSION", "utf8").trim().split("+oscal.")[1]}/constraints.json`, "utf8")) as { entries: Entry[] }).entries;
      const chosen = [...documentCases(readCases(), validateDocument)].find((c) => c.input.expected.length > 0);
      if (!chosen) return "no case expects a failure";
      const { load, clean } = loader(root);
      try {
        const patched = await load(real, "empty");
        const a = show(evaluateManifest(entries, chosen.input.document, { document: true }));
        const b = show(patched(entries, chosen.input.document, { document: true }));
        return (a === b && a !== "[]") || `${chosen.id}: ${a} against ${b}`;
      } finally {
        clean();
      }
    }],
    ["each patch of each fault occurs exactly once in scripts/constraints-manifest.ts", async () => {
      const failures = FAULTS.flatMap((f) => applyPatches(f, real).failures);
      return failures.length === 0 || show(failures);
    }],
    ["a patch that does not match fails, and the failure names the fault", async () => {
      const { failures } = await runFaults([fault("f1", { find: "absent", replace: "x" })], env());
      return (failures.length === 1 && failures[0].includes("f1") && failures[0].includes("0 times")) || show(failures);
    }],
    ["a patch that matches twice fails", async () => {
      const { failures, results } = await runFaults([fault("f2", { find: "alpha", replace: "BREAK" })], env());
      return (failures.length === 1 && failures[0].includes("2 times") && results.length === 0) || show(failures);
    }],
    ["an empty text to find fails", async () => {
      const { failures } = await runFaults([fault("f3", { find: "", replace: "x" })], env());
      return failures.length === 1 || show(failures);
    }],
    ["a patched evaluator that throws fails, and the failure names the fault and the case", async () => {
      const { failures } = await runFaults([fault("f4", { find: "beta", replace: "BREAK" })], env({ load: async () => (() => { throw new Error("boom"); }) as unknown as Evaluate }));
      return (failures.length === 1 && failures[0].includes("f4") && failures[0].includes("c1") && failures[0].includes("boom")) || show(failures);
    }],
    ["a patched evaluator that does not load fails", async () => {
      const { failures } = await runFaults([fault("f5", { find: "beta", replace: "BREAK" })], env({ load: async () => { throw new Error("no import"); } }));
      return (failures.length === 1 && failures[0].includes("f5") && failures[0].includes("no import")) || show(failures);
    }],
    ["a case detects a fault when its result changes, and a case with the same result does not", async () => {
      const { failures, results } = await runFaults([fault("f6", { find: "beta", replace: "BREAK" })], env());
      return (failures.length === 0 && show(results[0].detected) === '["c1"]') || show({ failures, results });
    }],
    ["a fault that no case detects fails the run, the failure names the fault and what it breaks, and the report still lists it", async () => {
      const { failures, results } = await runFaults([fault("f7", { find: "beta", replace: "same" })], env());
      const lines = report(results).join("\n");
      return (
        failures.length === 1 &&
        failures[0].includes("f7") &&
        failures[0].includes("WID-001.01") &&
        results.length === 1 &&
        results[0].detected.length === 0 &&
        lines.includes("Gap: no case detects the fault `f7`, which breaks WID-001.01.")
      ) || show({ failures, lines });
    }],
    ["the unpatched evaluator that differs from the expected failures fails the run, and no fault runs", async () => {
      const { failures, results } = await runFaults([fault("f8", { find: "beta", replace: "BREAK" })], env({ evaluate: byCase(true) }));
      return (failures.length === 1 && failures[0].startsWith("[unpatched] c1") && results.length === 0) || show(failures);
    }],
    ["the report for the output names each fault, what it breaks, and the number of cases, and lists no case", async () => {
      const lines = report([{ fault: fault("f9"), detected: ["a", "b"] }, { fault: fault("f10"), detected: ["c"] }]).join("\n");
      return (lines.includes("The fault `f9` breaks WID-001.01. 2 cases detect it.") && lines.includes("The fault `f10` breaks WID-001.01. 1 case detects it.") && !lines.includes("- a")) || lines;
    }],
    ["the report for the job summary lists each case on its own line, in a block for each fault, and shows a gap with no block", async () => {
      const lines = summaryReport([{ fault: fault("f9"), detected: ["a", "b"] }, { fault: fault("f11"), detected: [] }]);
      const text = lines.join("\n");
      return (
        lines.includes("- a") &&
        lines.includes("- b") &&
        text.includes("<details><summary>Cases that detect `f9`</summary>") &&
        text.includes("**`f11`** breaks WID-001.01. Gap: no case detects it.") &&
        !text.includes("Cases that detect `f11`")
      ) || text;
    }],
  ];

  let failed = 0;
  for (const [name, fn] of cases) {
    let out: boolean | string;
    try {
      out = await fn();
    } catch (error) {
      out = `threw ${(error as Error).stack}`;
    }
    if (out !== true) failed++;
    console.log(`${out === true ? "PASS" : "FAIL"}  ${name}${out === true || out === false ? "" : `\n      ${out}`}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  return failed ? 1 : 0;
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "coverage-faults.ts") {
  process.exit(await (process.argv.includes("--self-test") ? selfTest() : main()));
}
