/**
 * Checks the requirement and scenario identifiers in the main specs against the rules in
 * openspec/config.yaml and the ledger openspec/spec-ids.yaml. Each failure starts with the name of
 * the rule that failed, such as [prefix] or [vanished-scenario]. Exits 1 when any check fails.
 *
 *   npm run spec-ids             check the repository
 *   npm run spec-ids:self-test   run the rule scenarios on in-memory corpora
 *
 * SPEC_IDS_BASE names the git ref whose scenario identifiers must not vanish (default HEAD). CI sets
 * it to the pull request's target branch.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  anchors,
  type Files,
  LINK,
  proseLines,
  readRepository,
  SPEC_PATH,
  withoutCode,
} from "./spec-markdown.js";
import {
  canonical,
  CITATION,
  type Heading,
  isRetired,
  LEDGER,
  parseLedger,
  parseSpec,
  render,
} from "./spec-ids.js";

/** Runs every spec-ids check. `files` holds openspec/ and docs/; `base` the main specs at the base ref. */
export function checkSpecIds(files: Files, base: Files | Error): string[] {
  const failures: string[] = [];

  // Main specs only: openspec/specs/<capability>/spec.md (scope).
  const specs = Object.keys(files)
    .filter((file) => SPEC_PATH.test(file))
    .sort();
  const headings: Heading[] = [];
  for (const file of specs) {
    const parsed = parseSpec(file, files[file]);
    headings.push(...parsed.headings);
    failures.push(...parsed.bad);
  }
  const identified = headings.filter((heading) => heading.id !== undefined);
  const live = new Map<string, Heading[]>();
  for (const heading of identified) live.set(heading.id!, [...(live.get(heading.id!) ?? []), heading]);

  // duplicate-id: one heading per identifier.
  for (const [id, owners] of live) {
    if (owners.length > 1) {
      failures.push(
        `[duplicate-id] ${render(id)} is on ${owners.length} headings: ${owners.map((h) => `${h.file} "${h.text}"`).join(", ")}.`,
      );
    }
  }

  const ledger = parseLedger(files[LEDGER], failures);
  if (ledger) {
    // prefix: one prefix per capability, one capability per prefix, and matching headings.
    const prefixOf = new Map<string, string[]>();
    for (const [prefix, { capability }] of ledger.prefixes) {
      prefixOf.set(capability, [...(prefixOf.get(capability) ?? []), prefix]);
    }
    for (const [capability, prefixes] of prefixOf) {
      if (prefixes.length > 1) {
        failures.push(`[prefix] capability ${capability} has ${prefixes.length} prefixes: ${prefixes.join(", ")}.`);
      }
    }
    for (const file of specs) {
      const capability = SPEC_PATH.exec(file)![1];
      const prefixes = prefixOf.get(capability) ?? [];
      if (prefixes.length === 0) {
        failures.push(`[prefix] capability ${capability} has no prefix in ${LEDGER}.`);
        continue;
      }
      for (const heading of identified.filter((h) => h.file === file && !prefixes.includes(h.prefix!))) {
        failures.push(
          `[prefix] ${file}: heading "${heading.text}" uses ${heading.prefix}, not the prefix ${prefixes[0]} of ${capability}.`,
        );
      }
    }

    // next and missing-id: requirement numbers are allocated forward and never vanish.
    for (const heading of identified.filter((h) => h.kind === "requirement")) {
      const entry = ledger.prefixes.get(heading.prefix!);
      const number = Number(heading.id!.split("-")[1]);
      if (entry && number >= entry.next) {
        failures.push(
          `[next] ${heading.file}: heading "${heading.text}" is at or above next (${entry.next}) for ${heading.prefix}.`,
        );
      }
    }
    for (const [prefix, { next }] of ledger.prefixes) {
      for (let number = 1; number < next; number++) {
        const id = `${prefix}-${number}`;
        if (!live.has(id) && !ledger.retired.has(id)) {
          failures.push(`[missing-id] ${render(id)} is neither live nor retired.`);
        }
      }
    }

    // vanished-scenario: scenario identifiers at the base ref never vanish.
    if (base instanceof Error) {
      failures.push(`[vanished-scenario] cannot read the main specs at the base ref: ${base.message}`);
    } else {
      const before = new Set<string>();
      for (const [file, text] of Object.entries(base)) {
        if (!SPEC_PATH.test(file)) continue;
        for (const heading of parseSpec(file, text).headings) {
          if (heading.kind === "scenario" && heading.id) before.add(heading.id);
        }
      }
      for (const id of [...before].sort()) {
        if (!live.has(id) && !isRetired(ledger, id)) {
          failures.push(`[vanished-scenario] ${render(id)} is in the base specs and is neither live nor retired.`);
        }
      }
    }

    // retired-reuse and replaced-by: retired identifiers stay retired, and relocations point to live ones.
    for (const [id, { replacedBy }] of ledger.retired) {
      for (const heading of live.get(id) ?? []) {
        failures.push(`[retired-reuse] ${heading.file}: heading "${heading.text}" uses the retired identifier ${render(id)}.`);
      }
      if (replacedBy !== undefined && !live.has(replacedBy)) {
        failures.push(`[replaced-by] retired ${render(id)} has replaced_by ${render(replacedBy)}, which is not live.`);
      }
    }
  }

  // citation and link: citations and spec links in openspec/specs/ and docs/ resolve.
  const sources = Object.keys(files)
    .filter((file) => /\.md$/.test(file) && (file.startsWith("openspec/specs/") || file.startsWith("docs/")))
    .sort();
  const anchorCache = new Map<string, Set<string>>();
  for (const file of sources) {
    for (const [lineNo, raw] of proseLines(files[file])) {
      const line = withoutCode(raw);
      for (const [, cited] of line.matchAll(CITATION)) {
        const key = canonical(cited)!;
        // Only ledger prefixes make a citation. [CM-8] is a NIST control, not a spec identifier.
        if (!ledger?.prefixes.has(key.split("-")[0])) continue;
        if (!live.has(key) && !isRetired(ledger, key)) {
          failures.push(`[citation] ${file}:${lineNo}: citation [${cited}] is neither live nor retired.`);
        }
      }
      for (const [, target] of line.matchAll(LINK)) {
        if (/^[a-z]+:/i.test(target) || target.startsWith("#") || !target.includes("#")) continue;
        const [href, anchor] = target.split("#", 2);
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), href));
        if (!SPEC_PATH.test(resolved)) continue;
        if (!anchorCache.has(resolved)) {
          anchorCache.set(resolved, files[resolved] === undefined ? new Set() : anchors(files[resolved]));
        }
        if (!anchorCache.get(resolved)!.has(anchor)) {
          failures.push(`[link] ${file}:${lineNo}: link ${target} names no heading in ${resolved}.`);
        }
      }
    }
  }

  return failures;
}

