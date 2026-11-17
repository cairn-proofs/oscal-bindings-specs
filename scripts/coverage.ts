/**
 * Generates the scenario coverage file openspec/coverage.json (design.md of the report-scenario-checks change). For each
 * scenario of the main specs, the file lists each method that checks the scenario:
 *
 * 1. `corpus`: the ids of the corpus cases that cite the scenario identifier. A cite of the requirement does not count.
 * 2. `self-test`: the script and the name of each string literal in scripts/*.ts that starts with the scenario
 *    identifier, followed by `:` or a space. The script reads the text of each file. It does not run a test. A name that
 *    the script builds at run time does not count.
 * 3. `by-design`: the reason from openspec/scenario-checks.yaml. The scenario cannot have a mechanical check.
 * 4. `gap`: the issue number from openspec/scenario-checks.yaml. The scenario can have a check, but has none.
 *
 * The check (default mode) fails on the seven rules of design.md, D3. SPEC_IDS_BASE sets the base ref of rule 7. The
 * default is HEAD.
 *
 *   npm run coverage:write       regenerate openspec/coverage.json
 *   npm run coverage:check       check the generated file, the hand-edited file, and the gap list against the base ref
 *   npm run coverage:self-test   run the scenarios of the generator and of the rules on in-memory inputs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { serialize, type Json } from "./names-lib.js";
import { parseSpec, render } from "./spec-ids.js";
import { type Files, readRepository, SPEC_PATH } from "./spec-markdown.js";

export const COVERAGE = "openspec/coverage.json";
export const CHECKS = "openspec/scenario-checks.yaml";
export const FORMAT = 1;

export interface SelfTestCheck {
  script: string;
  test: string;
}

export interface ScenarioCoverage {
  id: string;
  capability: string;
  corpus?: string[];
  "self-test"?: SelfTestCheck[];
  "by-design"?: unknown;
  gap?: unknown;
}

export interface Inputs {
  /** Repository-relative path -> text, for each spec.md under openspec/. */
  specs: Files;
  /** The cases of corpus/<release>/cases.json. */
  cases: Array<{ id: string; requirements: string[] }>;
  /** Repository-relative path -> text, for each script of scripts/*.ts. */
  scripts: Record<string, string>;
  /** The text of openspec/scenario-checks.yaml, or undefined when the file does not exist. */
  checks: string | undefined;
}

export interface ChecksFile {
  "by-design": Record<string, unknown>;
  gap: Record<string, unknown>;
}

/** The two lists of openspec/scenario-checks.yaml. The rules of the lists are for `coverage:check`, not for this reader. */
export function readChecks(text: string | undefined, failures: string[]): ChecksFile {
  const empty: ChecksFile = { "by-design": {}, gap: {} };
  if (text === undefined) return empty;
  let data: unknown;
  try {
    data = YAML.parse(text);
  } catch (error) {
    failures.push(`[checks] ${CHECKS} is not valid YAML: ${(error as Error).message}`);
    return empty;
  }
  if (data === null || data === undefined) return empty;
  if (typeof data !== "object" || Array.isArray(data)) {
    failures.push(`[checks] ${CHECKS} is not a map.`);
    return empty;
  }
  const out = empty;
  for (const [key, value] of Object.entries(data)) {
    if (key !== "by-design" && key !== "gap") {
      failures.push(`[checks] ${CHECKS} has the unknown key "${key}". The keys are by-design and gap.`);
    } else if (value === null || value === undefined) {
      continue;
    } else if (typeof value !== "object" || Array.isArray(value)) {
      failures.push(`[checks] ${CHECKS}: ${key} is not a map of scenario identifiers.`);
    } else {
      out[key] = { ...(value as Record<string, unknown>) };
    }
  }
  return out;
}

/** Whether a `/` at `index` starts a regular expression literal, and not a division. */
function startsRegex(text: string, index: number): boolean {
  let i = index - 1;
  while (i >= 0 && /\s/.test(text[i])) i--;
  if (i < 0) return true;
  if (/[)\]}]/.test(text[i])) return false;
  if (/[\w$]/.test(text[i])) {
    let j = i;
    while (j >= 0 && /[\w$]/.test(text[j])) j--;
    return ["return", "typeof", "case", "in", "of", "void", "delete"].includes(text.slice(j + 1, i + 1));
  }
  return true;
}

/**
 * Reads the string literals of TypeScript text. It skips comments and regular expression literals. A template literal
 * with a substitution is built at run time, so it is not a literal: the scan skips the substitution and gives only the
 * strings that the substitution holds.
 */
