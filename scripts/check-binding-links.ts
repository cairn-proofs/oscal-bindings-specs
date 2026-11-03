/**
 * Checks that the store links no individual issue or pull request in a binding repository (VER-006). A binding keeps
 * its own expected failures, so no store content depends on the state of a binding.
 *
 * 1. The binding repositories are the GitHub repositories that `## Known implementations` in README.md links, and
 *    each GitHub repository named `oscal-bindings-<name>` other than the store, `oscal-bindings-specs`.
 * 2. The section must exist and link at least one repository.
 * 3. No tracked file outside openspec/changes/ contains `github.com/<owner>/<repo>/issues/<N>`,
 *    `github.com/<owner>/<repo>/pull/<N>`, or the reference `<owner>/<repo>#<N>` for a binding repository. The match
 *    ignores case. A link to the tracker, `github.com/<owner>/<repo>/issues`, passes. An OpenSpec change can name a
 *    binding issue.
 *
 *   npm run binding-links:check        check the tracked files
 *   npm run binding-links:self-test    run the self-test
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const README = "README.md";
const SECTION = "## Known implementations";
const EXEMPT = "openspec/changes/";
const STORE = "oscal-bindings-specs";
const NAMED_BINDING = /^oscal-bindings-[\w.-]+$/i;
const SEGMENT = String.raw`[\w.-]+`;
const URL_LINK = new RegExp(String.raw`github\.com/(${SEGMENT})/(${SEGMENT})/(?:issues|pull)/\d+`, "gi");
// A GitHub reference such as owner/repo#12. The lookbehind stops a match inside a URL path or a longer word.
const REFERENCE = new RegExp(String.raw`(?<![\w./-])(${SEGMENT})/(${SEGMENT})#\d+\b`, "gi");
const REPO_LINK = new RegExp(String.raw`https://github\.com/(${SEGMENT})/(${SEGMENT})`, "gi");

interface File {
  path: string;
  text: string;
}

const key = (owner: string, repo: string) => `${owner}/${repo.replace(/\.git$/i, "")}`.toLowerCase();

/** The binding repositories, as lowercase `owner/repo`, that the Known implementations section of the README links. */
function listedRepositories(readme: string | undefined, fail: (message: string) => void): Set<string> {
  const repos = new Set<string>();
  if (readme === undefined) {
    fail(`${README} does not exist.`);
    return repos;
  }
  const lines = readme.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === SECTION);
  if (start < 0) {
    fail(`${README} has no "${SECTION}" section. List each binding repository there.`);
    return repos;
  }
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2} /.test(line)) break;
    for (const m of line.matchAll(REPO_LINK)) if (m[2].toLowerCase() !== STORE) repos.add(key(m[1], m[2]));
  }
  if (repos.size === 0) fail(`the "${SECTION}" section of ${README} links no binding repository.`);
  return repos;
}

/** Returns the failures for a set of tracked files. */
export function checkFiles(files: File[]): string[] {
  const failures: string[] = [];
  const fail = (message: string) => failures.push(`[binding-links] ${message}`);
  const listed = listedRepositories(files.find((f) => f.path === README)?.text, fail);
  const isBinding = (owner: string, repo: string) => {
    const name = repo.replace(/\.git$/i, "");
    return listed.has(key(owner, name)) || (NAMED_BINDING.test(name) && name.toLowerCase() !== STORE);
  };
  for (const file of files) {
    if (file.path.startsWith(EXEMPT)) continue;
    file.text.split(/\r?\n/).forEach((line, i) => {
      for (const pattern of [URL_LINK, REFERENCE]) {
        for (const m of line.matchAll(pattern)) {
          if (isBinding(m[1], m[2]))
            fail(`${file.path}:${i + 1}: "${m[0]}" links an individual binding issue. Link the tracker (VER-006).`);
        }
      }
    });
  }
  return failures;
}

