/**
 * Builds the spec artifact: a .tar.gz of the contract at a git ref, plus SHA256SUMS. The archive holds the main specs,
 * the requirement index, the traceability record JSON Schema, the vendored schemas and metaschema, the manifest, the corpus, the
 * shared rule documents, VERSION, and LICENSE, under one directory named for the artifact version.
 *
 *   npm run archive              build from HEAD into dist/
 *   npm run archive -- <ref>     build from <ref>, for example a release tag
 *   npm run archive:self-test    build from HEAD into a temporary directory and list the archive
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
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
];

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });

/** Builds the archive of `ref` and its SHA256SUMS into `dir`. Returns the archive path, its name, and its sha256. */
export function build(ref: string, dir: string) {
  const version = git("show", `${ref}:VERSION`).trim();
  const name = `oscal-bindings-specs-${version}`;
  fs.mkdirSync(dir, { recursive: true });
  const archive = `${dir}/${name}.tar.gz`;
  // git archive sets each file time to the commit time, so the same ref and git version give the same bytes.
  git("archive", "--format=tar.gz", `--prefix=${name}/`, "-o", archive, ref, "--", ...CONTENTS);
  const digest = createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
  fs.writeFileSync(`${dir}/SHA256SUMS`, `${digest}  ${name}.tar.gz\n`);
  return { archive, name, digest };
}

/** The file entries of the archive, without the directory named for the artifact version. */
function listing(archive: string, name: string): string[] {
  const entries = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).split("\n").filter(Boolean);
  return entries.filter((e) => !e.endsWith("/")).map((e) => e.slice(`${name}/`.length));
}

function selfTest(): number {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-archive-"));
  let failed = 0;
  try {
    const { archive, name } = build("HEAD", dir);
    const files = listing(archive, name);
    const cases: Array<[string, boolean]> = [
      ["SRF-006.04 the spec artifact holds the requirement index", files.includes("openspec/requirements.json")],
      ["SRF-007.03 the spec artifact holds the traceability JSON Schema", files.includes("openspec/traceability.schema.json")],
    ];
    for (const [test, ok] of cases) {
      if (!ok) failed++;
      console.log(`${ok ? "PASS" : "FAIL"}  ${test}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return failed ? 1 : 0;
}

if (process.argv.includes("--self-test")) {
  process.exit(selfTest());
} else if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "build-archive.ts") {
  const { archive, digest } = build(process.argv[2] ?? "HEAD", "dist");
  console.log(`${digest}  ${archive}`);
}
