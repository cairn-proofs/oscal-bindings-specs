/**
 * Runs the steps of `npm run check` at the same time. The steps are the `npm run <script>` commands that the `check`
 * script of package.json joins with `&&`, so the list exists in one place. Each step reads the repository and writes
 * nothing to it, so the order of the steps does not matter. `npm run check` stays the serial gate. This script is for
 * CI and for a quick local run.
 *
 * 1. A worker pool runs at most `--jobs` steps at a time. The default is the number of CPUs.
 * 2. A step that fails stops the start of new steps. The steps that run already finish. The script prints the output
 *    of each failed step, then a table of the steps with their times.
 * 3. A step passes when its process exits with 0. The script prints the output of a passing step only with `--verbose`.
 *
 *   npm run check:parallel                  run each step of the check script
 *   npm run check:parallel -- --jobs 4      limit the steps that run at once
 *   npm run check:parallel:self-test        run the self-test
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

export interface StepResult {
  step: string;
  code: number;
  output: string;
  ms: number;
}

/** Runs one step and gives its result. The default runs `npm run <step>` and keeps the output of the process. */
export type Exec = (step: string) => Promise<StepResult>;

const STEP = /^npm run ([\w:-]+)$/;

/** The script names of the steps in the `check` script of a package.json text. Throws when a step is not `npm run <name>`. */
export function parseSteps(packageJson: string): string[] {
  const check = (JSON.parse(packageJson) as { scripts?: Record<string, string> }).scripts?.check;
  if (check === undefined) throw new Error("package.json has no check script.");
  return check.split("&&").map((part) => {
    const match = STEP.exec(part.trim());
    if (match === null) throw new Error(`The check script has the step "${part.trim()}". Each step is "npm run <script>".`);
    return match[1];
  });
}

/** Runs the steps with at most `jobs` at a time, in the order given. A failure stops the start of new steps. */
export async function runSteps(steps: string[], jobs: number, exec: Exec): Promise<{ results: StepResult[]; skipped: string[] }> {
  const results: StepResult[] = [];
  let next = 0;
  let stopped = false;
  const worker = async () => {
    while (!stopped && next < steps.length) {
      const result = await exec(steps[next++]);
      results.push(result);
      if (result.code !== 0) stopped = true;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, steps.length)) }, worker));
  return { results, skipped: steps.slice(next) };
}