function selfTest(): number {
  const readme = [
    "# Store",
    "",
    SECTION,
    "",
    "1. [repository](https://github.com/cairn-proofs/oscal-bindings-python),",
    "   [issue tracker](https://github.com/cairn-proofs/oscal-bindings-python/issues).",
    "2. [repository](https://github.com/acme/oscal-go)",
    "",
    "## Develop",
    "",
    "See https://github.com/other/listed-after-section.",
  ].join("\n");
  const run = (extra: File[], text = readme) => checkFiles([{ path: README, text }, ...extra]);
  const doc = (text: string, path = "docs/note.md"): File[] => [{ path, text }];
  const cases: Array<[string, string[], string | null]> = [
    ["repository and tracker links pass", run([]), null],
    ["issue URL fails", run(doc("https://github.com/cairn-proofs/oscal-bindings-python/issues/6")), "docs/note.md:1"],
    ["pull URL fails", run(doc("x github.com/cairn-proofs/oscal-bindings-python/pull/12 y")), "/pull/12"],
    ["reference fails", run(doc("See cairn-proofs/oscal-bindings-python#33.")), "oscal-bindings-python#33"],
    ["match ignores case", run(doc("GitHub.com/Cairn-Proofs/OSCAL-Bindings-Python/issues/6")), "links an individual"],
    ["line number is reported", run(doc("one\ntwo cairn-proofs/oscal-bindings-python#6")), "docs/note.md:2"],
    ["listed repository with another name fails", run(doc("acme/oscal-go#1")), "acme/oscal-go#1"],
    [
      "unlisted oscal-bindings-* repository fails",
      run(doc("github.com/x/oscal-bindings-go/issues/1")),
      "oscal-bindings-go",
    ],
    [
      "store issue passes",
      run(doc("cairn-proofs/oscal-bindings-specs#23 github.com/cairn-proofs/oscal-bindings-specs/issues/23")),
      null,
    ],
    [
      "unrelated repository passes",
      run(doc("usnistgov/oscal-content#5 github.com/usnistgov/oscal-content/issues/5")),
      null,
    ],
    [
      "active change is exempt",
      run(doc("cairn-proofs/oscal-bindings-python#33", "openspec/changes/x/tasks.md")),
      null,
    ],
    [
      "archived change is exempt",
      run(doc("cairn-proofs/oscal-bindings-python#7", "openspec/changes/archive/x/tasks.md")),
      null,
    ],
    [
      "link in the README fails",
      run([], `${readme}\nhttps://github.com/cairn-proofs/oscal-bindings-python/issues/19`),
      "README.md:12",
    ],
    ["README without the section fails", run([], "# Store\n"), "has no"],
    ["section without a repository fails", run([], `${SECTION}\n\nNone yet.\n`), "links no binding repository"],
    ["section ends at the next heading", run(doc("other/listed-after-section#1")), null],
    ["missing README fails", checkFiles(doc("text")), "does not exist"],
  ];
  let failed = 0;
  for (const [name, out, needle] of cases) {
    const ok = needle === null ? out.length === 0 : out.some((line) => line.includes(needle));
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      ${JSON.stringify(out)}`}`);
  }
  return failed ? 1 : 0;
}

function trackedFiles(): File[] {
  const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  // A path that git tracks but the working tree deleted has no content to check. Invalid UTF-8 decodes to U+FFFD.
  return paths.filter((p) => fs.existsSync(p)).map((p) => ({ path: p, text: fs.readFileSync(p).toString("utf8") }));
}

if (process.argv.includes("--self-test")) {
  process.exit(selfTest());
} else {
  const files = trackedFiles();
  const failures = checkFiles(files);
  for (const failure of failures) console.error(failure);
  const summary = failures.length
    ? `\n${failures.length} binding-link failure(s)`
    : `binding-links: ok (${files.length} files)`;
  console.log(summary);
  process.exit(failures.length ? 1 : 0);
}
