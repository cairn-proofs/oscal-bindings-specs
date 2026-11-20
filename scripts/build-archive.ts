/**
 * Builds the spec artifact: a .tar.gz of the contract at a git ref, plus SHA256SUMS. The archive holds the main specs,
 * the requirement index, the traceability record JSON Schema, the vendored schemas and metaschema, the manifest, the corpus, the
 * shared rule documents, VERSION, and LICENSE, under one directory named for the artifact version.
 *
 *   npm run archive              build from HEAD into dist/
 *   npm run archive -- <ref>     build from <ref>, for example a release tag
 *   npm run archive:self-test    run the scenarios of the contents on HEAD
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * The paths the artifact holds. Tooling, the changes, and CI config stay out. scripts/verify-release.sh reads this
 * list as text at each release tag: keep it a literal array of double-quoted strings that ends with `];`.
 */
export const CONTENTS = [
  "LICENSE",
  "VERSION",
  "corpus",
  "docs",
  "manifest",
  "metaschema",
  "openspec/requirements.json",
  "openspec/spec-ids.yaml",
  "openspec/specs",
  "openspec/traceability.schema.json",
  "schemas",
  "templates",
];

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });

/** The paths of the archive that `git archive` builds from `ref` for `contents`, as the archive lists them without the prefix. */
export function archivePaths(ref: string, contents: string[]): string[] {
  const tar = execFileSync("git", ["archive", "--format=tar", "--prefix=x/", ref, "--", ...contents], { maxBuffer: 1 << 30 });
  const listing = execFileSync("tar", ["-tf", "-"], { input: tar, encoding: "utf8", maxBuffer: 1 << 28 });
  return listing.split("\n").filter((l) => l.length > 0 && !l.endsWith("/")).map((l) => l.slice("x/".length));
}

function build(ref: string): void {
  const version = git("show", `${ref}:VERSION`).trim();
  const name = `oscal-bindings-specs-${version}`;
  fs.mkdirSync("dist", { recursive: true });
  const archive = `dist/${name}.tar.gz`;
  // git archive sets each file time to the commit time, so the same ref and git version give the same bytes.
  git("archive", "--format=tar.gz", `--prefix=${name}/`, "-o", archive, ref, "--", ...CONTENTS);
  const digest = createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
  fs.writeFileSync("dist/SHA256SUMS", `${digest}  ${name}.tar.gz\n`);
  console.log(`${digest}  ${archive}`);
}

function selfTest(): number {
  const cases: Array<[string, () => boolean | string]> = [];
  const test = (name: string, fn: () => boolean | string) => cases.push([name, fn]);
  const releases = fs.readdirSync("metaschema", { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const inArchive = archivePaths("HEAD", CONTENTS);
  test("CNS-001.02: the archive holds each file of metaschema/<release>/, with each module, the datatypes file and SHA256SUMS", () => {
    if (releases.length === 0) return "the store holds no metaschema release";
    for (const release of releases) {
      const dir = `metaschema/${release}`;
      const listed = fs
        .readFileSync(`${dir}/SHA256SUMS`, "utf8")
        .split("\n")
        .filter((l) => l.length > 0)
        .map((l) => l.replace(/^[0-9a-f]+ [ *]/, ""));
      const modules = listed.filter((f) => /^oscal_.*_metaschema_RESOLVED\.xml$/.test(f));
      if (modules.length === 0 || !listed.includes("metaschema-datatypes.xsd")) return `${dir}/SHA256SUMS lists no module or no datatypes file`;
      for (const file of [...listed, "SHA256SUMS"]) if (!inArchive.includes(`${dir}/${file}`)) return `the archive lacks ${dir}/${file}`;
    }
    return true;
  });
  test("CNS-001.02: the archive of a list without metaschema holds no metaschema file", () =>
    archivePaths("HEAD", CONTENTS.filter((c) => c !== "metaschema")).every((p) => !p.startsWith("metaschema/")) && inArchive.some((p) => p.startsWith("metaschema/")));
  test("SRF-006.04 the spec artifact holds the requirement index", () => inArchive.includes("openspec/requirements.json"));
  test("SRF-007.03 the spec artifact holds the traceability JSON Schema", () => inArchive.includes("openspec/traceability.schema.json"));
  test("SRF-008.01 the spec artifact holds the sticker file", () => inArchive.includes("docs/sticker.md"));
  test("SRF-008.02 the sticker file holds the version badge and the status badge", () => {
    const sticker = fs.readFileSync("docs/sticker.md", "utf8");
    return sticker.includes("https://img.shields.io/badge/dynamic/json?") && sticker.includes("https://img.shields.io/github/actions/workflow/status/");
  });
  test("SRF-011.01 the archive holds each file of templates/binding/", () => {
    const files = git("ls-files", "templates/binding").split("\n").filter((f) => f.length > 0);
    const lacking = files.filter((f) => !inArchive.includes(f));
    return (files.length > 0 && lacking.length === 0) || `the archive lacks ${lacking.join(", ") || "templates/binding/"}. Commit the templates before the self-test, because it reads HEAD.`;
  });
  test("the archive holds VERSION, LICENSE, the specs, the schemas, the manifest and the corpus", () =>
    ["VERSION", "LICENSE"].every((f) => inArchive.includes(f)) && ["openspec/specs/", "schemas/", "manifest/", "corpus/"].every((d) => inArchive.some((p) => p.startsWith(d))));
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

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "build-archive.ts") {
  if (process.argv[2] === "--self-test") process.exit(selfTest());
  build(process.argv[2] ?? "HEAD");
}
