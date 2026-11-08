/**
 * Builds the spec artifact: a .tar.gz of the contract at a git ref, plus SHA256SUMS. The archive holds the main specs,
 * the requirement index, the traceability record JSON Schema, the vendored schemas, the manifest, the corpus, the
 * shared rule documents, VERSION, and LICENSE, under one directory named for the artifact version.
 *
 *   npm run archive              build from HEAD into dist/
 *   npm run archive -- <ref>     build from <ref>, for example a release tag
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

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
  "openspec/requirements.json",
  "openspec/spec-ids.yaml",
  "openspec/specs",
  "openspec/traceability.schema.json",
  "schemas",
];

const ref = process.argv[2] ?? "HEAD";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
const version = git("show", `${ref}:VERSION`).trim();
const name = `oscal-bindings-specs-${version}`;
fs.mkdirSync("dist", { recursive: true });
const archive = `dist/${name}.tar.gz`;
// git archive sets each file time to the commit time, so the same ref and git version give the same bytes.
git("archive", "--format=tar.gz", `--prefix=${name}/`, "-o", archive, ref, "--", ...CONTENTS);
const digest = createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
fs.writeFileSync("dist/SHA256SUMS", `${digest}  ${name}.tar.gz\n`);
console.log(`${digest}  ${archive}`);
