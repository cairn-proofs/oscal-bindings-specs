/**
 * Checks the spec artifact version in VERSION against the schema-versioning capability. The version is a
 * Semantic Version with the OSCAL release as build metadata, for example 0.1.0+oscal.1.2.3. The OSCAL release
 * must name a vendored schema directory. Exits 1 when a check fails.
 *
 *   npm run version:check
 */
import fs from "node:fs";
import { parseVersion } from "./version-lib.js";

/** Returns the failures for one VERSION text. `hasSchemas` reports whether schemas/<release>/ exists. */
export function checkVersion(text: string | undefined, hasSchemas: (release: string) => boolean): string[] {
  if (text === undefined) return ["[version] VERSION does not exist."];
  const version = text.trim();
  const parsed = parseVersion(version);
  if (!parsed) {
    return [`[version] "${version}" is not MAJOR.MINOR.PATCH+oscal.<release>, for example 0.1.0+oscal.1.2.3.`];
  }
  const release = parsed.release;
  return hasSchemas(release) ? [] : [`[version] the OSCAL release ${release} has no schemas/${release}/ directory.`];
}

function selfTest(): number {
  const has = (release: string) => release === "1.2.3";
  const cases: Array<[string, string | undefined, string | null]> = [
    ["valid version", "0.1.0+oscal.1.2.3\n", null],
    ["VER-003.06 pre-release label fails", "1.0.0-rc.1+oscal.1.2.3", "is not MAJOR"],
    ["missing file", undefined, "does not exist"],
    ["no build metadata", "0.1.0", "is not MAJOR"],
    ["other build metadata", "0.1.0+build.7", "is not MAJOR"],
    ["leading zero", "0.01.0+oscal.1.2.3", "is not MAJOR"],
    ["release without schemas", "0.1.0+oscal.1.2.4", "no schemas/1.2.4/"],
  ];
  let failed = 0;
  for (const [name, text, needle] of cases) {
    const out = checkVersion(text, has);
    const ok = needle === null ? out.length === 0 : out.some((line) => line.includes(needle));
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      ${JSON.stringify(out)}`}`);
  }
  // VER-004.01: the OSCAL release is the build metadata, and the check reads it from there.
  const v = "2.4.1+oscal.1.2.3";
  const ok = parseVersion(v)?.release === "1.2.3" && checkVersion(v, has).length === 0 && v.endsWith("+oscal.1.2.3");
  const name = "VER-004.01 OSCAL release appears as build metadata";
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  return failed ? 1 : 0;
}

if (process.argv.includes("--self-test")) {
  process.exit(selfTest());
} else {
  const text = fs.existsSync("VERSION") ? fs.readFileSync("VERSION", "utf8") : undefined;
  const failures = checkVersion(text, (release) => fs.existsSync(`schemas/${release}`));
  for (const failure of failures) console.error(failure);
  console.log(failures.length ? `\n${failures.length} version failure(s)` : `version: ok (${text?.trim()})`);
  process.exit(failures.length ? 1 : 0);
}