export function stringLiterals(text: string): string[] {
  const out: string[] = [];

  const quoted = (start: number): number => {
    const quote = text[start];
    let value = "";
    let i = start + 1;
    while (i < text.length && text[i] !== quote && text[i] !== "\n") {
      if (text[i] === "\\") i++;
      value += text[i] ?? "";
      i++;
    }
    out.push(value);
    return i + 1;
  };

  const template = (start: number): number => {
    let value = "";
    let dynamic = false;
    let i = start + 1;
    while (i < text.length && text[i] !== "`") {
      if (text[i] === "\\") {
        value += text[i + 1] ?? "";
        i += 2;
      } else if (text[i] === "$" && text[i + 1] === "{") {
        dynamic = true;
        i = scan(i + 2, true);
      } else {
        value += text[i];
        i++;
      }
    }
    if (!dynamic) out.push(value);
    return i + 1;
  };

  const regex = (start: number): number => {
    let i = start + 1;
    let inClass = false;
    while (i < text.length && text[i] !== "\n" && (inClass || text[i] !== "/")) {
      if (text[i] === "\\") i++;
      else if (text[i] === "[") inClass = true;
      else if (text[i] === "]") inClass = false;
      i++;
    }
    i++;
    while (i < text.length && /[a-z]/i.test(text[i])) i++;
    return i;
  };

  /** Scans from `start`. With `nested`, it stops after the `}` that closes a substitution of a template literal. */
  function scan(start: number, nested: boolean): number {
    let depth = 0;
    let i = start;
    while (i < text.length) {
      const c = text[i];
      if (c === "/" && text[i + 1] === "/") {
        while (i < text.length && text[i] !== "\n") i++;
      } else if (c === "/" && text[i + 1] === "*") {
        const end = text.indexOf("*/", i + 2);
        i = end < 0 ? text.length : end + 2;
      } else if (c === '"' || c === "'") {
        i = quoted(i);
      } else if (c === "`") {
        i = template(i);
      } else if (c === "/" && startsRegex(text, i)) {
        i = regex(i);
      } else {
        if (nested && c === "{") depth++;
        else if (nested && c === "}") {
          if (depth === 0) return i + 1;
          depth--;
        }
        i++;
      }
    }
    return i;
  }

  scan(0, false);
  return out;
}

const SCENARIO_NAME = /^([A-Z]{2,5}-\d{3}\.\d{2})[: ]/;

/** The coverage of each scenario of the main specs, in identifier order. */
export function buildCoverage(inputs: Inputs): { output?: string; scenarios: ScenarioCoverage[]; failures: string[] } {
  const failures: string[] = [];
  const scenarios = new Map<string, ScenarioCoverage>();
  for (const file of Object.keys(inputs.specs).filter((f) => SPEC_PATH.test(f)).sort()) {
    const capability = SPEC_PATH.exec(file)![1];
    const parsed = parseSpec(file, inputs.specs[file]);
    failures.push(...parsed.bad.filter((line) => line.startsWith("[scenario-id]")));
    for (const heading of parsed.headings) {
      if (heading.kind !== "scenario" || heading.id === undefined) continue;
      const id = render(heading.id);
      scenarios.set(id, { id, capability });
    }
  }

  const corpus = new Map<string, Set<string>>();
  for (const c of inputs.cases) {
    for (const cited of c.requirements) {
      if (!scenarios.has(cited)) continue;
      corpus.set(cited, (corpus.get(cited) ?? new Set()).add(c.id));
    }
  }

  const selfTests = new Map<string, Map<string, SelfTestCheck>>();
  for (const script of Object.keys(inputs.scripts).sort()) {
    for (const literal of stringLiterals(inputs.scripts[script])) {
      const id = SCENARIO_NAME.exec(literal)?.[1];
      if (id === undefined || !scenarios.has(id)) continue;
      const found = selfTests.get(id) ?? new Map<string, SelfTestCheck>();
      found.set(`${script}\u0000${literal}`, { script, test: literal });
      selfTests.set(id, found);
    }
  }

  const checks = readChecks(inputs.checks, failures);
  const items: ScenarioCoverage[] = [];
  for (const id of [...scenarios.keys()].sort(compareScenarioIds)) {
    const item = scenarios.get(id)!;
    const cases = [...(corpus.get(id) ?? [])].sort(byCodeUnit);
    if (cases.length) item.corpus = cases;
    const tests = [...(selfTests.get(id)?.values() ?? [])].sort(
      (a, b) => byCodeUnit(a.script, b.script) || byCodeUnit(a.test, b.test),
    );
    if (tests.length) item["self-test"] = tests;
    if (Object.hasOwn(checks["by-design"], id)) item["by-design"] = checks["by-design"][id];
    if (Object.hasOwn(checks.gap, id)) item.gap = checks.gap[id];
    items.push(item);
  }
  if (failures.length) return { scenarios: items, failures };
  return { output: serialize({ format: FORMAT, scenarios: items } as unknown as Json), scenarios: items, failures };
}

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Prefix in code-point order, then the requirement number, then the scenario number. */
function compareScenarioIds(a: string, b: string): number {
  const split = (id: string) => /^([A-Z]+)-(\d+)\.(\d+)$/.exec(id)!;
  const [, pa, ra, sa] = split(a);
  const [, pb, rb, sb] = split(b);
  if (pa !== pb) return byCodeUnit(pa, pb);
  return Number(ra) - Number(rb) || Number(sa) - Number(sb);
}