/** The main specs at a git ref. */
function readBase(root: string, ref: string): Files | Error {
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    const files: Files = {};
    for (const file of git("ls-tree", "-r", "--name-only", ref, "--", "openspec/specs").split("\n")) {
      if (SPEC_PATH.test(file)) files[file] = git("show", `${ref}:${file}`);
    }
    return files;
  } catch (error) {
    return new Error(`${ref}: ${(error as Error).message.split("\n")[0]}`);
  }
}

function selfTest(): number {
  const spec = (cap: string, body: string) => `# ${cap} Specification\n\n## Purpose\nTest.\n\n## Requirements\n\n${body}`;
  const req = (id: string, title: string, scenarios: string[]) =>
    `### Requirement: ${id} ${title}\n\nText.\n\n` +
    scenarios.map((s) => `#### Scenario: ${s}\n\n- **WHEN** x\n- **THEN** y\n\n`).join("");
  const sidBody = [
    req("WID-001", "One widget key", ["WID-001.01 Missing key"]),
    req("WID-002", "Widget key form", ["WID-002.01 Valid key", "WID-002.02 Uppercase letters"]),
    req("WID-003", "Unique widget keys", ["WID-003.01 Duplicate key"]),
    req("WID-004", "Widget size", ["WID-004.01 Zero size"]),
    req("WID-005", "One widget per type", ["WID-005.01 Shared type"]),
    req("WID-006", "Widget key of a part", ["WID-006.01 Key on a part"]),
  ].join("");
  const ledger = (extra = "", retired = "[]") =>
    `prefixes:\n  WID:\n    capability: widget-parsing\n    next: 7\n  OUT:\n    capability: widget-output\n    next: 2\n${extra}retired: ${retired}\n`;
  const fixture = () => {
    const files: Files = {
      [LEDGER]: ledger(),
      "openspec/specs/widget-parsing/spec.md": spec("widget-parsing", sidBody),
      "openspec/specs/widget-output/spec.md": spec(
        "widget-output",
        req("OUT-001", "Widget output resolves", ["OUT-001.01 Same widget"]).replace(
          "Text.",
          "The widget key follows [WID-002].",
        ),
      ),
      "docs/guide.md":
        "See [the key form](../openspec/specs/widget-parsing/spec.md#requirement-wid-002-widget-key-form).\n",
    };
    const base: Files = Object.fromEntries(Object.entries(files).filter(([file]) => SPEC_PATH.test(file)));
    return { files, base };
  };
  const WID = "openspec/specs/widget-parsing/spec.md";
  const replace = (files: Files, file: string, from: string, to: string) => {
    if (!files[file].includes(from)) throw new Error(`fixture has no "${from}"`);
    files[file] = files[file].replace(from, to);
  };

  let failed = 0;
  /** `expect` null: zero failures. Otherwise some failure starts with `[rule]` and contains `needle`. */
  const scenario = (
    name: string,
    mutate: (f: { files: Files; base: Files }) => void,
    expect: { rule: string; needle: string } | null,
  ) => {
    const f = fixture();
    mutate(f);
    const out = checkSpecIds(f.files, f.base);
    const ok =
      expect === null
        ? out.length === 0
        : out.some((line) => line.startsWith(`[${expect.rule}]`) && line.includes(expect.needle));
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      ${JSON.stringify(out)}`}`);
  };

  console.log("## spec-ids");
  scenario("baseline has zero failures", () => {}, null);
  scenario("requirement-id: Well-formed identifier", () => {}, null);
  scenario(
    "requirement-id: No identifier",
    (f) => replace(f.files, WID, "Requirement: WID-002 Widget key form", "Requirement: Widget key form"),
    { rule: "requirement-id", needle: '"Widget key form"' },
  );
  scenario(
    "requirement-id: Under-padded number",
    (f) => replace(f.files, WID, "Requirement: WID-002 Widget", "Requirement: WID-2 Widget"),
    { rule: "requirement-id", needle: '"WID-2 Widget key form"' },
  );
  scenario("scenario-id: Well-formed identifier", () => {}, null);
  scenario(
    "scenario-id: Under-padded sub-number",
    (f) => replace(f.files, WID, "Scenario: WID-002.01 Valid key", "Scenario: WID-002.1 Valid key"),
    { rule: "scenario-id", needle: '"WID-002.1 Valid key"' },
  );
  scenario(
    "scenario-id: Surplus leading zero",
    (f) => replace(f.files, WID, "Scenario: WID-002.01 Valid key", "Scenario: WID-002.001 Valid key"),
    { rule: "scenario-id", needle: '"WID-002.001 Valid key"' },
  );
  scenario(
    "scenario-id: Wide sub-number",
    (f) =>
      replace(
        f.files,
        WID,
        "#### Scenario: WID-002.02",
        "#### Scenario: WID-002.100 Valid key\n\n- **WHEN** x\n- **THEN** y\n\n#### Scenario: WID-002.02",
      ),
    null,
  );
  scenario(
    "scenario-parent: Scenario under another requirement",
    (f) =>
      replace(
        f.files,
        WID,
        "#### Scenario: WID-002.02",
        "#### Scenario: WID-003.02 Misplaced\n\n- **WHEN** x\n- **THEN** y\n\n#### Scenario: WID-002.02",
      ),
    { rule: "scenario-parent", needle: '"WID-003.02 Misplaced" is under WID-002' },
  );
  scenario("ledger: Prefix entry", () => {}, null);
  scenario("ledger: Missing ledger", (f) => delete f.files[LEDGER], { rule: "ledger", needle: "does not exist" });
  scenario(
    "prefix: Wrong prefix",
    (f) => replace(f.files, WID, "### Requirement: WID-006", "### Requirement: OUT-012 One widget key\n\nText.\n\n### Requirement: WID-006"),
    { rule: "prefix", needle: '"OUT-012 One widget key" uses OUT' },
  );
  scenario(
    "prefix: Capability without a prefix",
    (f) => (f.files["openspec/specs/new-capability/spec.md"] = spec("new-capability", "")),
    { rule: "prefix", needle: "capability new-capability has no prefix" },
  );
  scenario(
    "duplicate-id: Duplicate requirement identifier",
    (f) => replace(f.files, WID, "Requirement: WID-005 One", "Requirement: WID-004 One"),
    { rule: "duplicate-id", needle: "WID-004 is on 2 headings" },
  );
  scenario(
    "next: Number at the high-water mark",
    (f) => (f.files[WID] += req("WID-007", "Too far", ["WID-007.01 Example"])),
    { rule: "next", needle: '"WID-007 Too far"' },
  );
  scenario(
    "missing-id: Requirement removed without a ledger entry",
    (f) => replace(f.files, WID, req("WID-004", "Widget size", ["WID-004.01 Zero size"]), ""),
    { rule: "missing-id", needle: "WID-004 is neither live nor retired" },
  );
  scenario(
    "vanished-scenario: Scenario removed without a ledger entry",
    (f) =>
      replace(
        f.base,
        WID,
        "#### Scenario: WID-002.02",
        "#### Scenario: WID-002.03 Removed\n\n- **WHEN** x\n- **THEN** y\n\n#### Scenario: WID-002.02",
      ),
    { rule: "vanished-scenario", needle: "WID-002.03 is in the base specs" },
  );
  scenario(
    "retired-reuse: Retired identifier on a heading",
    (f) => (f.files[LEDGER] = ledger("", "\n  - { id: WID-004, reason: test }")),
    { rule: "retired-reuse", needle: "retired identifier WID-004" },
  );
  const relocate = (f: { files: Files }, target: string) => {
    replace(f.files, WID, req("WID-004", "Widget size", ["WID-004.01 Zero size"]), "");
    f.files["openspec/specs/widget-rules/spec.md"] = spec(
      "widget-rules",
      req("RWD-001", "Analysis", ["RWD-001.01 Example"]) + req("RWD-002", "Key count", ["RWD-002.01 Example"]),
    );
    f.files[LEDGER] = ledger(
      "  RWD:\n    capability: widget-rules\n    next: 3\n",
      `\n  - { id: WID-004, reason: moved, replaced_by: ${target} }`,
    );
  };
  scenario("replaced-by: Relocated requirement", (f) => relocate(f, "RWD-002"), null);
  scenario("replaced-by: Relocation to a missing identifier", (f) => relocate(f, "RWD-099"), {
    rule: "replaced-by",
    needle: "replaced_by RWD-099",
  });
  scenario("citation: Citation of a live requirement", () => {}, null);
  scenario(
    "citation: Citation of an unknown identifier",
    (f) => (f.files["docs/other.md"] = "Follows [WID-099].\n"),
    { rule: "citation", needle: "docs/other.md:1: citation [WID-099]" },
  );
  scenario(
    "citation: NIST control in brackets",
    (f) => (f.files["docs/other.md"] = "Follows [CM-8](#cm-8-system-component-inventory) and [AC-2].\n"),
    null,
  );
  scenario("link: Link to a live heading", () => {}, null);
  scenario(
    "link: Link to a missing heading",
    (f) => (f.files["docs/other.md"] = "[Gone](../openspec/specs/widget-parsing/spec.md#requirement-wid-099-gone)\n"),
    { rule: "link", needle: "#requirement-wid-099-gone" },
  );
  scenario("scope: Clean corpus", () => {}, null);
  scenario(
    "scope: Failure message",
    (f) => replace(f.files, WID, "Requirement: WID-002 Widget key form", "Requirement: Widget key form"),
    { rule: "requirement-id", needle: '"Widget key form"' },
  );
  scenario(
    "scope: Change specs are out of scope",
    (f) => (f.files["openspec/changes/x/specs/y/spec.md"] = spec("y", "### Requirement: No id\n\n")),
    null,
  );
  scenario(
    "retired-scenarios: Requirement and its scenarios removed",
    (f) => {
      replace(f.files, WID, req("WID-004", "Widget size", ["WID-004.01 Zero size"]), "");
      f.files[LEDGER] = ledger("", "\n  - { id: WID-004, reason: test }");
      f.files["docs/other.md"] = "Follows [WID-004.01].\n";
    },
    null,
  );
  scenario(
    "retired-scenarios: Scenario removed from a live requirement",
    (f) =>
      replace(
        f.base,
        WID,
        "#### Scenario: WID-002.02",
        "#### Scenario: WID-002.03 Removed\n\n- **WHEN** x\n- **THEN** y\n\n#### Scenario: WID-002.02",
      ),
    { rule: "vanished-scenario", needle: "WID-002.03 is in the base specs" },
  );
  scenario(
    "code spans and fences are not citations",
    (f) => (f.files["docs/other.md"] = "Write `[WID-099]` like this.\n\n```\n[WID-098]\n```\n"),
    null,
  );

  console.log(failed ? `\n${failed} FAILED` : "\nall spec-ids scenarios pass");
  return failed ? 1 : 0;
}

if (process.argv.includes("--self-test")) {
  process.exit(selfTest());
} else {
  const root = process.cwd();
  const ref = process.env.SPEC_IDS_BASE || "HEAD";
  const failures = checkSpecIds(readRepository(root, [LEDGER]), readBase(root, ref));
  for (const failure of failures) console.error(failure);
  console.log(failures.length ? `\n${failures.length} spec identifier failure(s)` : "spec identifiers: ok");
  process.exit(failures.length ? 1 : 0);
}
