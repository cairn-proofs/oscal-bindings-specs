/**
 * Checks that the digest check of the vendored metaschema fails for a changed file (openspec/specs/constraint-validation,
 * STO-006). The digest check is the command of the script `metaschema:verify` in package.json. The self-test copies
 * metaschema/<release>/ to a temporary directory, changes a file of the copy, and runs that command in the copy.
 *
 *   npm run metaschema:self-test    run the scenarios
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** The command that `metaschema:verify` runs in a release directory, from package.json: the text after `cd metaschema/<release> && `. */
function verifyCommand(): string {
  const scripts = (JSON.parse(fs.readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;
  const text = scripts["metaschema:verify"];
  const match = /^cd metaschema\/[^ ]+ && (.+)$/.exec(text ?? "");
  if (!match) throw new Error(`the script metaschema:verify has an unexpected form: ${text}`);
  return match[1];
}

/** Runs the digest check in `dir`. */
function verify(dir: string): { ok: boolean; output: string } {
  const r = spawnSync(verifyCommand(), { cwd: dir, shell: true, encoding: "utf8" });
  return { ok: r.status === 0, output: `${r.stdout}${r.stderr}` };
}

function selfTest(): number {
  const releases = fs.readdirSync("metaschema", { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "metaschema-digests-"));
  const cases: Array<[string, () => boolean | string]> = [];
  const test = (name: string, fn: () => boolean | string) => cases.push([name, fn]);
  /** The files that SHA256SUMS lists for a release. */
  const listed = (release: string): string[] =>
    fs
      .readFileSync(`metaschema/${release}/SHA256SUMS`, "utf8")
      .split("\n")
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/^[0-9a-f]+ [ *]/, ""));
  /** A copy of a release directory with `edit` applied. */
  const copy = (release: string, edit: (dir: string) => void): string => {
    const dir = fs.mkdtempSync(path.join(tmp, `${release}-`));
    fs.cpSync(`metaschema/${release}`, dir, { recursive: true });
    edit(dir);
    return dir;
  };
  const appendByte = (file: string) => (dir: string) => fs.appendFileSync(path.join(dir, file), " ");
  try {
    const eachRelease = (check: (release: string) => boolean | string): boolean | string => {
      if (releases.length === 0) return "no directory under metaschema/";
      for (const release of releases) {
        const out = check(release);
        if (out !== true) return `metaschema/${release}/: ${out}`;
      }
      return true;
    };
    test("STO-006.01: the unchanged files pass the digest check", () =>
      eachRelease((release) => {
        const r = verify(copy(release, () => {}));
        return r.ok || r.output;
      }));
    test("STO-006.01: a changed byte in a module fails the digest check", () =>
      eachRelease((release) => {
        const modules = listed(release).filter((f) => f.endsWith(".xml"));
        if (modules.length === 0) return "SHA256SUMS lists no module";
        for (const file of modules) {
          const r = verify(copy(release, appendByte(file)));
          if (r.ok || !r.output.includes(file)) return `the digest check does not fail for a changed ${file}: ${r.output}`;
        }
        return true;
      }));
    test("STO-006.01: a changed byte in metaschema-datatypes.xsd fails the digest check", () =>
      eachRelease((release) => {
        const r = verify(copy(release, appendByte("metaschema-datatypes.xsd")));
        return (!r.ok && r.output.includes("metaschema-datatypes.xsd")) || r.output;
      }));
    test("STO-006.01: a missing module fails the digest check", () =>
      eachRelease((release) => {
        const file = listed(release).find((f) => f.endsWith(".xml"));
        return (file !== undefined && !verify(copy(release, (dir) => fs.rmSync(path.join(dir, file)))).ok) || "the digest check passes";
      }));
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
  } finally {
    fs.rmSync(tmp, { recursive: true });
  }
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "check-metaschema-digests.ts") {
  if (process.argv.includes("--self-test")) process.exit(selfTest());
  console.error("usage: tsx scripts/check-metaschema-digests.ts --self-test");
  process.exit(2);
}