const execNpm: Exec = (step) =>
  new Promise((resolve) => {
    const start = Date.now();
    const child = spawn("npm", ["run", "--silent", step], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", (error) => resolve({ step, code: 1, output: `${output}${error.message}\n`, ms: Date.now() - start }));
    child.on("close", (code) => resolve({ step, code: code ?? 1, output, ms: Date.now() - start }));
  });

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** The text of the summary: one line for each step that ran, slowest first, and the steps that did not start. */
export function summary(results: StepResult[], skipped: string[], wallMs: number): string {
  const lines = [...results]
    .sort((a, b) => b.ms - a.ms)
    .map((r) => `${seconds(r.ms).padStart(7)}  ${r.code === 0 ? "ok  " : "FAIL"}  ${r.step}`);
  for (const step of skipped) lines.push(`${"".padStart(7)}  skip  ${step}`);
  const failed = results.filter((r) => r.code !== 0).length;
  const sum = results.reduce((total, r) => total + r.ms, 0);
  lines.push(
    "",
    `${results.length - failed} passed, ${failed} failed, ${skipped.length} not started. Wall time ${seconds(wallMs)}, the steps add up to ${seconds(sum)}.`,
  );
  return lines.join("\n");
}

async function selfTest(): Promise<number> {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  /** An exec that records how many steps run at once, and fails the steps in `failing`. */
  const fake = (failing: string[] = [], ms = 5) => {
    const state = { running: 0, peak: 0, started: [] as string[] };
    const exec: Exec = async (step) => {
      state.started.push(step);
      state.peak = Math.max(state.peak, ++state.running);
      await delay(ms);
      state.running--;
      return { step, code: failing.includes(step) ? 1 : 0, output: `output of ${step}`, ms };
    };
    return { state, exec };
  };
  const steps = ["a", "b", "c", "d", "e", "f"];
  const cases: Array<[string, () => Promise<boolean | string>]> = [
    ["the steps are the commands of the check script, in order", async () =>
      JSON.stringify(parseSteps('{"scripts":{"check":"npm run typecheck && npm run spec-ids:self-test && npm run a-b"}}')) === '["typecheck","spec-ids:self-test","a-b"]'],
    ["a step that is not npm run <script> is an error", async () => {
      for (const check of ["tsc --noEmit && npm run a", "npm run a; npm run b", "npm run a --flag"]) {
        try {
          parseSteps(JSON.stringify({ scripts: { check } }));
          return `no error for ${check}`;
        } catch {
          /* expected */
        }
      }
      return true;
    }],
    ["a package.json without a check script is an error", async () => {
      try {
        parseSteps('{"scripts":{}}');
        return false;
      } catch {
        return true;
      }
    }],
    ["each step runs once, and the steps overlap", async () => {
      const { state, exec } = fake();
      const { results, skipped } = await runSteps(steps, 3, exec);
      return (results.length === 6 && skipped.length === 0 && new Set(state.started).size === 6 && state.peak > 1) || JSON.stringify({ results: results.length, skipped, peak: state.peak });
    }],
    ["no more than the given number of steps run at once", async () => {
      const { state, exec } = fake();
      await runSteps(steps, 2, exec);
      return state.peak === 2 || `peak ${state.peak}`;
    }],
    ["one job runs the steps one at a time, in order", async () => {
      const { state, exec } = fake();
      await runSteps(steps, 1, exec);
      return (state.peak === 1 && state.started.join("") === "abcdef") || JSON.stringify(state);
    }],
    ["a failure stops the start of new steps, and the running steps finish", async () => {
      const { state, exec } = fake(["b"]);
      const { results, skipped } = await runSteps(steps, 2, exec);
      const finished = results.map((r) => r.step);
      return (finished.includes("a") && finished.includes("b") && skipped.length > 0 && state.started.length === finished.length && results.some((r) => r.code !== 0)) || JSON.stringify({ finished, skipped });
    }],
    ["a failed step keeps its output and the summary names it", async () => {
      const { exec } = fake(["c"]);
      const { results, skipped } = await runSteps(steps, 1, exec);
      const text = summary(results, skipped, 10);
      const failed = results.find((r) => r.code !== 0);
      return (failed?.output === "output of c" && /FAIL\s+c/.test(text) && /skip\s+d/.test(text) && text.includes("2 passed, 1 failed, 3 not started")) || text;
    }],
    ["more jobs than steps is allowed, and zero jobs runs one at a time", async () => {
      const wide = fake();
      const one = fake();
      const a = await runSteps(steps, 99, wide.exec);
      const b = await runSteps(steps, 0, one.exec);
      return (a.results.length === 6 && b.results.length === 6 && one.state.peak === 1) || JSON.stringify([a.results.length, b.results.length, one.state.peak]);
    }],
    ["the check script of this repository is a list of npm run steps that names no step twice and not this script", async () => {
      const list = parseSteps(fs.readFileSync("package.json", "utf8"));
      const scripts = (JSON.parse(fs.readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;
      const missing = list.filter((s) => scripts[s] === undefined);
      const repeated = list.filter((s, i) => list.indexOf(s) !== i);
      return (list.length > 0 && missing.length === 0 && repeated.length === 0 && !list.includes("check:parallel")) || JSON.stringify({ missing, repeated });
    }],
  ];
  let failed = 0;
  for (const [name, fn] of cases) {
    let out: boolean | string;
    try {
      out = await fn();
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

async function main(args: string[]): Promise<number> {
  const at = args.indexOf("--jobs");
  const jobs = at >= 0 ? Number(args[at + 1]) : os.availableParallelism();
  if (!Number.isInteger(jobs) || jobs < 1) {
    console.error("--jobs needs a whole number of 1 or more.");
    return 1;
  }
  const steps = parseSteps(fs.readFileSync("package.json", "utf8"));
  const start = Date.now();
  const { results, skipped } = await runSteps(steps, jobs, execNpm);
  const verbose = args.includes("--verbose");
  for (const r of results) {
    if (r.code !== 0 || verbose) console.log(`\n===== ${r.code === 0 ? "ok" : "FAIL"}: npm run ${r.step} =====\n${r.output.trimEnd()}`);
  }
  console.log(`\n${summary(results, skipped, Date.now() - start)}`);
  return results.some((r) => r.code !== 0) ? 1 : 0;
}

process.exit(process.argv.includes("--self-test") ? await selfTest() : await main(process.argv.slice(2)));