/** True when a scenario has a corpus case or a self-test. */
export const isChecked = (s: ScenarioCoverage) => s.corpus !== undefined || s["self-test"] !== undefined;

/** The inputs of the working directory. `release` is the OSCAL release of VERSION. */
export function readInputs(root: string): Inputs {
  const release = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim().split("+oscal.")[1];
  const cases = (JSON.parse(fs.readFileSync(path.join(root, "corpus", release, "cases.json"), "utf8")) as { cases: Inputs["cases"] }).cases;
  const scripts: Record<string, string> = {};
  for (const name of fs.readdirSync(path.join(root, "scripts")).sort()) {
    if (name.endsWith(".ts")) scripts[`scripts/${name}`] = fs.readFileSync(path.join(root, "scripts", name), "utf8");
  }
  const checksFile = path.join(root, CHECKS);
  return {
    specs: readRepository(root),
    cases,
    scripts,
    checks: fs.existsSync(checksFile) ? fs.readFileSync(checksFile, "utf8") : undefined,
  };
}

/** The git operations of the base comparison (rule 7 and the job summary). */
export interface Git {
  /** Whether the ref names a commit. */
  resolves(ref: string): boolean;
  /** The text of a file at a ref, or undefined when the ref has no such file. */
  show(ref: string, file: string): string | undefined;
}

const git = (args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

export const realGit: Git = {
  resolves: (ref) => {
    try {
      git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  },
  show: (ref, file) => {
    try {
      git(["cat-file", "-e", `${ref}:${file}`]);
    } catch {
      return undefined;
    }
    return git(["show", `${ref}:${file}`]);
  },
};

/** The two generated and hand-edited files at the base ref. */
export interface Base {
  ref: string;
  /** Set when the ref does not resolve. */
  failure?: string;
  coverage?: string;
  checks?: string;
}

/**
 * Reads the files at `ref`. A ref that does not resolve is a failure. A ref that resolves, with no file at it, gives no
 * text for that file, so all content of the file counts as new. `realGit.show` of scripts/check-releases.ts gives the
 * same result for both cases, so this function checks the ref first.
 */
export function readBase(g: Git, ref: string): Base {
  if (!g.resolves(ref)) {
    return { ref, failure: `[base] SPEC_IDS_BASE "${ref}" does not name a commit, so the gap list cannot be compared with it.` };
  }
  return { ref, coverage: g.show(ref, COVERAGE), checks: g.show(ref, CHECKS) };
}

/**
 * The failures of the rules of design.md, D3. The rules are numbered as in D3, and each message starts with its rule.
 */
export function checkCoverage(inputs: Inputs, committed: string | undefined, base: Base): string[] {
  const built = buildCoverage(inputs);
  const failures = [...built.failures];
  if (built.output === undefined) return failures;
  if (committed === undefined) {
    failures.push(`[rule 1] ${COVERAGE} does not exist. Run \`npm run coverage:write\`.`);
  } else if (committed !== built.output) {
    failures.push(`[rule 1] ${COVERAGE} differs from the generator output. Run \`npm run coverage:write\` and commit it.`);
  }
  const checks = readChecks(inputs.checks, []);
  const byId = new Map(built.scenarios.map((s) => [s.id, s]));
  for (const list of ["by-design", "gap"] as const) {
    for (const [id, value] of Object.entries(checks[list])) {
      const scenario = byId.get(id);
      if (scenario === undefined) {
        failures.push(`[rule 3] ${CHECKS}: the ${list} entry ${id} names no scenario heading of openspec/specs/.`);
        continue;
      }
      if (list === "by-design" && (typeof value !== "string" || value.trim() === "")) {
        failures.push(`[rule 5] ${CHECKS}: the by-design reason of ${id} is empty.`);
      }
      if (list === "gap" && !(typeof value === "number" && Number.isInteger(value) && value > 0)) {
        failures.push(`[rule 5] ${CHECKS}: the gap value of ${id} is not a positive integer.`);
      }
      if (isChecked(scenario)) {
        failures.push(`[rule 6] ${CHECKS}: the ${list} entry ${id} is false, because a corpus case or a self-test names the scenario. Remove the entry.`);
      }
    }
  }
  for (const scenario of built.scenarios) {
    const inBoth = scenario["by-design"] !== undefined && scenario.gap !== undefined;
    if (inBoth) failures.push(`[rule 4] ${CHECKS}: ${scenario.id} is in both lists.`);
    if (!isChecked(scenario) && scenario["by-design"] === undefined && scenario.gap === undefined) {
      failures.push(`[rule 2] ${scenario.id} has no corpus case, no self-test, no by-design reason and no gap issue.`);
    }
  }
  if (base.failure !== undefined) {
    failures.push(base.failure);
  } else if (base.checks !== undefined) {
    const baseFailures: string[] = [];
    const before = readChecks(base.checks, baseFailures);
    failures.push(...baseFailures.map((f) => `${f} (at ${base.ref})`));
    for (const id of Object.keys(checks.gap)) {
      if (!Object.hasOwn(before.gap, id)) {
        failures.push(`[rule 7] ${CHECKS}: the gap entry ${id} is not in the gap list at ${base.ref}. The gap list can get shorter, but not longer. Add a corpus case, a self-test or a by-design reason.`);
      }
    }
  }
  return failures;
}

/** The base for the job summary: the scenarios of coverage.json and the two lists of the YAML file at the base ref. */
export interface BaseView {
  scenarios: ScenarioCoverage[];
  checks: ChecksFile;
}

/** Reads the base files. A file that does not exist at the base gives no content, so all of its content counts as new. */
export function baseView(base: Base, failures: string[]): BaseView {
  let scenarios: ScenarioCoverage[] = [];
  if (base.coverage !== undefined) {
    try {
      scenarios = (JSON.parse(base.coverage) as { scenarios: ScenarioCoverage[] }).scenarios;
    } catch {
      failures.push(`[base] ${COVERAGE} at ${base.ref} is not valid JSON.`);
    }
  }
  return { scenarios, checks: readChecks(base.checks, failures) };
}

/**
 * The job summary of design.md, D6: a table of the change in coverage for each capability, each by-design entry that is
 * new or has a new reason, and each scenario that has a new check.
 */
export function summarize(now: ScenarioCoverage[], base: BaseView): string {
  const before = new Map(base.scenarios.map((s) => [s.id, s]));
  const columns: Array<[string, (s: ScenarioCoverage) => boolean]> = [
    ["Scenarios", () => true],
    ["corpus", (s) => s.corpus !== undefined],
    ["self-test", (s) => s["self-test"] !== undefined],
    ["by-design", (s) => s["by-design"] !== undefined],
    ["gap", (s) => s.gap !== undefined],
  ];
  // The two hand-edited lists at the base come from the YAML file, and the checks from coverage.json.
  const atBase = (s: ScenarioCoverage): ScenarioCoverage => ({
    ...s,
    "by-design": base.checks["by-design"][s.id],
    gap: base.checks.gap[s.id],
  });
  const rows = new Map<string, number[]>();
  const count = (list: ScenarioCoverage[], offset: number) => {
    for (const s of list) {
      const row = rows.get(s.capability) ?? new Array<number>(columns.length * 2).fill(0);
      columns.forEach(([, has], i) => {
        if (has(s)) row[i * 2 + offset]++;
      });
      rows.set(s.capability, row);
    }
  };
  count(base.scenarios.map(atBase), 0);
  count(now, 1);
  const lines = ["## Scenario coverage", "", "Each column counts the scenarios that have the method. A scenario can have more than one method.", "", `| Capability | ${columns.map(([name]) => name).join(" | ")} |`, `|---|${columns.map(() => "---").join("|")}|`];
  const cell = (row: number[], i: number) => (row[i * 2] === row[i * 2 + 1] ? `${row[i * 2 + 1]}` : `${row[i * 2]} → ${row[i * 2 + 1]}`);
  const total = new Array<number>(columns.length * 2).fill(0);
  for (const capability of [...rows.keys()].sort(byCodeUnit)) {
    const row = rows.get(capability)!;
    row.forEach((n, i) => (total[i] += n));
    lines.push(`| ${capability} | ${columns.map((_, i) => cell(row, i)).join(" | ")} |`);
  }
  lines.push(`| **Total** | ${columns.map((_, i) => cell(total, i)).join(" | ")} |`, "");

  const reasons = now
    .filter((s) => s["by-design"] !== undefined && base.checks["by-design"][s.id] !== s["by-design"])
    .map((s) => `${s.id}: ${s["by-design"]}${Object.hasOwn(base.checks.gap, s.id) ? " (moved from the gap list)" : ""}`);
  lines.push("### By-design entries that are new or have a new reason", "", ...(reasons.length ? reasons.map((r, i) => `${i + 1}. ${r}`) : ["None."]), "");

  const cites: string[] = [];
  for (const s of now) {
    const old = before.get(s.id);
    const cases = (s.corpus ?? []).filter((c) => !old?.corpus?.includes(c)).map((c) => `corpus case ${c}`);
    const tests = (s["self-test"] ?? [])
      .filter((t) => !old?.["self-test"]?.some((o) => o.script === t.script && o.test === t.test))
      .map((t) => `self-test ${t.script}, "${t.test}"`);
    if (cases.length + tests.length) cites.push(`${s.id}: ${[...cases, ...tests].join("; ")}`);
  }
  lines.push("### Scenarios with a new check", "", ...(cites.length ? cites.map((c, i) => `${i + 1}. ${c}`) : ["None."]), "");
  return lines.join("\n");
}

function check(): number {
  const root = process.cwd();
  const inputs = readInputs(root);
  const file = path.join(root, COVERAGE);
  const ref = process.env.SPEC_IDS_BASE || "HEAD";
  const base = readBase(realGit, ref);
  const failures = checkCoverage(inputs, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined, base);
  const scenarios = buildCoverage(inputs).scenarios;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile && base.failure === undefined) {
    const summary = summarize(scenarios, baseView(base, failures));
    fs.appendFileSync(summaryFile, `${summary}\n`);
  }
  for (const failure of failures) console.error(failure);
  console.log(
    failures.length
      ? `\n${failures.length} coverage failure(s)`
      : `coverage: ok (${scenarios.length} scenarios: ${scenarios.filter(isChecked).length} checked, ${scenarios.filter((s) => s["by-design"] !== undefined).length} by-design, ${scenarios.filter((s) => s.gap !== undefined).length} gap)`,
  );
  return failures.length ? 1 : 0;
}

function write(): number {
  const root = process.cwd();
  const { output, scenarios, failures } = buildCoverage(readInputs(root));
  if (output === undefined) {
    for (const failure of failures) console.error(failure);
    console.error(`${failures.length} failure(s); ${COVERAGE} was not written`);
    return 1;
  }
  fs.writeFileSync(path.join(root, COVERAGE), output);
  const checked = scenarios.filter(isChecked).length;
  console.log(`wrote ${COVERAGE} (${scenarios.length} scenarios: ${checked} with a corpus case or a self-test, ${scenarios.length - checked} with neither)`);
  return 0;
}

/** A fake git: the map holds the text of openspec/scenario-checks.yaml at each ref that resolves. */
const fakeGit = (refs: Record<string, string | undefined>): Git => ({
  resolves: (ref) => Object.hasOwn(refs, ref),
  show: (ref, file) => (file === CHECKS ? refs[ref] : undefined),
});

/** The scenarios of the seven rules of D3. The fixtures use the prefix WID. */
function ruleScenarios(inputs: (more?: Partial<Inputs>) => Inputs): Array<[string, () => boolean | string]> {
  const good = (): Inputs =>
    inputs({
      cases: [{ id: "c", requirements: ["WID-001.01", "WID-002.02", "WID-003.01", "WID-004.01"] }],
      checks: "by-design:\n  WID-001.02: The reason.\ngap:\n  WID-002.01: 5\n",
    });
  const withChecks = (checks: string, more: Partial<Inputs> = {}) => ({ ...good(), checks, ...more });
  const committedOf = (i: Inputs) => buildCoverage(i).output;
  const run = (i: Inputs, base: Base = { ref: "HEAD" }) => checkCoverage(i, committedOf(i), base);
  const has = (failures: string[], rule: number) => failures.some((f) => f.startsWith(`[rule ${rule}]`));
  const only = (failures: string[], rule: number) => failures.length > 0 && failures.every((f) => f.startsWith(`[rule ${rule}]`));
  const show = (x: unknown) => JSON.stringify(x);
  return [
    ["rule 1: the committed file that equals the generator output passes", () => run(good()).length === 0 || show(run(good()))],
    ["rule 1: a stale committed file fails", () => {
      const stale = checkCoverage(good(), committedOf(inputs()), { ref: "HEAD" });
      return only(stale, 1) || show(stale);
    }],
    ["rule 1: a missing committed file fails", () => {
      const missing = checkCoverage(good(), undefined, { ref: "HEAD" });
      return (only(missing, 1) && missing[0].includes("does not exist")) || show(missing);
    }],
    ["rule 2: a scenario with no method fails, and the message names it", () => {
      const f = run(withChecks("gap:\n  WID-002.01: 5\n"));
      return (only(f, 2) && f.length === 1 && f[0].includes("WID-001.02")) || show(f);
    }],
    ["rule 3: an entry that names no scenario fails", () => {
      const f = run(withChecks("by-design:\n  WID-001.02: The reason.\n  WID-099.01: A scenario of a change.\ngap:\n  WID-002.01: 5\n"));
      return (only(f, 3) && f[0].includes("WID-099.01")) || show(f);
    }],
    ["rule 4: a scenario in both lists fails", () => {
      const f = run(withChecks("by-design:\n  WID-001.02: The reason.\n  WID-002.01: The reason.\ngap:\n  WID-002.01: 5\n"));
      return (has(f, 4) && f.filter((x) => x.startsWith("[rule 4]")).length === 1) || show(f);
    }],
    ["rule 5: an empty by-design reason fails", () => {
      const f = run(withChecks('by-design:\n  WID-001.02: ""\ngap:\n  WID-002.01: 5\n'));
      return only(f, 5) || show(f);
    }],
    ["rule 5: a gap value that is not a positive integer fails", () => {
      const values = ["0", "-3", "1.5", '"71"', "text"];
      return values.every((v) => has(run(withChecks(`by-design:\n  WID-001.02: The reason.\ngap:\n  WID-002.01: ${v}\n`)), 5)) || "a bad value passed";
    }],
    ["rule 6: an entry for a scenario that has a corpus case fails", () => {
      const f = run(withChecks("by-design:\n  WID-001.02: The reason.\n  WID-001.01: The reason.\ngap:\n  WID-002.01: 5\n"));
      return (only(f, 6) && f[0].includes("WID-001.01")) || show(f);
    }],
    ["rule 6: an entry for a scenario that has a self-test fails", () => {
      const scripts = { "scripts/a.ts": 'test("WID-002.01: a test", f);' };
      const f = run(withChecks("by-design:\n  WID-001.02: The reason.\ngap:\n  WID-002.01: 5\n", { scripts }));
      return (only(f, 6) && f[0].includes("WID-002.01")) || show(f);
    }],
    ["rule 7: a base ref that does not resolve fails", () => {
      const f = run(good(), readBase(fakeGit({ main: undefined }), "no-such-ref"));
      return (f.length === 1 && f[0].startsWith("[base]") && f[0].includes("no-such-ref")) || show(f);
    }],
    ["rule 7: a base ref that resolves and has no file passes", () => {
      const f = run(good(), readBase(fakeGit({ main: undefined }), "main"));
      return f.length === 0 || show(f);
    }],
    ["rule 7: a base ref with a shorter gap list fails, and the message names the new entry", () => {
      const f = run(good(), readBase(fakeGit({ main: "by-design:\n  WID-001.02: The reason.\n" }), "main"));
      return (only(f, 7) && f.length === 1 && f[0].includes("WID-002.01")) || show(f);
    }],
    ["rule 7: a base ref with the same gap list passes, and a changed issue number passes", () => {
      const same = run(good(), readBase(fakeGit({ main: "gap:\n  WID-002.01: 9\n  WID-001.02: 1\n" }), "main"));
      return same.length === 0 || show(same);
    }],
  ];
}

/** The scenarios of the job summary of D6. The fixtures use the prefix WID. */
function summaryScenarios(inputs: (more?: Partial<Inputs>) => Inputs): Array<[string, () => boolean | string]> {
  const view = (i: Inputs): BaseView => ({ scenarios: buildCoverage(i).scenarios, checks: readChecks(i.checks, []) });
  const none: BaseView = { scenarios: [], checks: { "by-design": {}, gap: {} } };
  const before = (): Inputs =>
    inputs({
      cases: [{ id: "old-case", requirements: ["WID-001.01"] }],
      scripts: { "scripts/a.ts": 'test("WID-002.01: an old test", f);' },
      checks: "by-design:\n  WID-001.02: An old reason.\ngap:\n  WID-002.02: 5\n  WID-003.01: 6\n  WID-004.01: 7\n",
    });
  const summary = (now: Inputs, base: BaseView = view(before())) => summarize(buildCoverage(now).scenarios, base);
  const section = (text: string, title: string) => text.split("### ").find((x) => x.startsWith(title)) ?? "";
  const show = (x: unknown) => JSON.stringify(x);
  return [
    ["summary: a new by-design entry is listed, and an old entry with the same reason is not", () => {
      const now = { ...before(), checks: "by-design:\n  WID-001.02: An old reason.\n  WID-004.01: A new reason.\ngap:\n  WID-002.02: 5\n  WID-003.01: 6\n" };
      const list = section(summary(now), "By-design");
      return (list.includes("WID-004.01: A new reason.") && !list.includes("WID-001.02")) || list;
    }],
    ["summary: a changed by-design reason is listed", () => {
      const now = { ...before(), checks: "by-design:\n  WID-001.02: A new reason.\ngap:\n  WID-002.02: 5\n  WID-003.01: 6\n  WID-004.01: 7\n" };
      return section(summary(now), "By-design").includes("WID-001.02: A new reason.") || show(summary(now));
    }],
    ["summary: a move from gap to by-design is listed, with its origin", () => {
      const now = { ...before(), checks: "by-design:\n  WID-001.02: An old reason.\n  WID-003.01: A moved reason.\ngap:\n  WID-002.02: 5\n  WID-004.01: 7\n" };
      return section(summary(now), "By-design").includes("WID-003.01: A moved reason. (moved from the gap list)") || section(summary(now), "By-design");
    }],
    ["summary: a new corpus case and a new self-test are listed, and an old check is not", () => {
      const now = {
        ...before(),
        cases: [{ id: "old-case", requirements: ["WID-001.01"] }, { id: "new-case", requirements: ["WID-001.01", "WID-003.01"] }],
        scripts: { "scripts/a.ts": 'test("WID-002.01: an old test", f);', "scripts/b.ts": 'test("WID-004.01: a new test", f);' },
        checks: "by-design:\n  WID-001.02: An old reason.\ngap:\n  WID-002.02: 5\n",
      };
      const list = section(summary(now), "Scenarios with a new check");
      return (
        list.includes("WID-001.01: corpus case new-case") &&
        list.includes("WID-003.01: corpus case new-case") &&
        list.includes('WID-004.01: self-test scripts/b.ts, "WID-004.01: a new test"') &&
        !list.includes("old-case") &&
        !list.includes("an old test")
      ) || list;
    }],
    ["summary: the table shows the base and the present number for a capability that changed", () => {
      const now = { ...before(), cases: [{ id: "old-case", requirements: ["WID-001.01", "WID-003.01"] }], checks: "by-design:\n  WID-001.02: An old reason.\ngap:\n  WID-002.02: 5\n  WID-004.01: 7\n" };
      const table = summary(now).split("\n").filter((l) => l.startsWith("| widget-parsing") || l.startsWith("| Capability"));
      return (table.length === 2 && table[1] === "| widget-parsing | 6 | 1 → 2 | 1 | 1 | 3 → 2 |") || show(table);
    }],
    ["summary: a base with no file counts all content as new", () => {
      const text = summary(before(), none);
      const table = text.split("\n").find((l) => l.startsWith("| widget-parsing"));
      return (
        table === "| widget-parsing | 0 → 6 | 0 → 1 | 0 → 1 | 0 → 1 | 0 → 3 |" &&
        section(text, "By-design").includes("WID-001.02: An old reason.") &&
        section(text, "Scenarios with a new check").includes("corpus case old-case")
      ) || show(table);
    }],
    ["summary: a run with no change gives None for both lists", () => {
      const text = summary(before());
      return (section(text, "By-design").includes("None.") && section(text, "Scenarios with a new check").includes("None.")) || text;
    }],
  ];
}

/** The scenarios of the generator. The fixtures use the prefix WID, which is not in openspec/spec-ids.yaml. */
function selfTest(): number {
  const spec = (body: string) => `# widget-parsing Specification\n\n## Purpose\nTest.\n\n## Requirements\n\n${body}`;
  const req = (n: string, ...scenarioNumbers: string[]) =>
    `### Requirement: WID-${n} Widget rule\n\nText.\n\n` +
    scenarioNumbers.map((s) => `#### Scenario: WID-${n}.${s} Example\n\n- **WHEN** x\n- **THEN** y\n\n`).join("");
  const specs = (): Files => ({
    "openspec/specs/widget-parsing/spec.md": spec(req("001", "01", "02") + req("002", "01", "02") + req("003", "01") + req("004", "01")),
    "openspec/changes/x/specs/widget-parsing/spec.md": spec(req("099", "01")),
  });
  const inputs = (more: Partial<Inputs> = {}): Inputs => ({ specs: specs(), cases: [], scripts: {}, checks: undefined, ...more });
  const scenarioOf = (i: Inputs, id: string) => buildCoverage(i).scenarios.find((s) => s.id === id);
  const names = (i: Inputs) => buildCoverage(i).scenarios.map((s) => s["self-test"]?.map((t) => t.test));

  const cases: Array<[string, () => boolean | string]> = [
    ["a scenario of the main specs is in the list, and a scenario of a change is not", () => {
      const ids = buildCoverage(inputs()).scenarios.map((s) => s.id);
      return JSON.stringify(ids) === JSON.stringify(["WID-001.01", "WID-001.02", "WID-002.01", "WID-002.02", "WID-003.01", "WID-004.01"]) || JSON.stringify(ids);
    }],
    ["a scenario-level cite of a case counts", () => {
      const s = scenarioOf(inputs({ cases: [{ id: "b/one", requirements: ["WID-001.01"] }, { id: "a/two", requirements: ["WID-001.01"] }] }), "WID-001.01");
      return JSON.stringify(s?.corpus) === '["a/two","b/one"]' || JSON.stringify(s);
    }],
    ["a requirement-level cite of a case does not count", () => {
      const out = buildCoverage(inputs({ cases: [{ id: "c", requirements: ["WID-001"] }] })).scenarios;
      return out.every((s) => s.corpus === undefined) || JSON.stringify(out);
    }],
    ["a name in the form test(name, fn) counts", () => {
      const s = scenarioOf(inputs({ scripts: { "scripts/a.ts": 'test("WID-002.01: a test form", () => {});' } }), "WID-002.01");
      return JSON.stringify(s?.["self-test"]) === '[{"script":"scripts/a.ts","test":"WID-002.01: a test form"}]' || JSON.stringify(s);
    }],
    ["a name in the form scenario(name, ...) counts", () => {
      const s = scenarioOf(inputs({ scripts: { "scripts/b.ts": 'scenario("WID-002.02: a scenario form", ok, null);' } }), "WID-002.02");
      return s?.["self-test"]?.[0]?.test === "WID-002.02: a scenario form" || JSON.stringify(s);
    }],
    ["a name that is an item of an array counts, with a space after the identifier", () => {
      const s = scenarioOf(inputs({ scripts: { "scripts/c.ts": "const cases = [['WID-003.01 an array form', () => true]];" } }), "WID-003.01");
      return s?.["self-test"]?.[0]?.test === "WID-003.01 an array form" || JSON.stringify(s);
    }],
    ["a name in a template literal with no substitution counts", () => {
      const s = scenarioOf(inputs({ scripts: { "scripts/d.ts": "test(`WID-004.01: a template form`, f);" } }), "WID-004.01");
      return s?.["self-test"]?.[0]?.test === "WID-004.01: a template form" || JSON.stringify(s);
    }],
    ["a name that the script builds at run time does not count", () => {
      const scripts = {
        "scripts/e.ts": 'test("WID-" + n + ".01: a name built from parts", f); test("WID-001." + "01: a joined name", f); test(`WID-${n}.01: a name with a substitution`, f); test(`WID-001.01: ${x}`, f);',
      };
      return names(inputs({ scripts })).every((n) => n === undefined) || JSON.stringify(names(inputs({ scripts })));
    }],
    ["a name that starts with the requirement identifier only does not count", () => {
      const scripts = { "scripts/f.ts": 'test("WID-001: a requirement name", f); test("WID-001.01x: no separator", f);' };
      return names(inputs({ scripts })).every((n) => n === undefined) || JSON.stringify(names(inputs({ scripts })));
    }],
    ["a string in a comment or in a regular expression literal does not count", () => {
      const scripts = {
        "scripts/g.ts": '// "WID-001.01: in a line comment"\n/* "WID-001.02: in a block comment" */\nconst r = /"/; const s = "WID-002.01: after a regular expression";',
      };
      const out = buildCoverage(inputs({ scripts })).scenarios;
      const tested = out.filter((s) => s["self-test"]).map((s) => s.id);
      return JSON.stringify(tested) === '["WID-002.01"]' || JSON.stringify(tested);
    }],
    ["a string that a template substitution holds counts", () => {
      const s = scenarioOf(inputs({ scripts: { "scripts/h.ts": "const x = `a ${f(\"WID-004.01: in a substitution\")} b`;" } }), "WID-004.01");
      return s?.["self-test"]?.[0]?.test === "WID-004.01: in a substitution" || JSON.stringify(s);
    }],
    ["an identifier that names no scenario of the main specs does not count", () => {
      const scripts = { "scripts/i.ts": 'test("WID-099.01: a scenario of a change", f); test("WID-050.01: no scenario", f);' };
      return names(inputs({ scripts })).every((n) => n === undefined) || JSON.stringify(names(inputs({ scripts })));
    }],
    ["the entries of the self-test are in script order, then name order, with no repeat", () => {
      const scripts = {
        "scripts/z.ts": 'test("WID-001.01: b", f);',
        "scripts/a.ts": 'test("WID-001.01: c", f); test("WID-001.01: a", f); test("WID-001.01: a", f);',
      };
      const tests = scenarioOf(inputs({ scripts }), "WID-001.01")?.["self-test"]?.map((t) => `${t.script}:${t.test}`);
      return JSON.stringify(tests) === '["scripts/a.ts:WID-001.01: a","scripts/a.ts:WID-001.01: c","scripts/z.ts:WID-001.01: b"]' || JSON.stringify(tests);
    }],
    ["by-design and gap entries come from the YAML file, and an entry for no scenario is left out", () => {
      const checks = 'by-design:\n  WID-001.02: The reason.\n  WID-077.01: No such scenario.\ngap:\n  WID-002.02: 71\n';
      const out = buildCoverage(inputs({ checks })).scenarios;
      const a = out.find((s) => s.id === "WID-001.02");
      const b = out.find((s) => s.id === "WID-002.02");
      return (a?.["by-design"] === "The reason." && b?.gap === 71 && !out.some((s) => s.id === "WID-077.01")) || JSON.stringify(out);
    }],
    ["a missing YAML file gives no entry, and an invalid YAML file is a failure", () => {
      const bad = buildCoverage(inputs({ checks: "gap: [\n" }));
      const none = buildCoverage(inputs());
      return (none.failures.length === 0 && bad.failures.some((f) => f.startsWith("[checks]")) && bad.output === undefined) || JSON.stringify([none.failures, bad.failures]);
    }],
    ["the output is canonical JSON: sorted keys, two-space indentation, a final newline, no empty list", () => {
      const out = buildCoverage(inputs({ cases: [{ id: "c", requirements: ["WID-001.01"] }], scripts: { "scripts/a.ts": 'test("WID-001.01: t", f);' } })).output!;
      const data = JSON.parse(out) as { format: number; scenarios: ScenarioCoverage[] };
      const keys = Object.keys(data.scenarios[0]);
      return (
        out.startsWith('{\n  "format": 1,\n  "scenarios": [') &&
        out.endsWith("}\n") &&
        out === serialize(data as unknown as Json) &&
        JSON.stringify(keys) === '["capability","corpus","id","self-test"]' &&
        !Object.hasOwn(data.scenarios[1], "corpus")
      ) || out;
    }],
    ["two runs give the same bytes", () => buildCoverage(inputs()).output === buildCoverage(inputs()).output],
    ...ruleScenarios(inputs),
    ...summaryScenarios(inputs),
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

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "coverage.ts") {
  if (process.argv.includes("--self-test")) process.exit(selfTest());
  else if (process.argv.includes("--write")) process.exit(write());
  else process.exit(check());
}
