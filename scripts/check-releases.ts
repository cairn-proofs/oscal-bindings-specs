/**
 * Checks that read git history (openspec/specs/naming-manifest, NAM-008, and design.md of define-names-manifest-format):
 *
 * 1. The release name check: each names.json against the manifest of the same OSCAL release in the latest released
 *    spec artifact. A changed or removed name fails unless VERSION marks a breaking change. Fails closed: a shallow
 *    clone, a clone without release tags, or a missing origin/main fails the check.
 * 2. The released schema check: each file under a released schemas/<release>/ matches the file at the latest release
 *    tag of that OSCAL release.
 * 3. The name diff for reviewers: each names.json against the same file at the base ref (SPEC_IDS_BASE, default
 *    HEAD), with the cause of each change. It reports and does not fail.
 *
 * The baseline is the `v*` tag with the highest Semantic Versioning precedence that matches the VERSION grammar, names
 * the same OSCAL release, and is an ancestor of origin/main. Each list goes to the output, and to
 * $GITHUB_STEP_SUMMARY when that is set.
 *
 *   npm run releases:check
 *   npm run releases:self-test
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { storeReleases, type Manifest, type Overrides } from "./names-lib.js";

const SEMVER_OSCAL =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?\+oscal\.((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;

interface Version {
  text: string;
  core: [number, number, number];
  pre: string[];
  release: string;
}

export function parseVersion(text: string): Version | undefined {
  const m = SEMVER_OSCAL.exec(text.trim());
  if (!m) return undefined;
  return { text: text.trim(), core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split(".") : [], release: m[5] };
}

/** Semantic Versioning precedence. Build metadata takes no part. */
export function precedence(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] - b.core[i];
  if (!a.pre.length || !b.pre.length) return (a.pre.length ? -1 : 0) - (b.pre.length ? -1 : 0);
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const [x, y] = [a.pre[i], b.pre[i]];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const [nx, ny] = [/^\d+$/.test(x), /^\d+$/.test(y)];
    if (nx && ny) return Number(x) - Number(y);
    if (nx !== ny) return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/** A breaking increment: the major component increments, or, with major 0, the minor component increments. */
export function isBreaking(from: Version, to: Version): boolean {
  if (to.core[0] !== from.core[0]) return to.core[0] > from.core[0];
  return to.core[0] === 0 && to.core[1] > from.core[1];
}

/** The git operations the checks need. Each method throws when git cannot answer. */
export interface Git {
  isShallow(): boolean;
  tags(): string[];
  /** Whether the commit of the tag is an ancestor of origin/main. */
  onMain(tag: string): boolean;
  /** The bytes of a file at a ref, or undefined when the ref has no such file. */
  show(ref: string, file: string): Buffer | undefined;
  /** The files under a directory at a ref. */
  list(ref: string, dir: string): string[];
}

const run = (args: string[]) => execFileSync("git", args, { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });

export const realGit: Git = {
  isShallow: () => run(["rev-parse", "--is-shallow-repository"]).toString().trim() === "true",
  tags: () => run(["tag", "--list", "v*"]).toString().split("\n").filter(Boolean),
  onMain: (tag) => {
    run(["rev-parse", "--verify", "--quiet", "refs/remotes/origin/main"]);
    try {
      run(["merge-base", "--is-ancestor", `refs/tags/${tag}^{commit}`, "refs/remotes/origin/main"]);
      return true;
    } catch (error) {
      if ((error as { status?: number }).status === 1) return false;
      throw error;
    }
  },
  show: (ref, file) => {
    const target = /^v/.test(ref) && !ref.includes("/") ? `refs/tags/${ref}` : ref;
    try {
      run(["cat-file", "-e", `${target}:${file}`]);
    } catch {
      return undefined;
    }
    return run(["show", `${target}:${file}`]);
  },
  list: (ref, dir) =>
    run(["ls-tree", "-r", "--name-only", `refs/tags/${ref}`, "--", dir]).toString().split("\n").filter(Boolean),
};

/** The release tags for one OSCAL release, highest precedence first. */
export function releaseTags(git: Git, release: string): Version[] {
  return git
    .tags()
    .map((tag) => (tag.startsWith("v") ? parseVersion(tag.slice(1)) : undefined))
    .filter((v): v is Version => v !== undefined && v.release === release)
    .filter((v) => git.onMain(`v${v.text}`))
    .sort((a, b) => precedence(b, a));
}

interface Report {
  failures: string[];
  lines: string[];
}

interface Files {
  read(file: string): Buffer | undefined;
  list(dir: string): string[];
}

const realFiles: Files = {
  read: (file) => (fs.existsSync(file) ? fs.readFileSync(file) : undefined),
  list: (dir) => {
    const out: string[] = [];
    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.posix.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else out.push(p);
      }
    };
    walk(dir);
    return out.sort();
  },
};

const sitesToName = (m: Manifest | undefined) => {
  const map = new Map<string, string>();
  for (const t of m?.types ?? []) for (const s of t.sites) map.set(s, t.name);
  return map;
};

/** Changed and removed names of `released`, compared with `current`. */
function releasedChanges(released: Manifest, current: Manifest | undefined): string[] {
  const now = sitesToName(current);
  const out: string[] = [];
  for (const entry of released.types) {
    const site = entry.sites.find((s) => now.has(s));
    if (site === undefined) out.push(`removed ${entry.name} (${entry.sites[0]})`);
    else if (now.get(site) !== entry.name) out.push(`changed ${entry.name} -> ${now.get(site)} (${site})`);
  }
  return out;
}

/** The release name check (NAM-008) and the released schema check. */
export function checkReleases(git: Git, files: Files, releases: string[], versionText: string | undefined): Report {
  const failures: string[] = [];
  const lines: string[] = [];
  try {
    if (git.isShallow()) return { failures: ["[release-names] the clone is shallow; fetch the full history"], lines };
    if (!git.tags().some((t) => t.startsWith("v") && parseVersion(t.slice(1)))) {
      return { failures: ["[release-names] the clone has no release tags; fetch the tags"], lines };
    }
    const version = versionText === undefined ? undefined : parseVersion(versionText);
    if (!version) return { failures: ["[release-names] VERSION is not a spec artifact version"], lines };
    const schemaReleases = files.list("schemas").map((f) => f.split("/")[1]).filter((r, i, a) => r && a.indexOf(r) === i);
    for (const release of new Set([...releases, ...schemaReleases])) {
      const tags = releaseTags(git, release);
      // Released schema check.
      if (tags.length && schemaReleases.includes(release)) {
        const tag = `v${tags[0].text}`;
        const dir = `schemas/${release}`;
        const atTag = git.list(tag, dir);
        for (const file of new Set([...atTag, ...files.list(dir)])) {
          const before = atTag.includes(file) ? git.show(tag, file) : undefined;
          const now = files.read(file);
          if (before === undefined) failures.push(`[released-schema] ${file} is not in the release ${tag}`);
          else if (now === undefined) failures.push(`[released-schema] ${file} of the release ${tag} is missing`);
          else if (!before.equals(now)) failures.push(`[released-schema] ${file} differs from the release ${tag}`);
        }
      }
      // Release name check.
      if (!releases.includes(release)) continue;
      const file = `manifest/${release}/names.json`;
      const baseline = tags.find((t) => git.show(`v${t.text}`, file) !== undefined);
      if (!baseline) {
        lines.push(`${release}: no release tag holds ${file}; nothing to compare`);
        continue;
      }
      const released = JSON.parse(git.show(`v${baseline.text}`, file)!.toString()) as Manifest;
      const nowBytes = files.read(file);
      const current = nowBytes ? (JSON.parse(nowBytes.toString()) as Manifest) : undefined;
      const changes = releasedChanges(released, current);
      const breaking = isBreaking(baseline, version);
      lines.push(`${release}: compared with v${baseline.text}: ${changes.length} changed or removed released name(s)`);
      for (const c of changes) lines.push(`  ${c}`);
      if (changes.length && !breaking) {
        failures.push(
          `[release-names] ${release}: ${changes.length} released name(s) changed, and VERSION ${version.text} is not a breaking increment from v${baseline.text}`,
        );
      }
    }
  } catch (error) {
    failures.push(`[release-names] git failed: ${(error as Error).message.split("\n")[0]}`);
  }
  return { failures, lines };
}

/** The name diff for reviewers: every added, changed, and removed name against the base ref, with its cause. */
export function nameDiff(git: Git, files: Files, releases: string[], base: string): string[] {
  const rows: string[] = [];
  for (const release of releases) {
    const file = `manifest/${release}/names.json`;
    const ofile = `manifest/${release}/overrides.json`;
    const parse = <T>(b: Buffer | undefined): T | undefined => (b ? (JSON.parse(b.toString()) as T) : undefined);
    let before: Manifest | undefined;
    let beforeOv: Overrides | undefined;
    try {
      before = parse<Manifest>(git.show(base, file));
      beforeOv = parse<Overrides>(git.show(base, ofile));
    } catch (error) {
      rows.push(`| ${release} | (base ${base} unreadable: ${(error as Error).message.split("\n")[0]}) | | | |`);
      continue;
    }
    const after = parse<Manifest>(files.read(file));
    const afterOv = parse<Overrides>(files.read(ofile));
    const was = sitesToName(before);
    const now = sitesToName(after);
    const changedKey = (key: "names" | "local-names", p: string) => (beforeOv?.[key]?.[p] ?? null) !== (afterOv?.[key]?.[p] ?? null);
    const mergeSites = (o?: Overrides) => new Set((o?.merges ?? []).flat());
    const [mb, ma] = [mergeSites(beforeOv), mergeSites(afterOv)];
    const allKeys = (key: "names" | "local-names") => new Set([...Object.keys(beforeOv?.[key] ?? {}), ...Object.keys(afterOv?.[key] ?? {})]);
    const cause = (sites: string[]): string => {
      const ancestors = (keys: Set<string>) => [...keys].filter((k) => sites.some((s) => s === k || s.startsWith(`${k}/`)));
      if (sites.some((s) => changedKey("names", s))) return "override name";
      if (ancestors(allKeys("names")).some((k) => changedKey("names", k))) return "override name (parent)";
      if (ancestors(allKeys("local-names")).some((k) => changedKey("local-names", k))) return "singular local name";
      if (sites.some((s) => mb.has(s) !== ma.has(s))) return "merge";
      return "rule";
    };
    for (const t of after?.types ?? []) {
      const old = t.sites.map((s) => was.get(s)).find((n) => n !== undefined);
      if (old === undefined) rows.push(`| ${release} | added | ${t.name} | ${cause(t.sites)} | \`${t.sites[0]}\` |`);
      else if (old !== t.name) rows.push(`| ${release} | changed | ${old} -> ${t.name} | ${cause(t.sites)} | \`${t.sites[0]}\` |`);
    }
    for (const t of before?.types ?? []) {
      if (!t.sites.some((s) => now.has(s))) rows.push(`| ${release} | removed | ${t.name} | ${cause(t.sites)} | \`${t.sites[0]}\` |`);
    }
  }
  return rows;
}

function summary(text: string) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) fs.appendFileSync(file, `${text}\n`);
}

function main(): number {
  const releases = storeReleases();
  const versionText = fs.existsSync("VERSION") ? fs.readFileSync("VERSION", "utf8") : undefined;
  const report = checkReleases(realGit, realFiles, releases, versionText);
  for (const line of report.lines) console.log(line);
  for (const f of report.failures) console.error(f);
  const base = process.env.SPEC_IDS_BASE || "HEAD";
  const rows = nameDiff(realGit, realFiles, releases, base);
  const table = ["| Release | Change | Name | Cause | Pointer |", "|---|---|---|---|---|", ...rows].join("\n");
  console.log(`\nName diff against ${base}: ${rows.length} change(s)`);
  if (rows.length) console.log(table);
  summary(`### Release name check\n\n${[...report.lines, ...report.failures].map((l) => `    ${l}`).join("\n") || "    nothing to report"}\n`);
  summary(`### Name diff against \`${base}\`\n\n${rows.length ? table : "No name changes."}\n`);
  console.log(report.failures.length ? `\n${report.failures.length} release check failure(s)` : "\nreleases: ok");
  return report.failures.length ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Self-test

function fakeGit(opts: {
  shallow?: boolean;
  tags: Record<string, { main?: boolean; files: Record<string, string> }>;
  refs?: Record<string, Record<string, string>>;
}): Git {
  return {
    isShallow: () => opts.shallow ?? false,
    tags: () => Object.keys(opts.tags),
    onMain: (tag) => opts.tags[tag]?.main ?? true,
    show: (ref, file) => {
      const files = opts.tags[ref]?.files ?? opts.refs?.[ref];
      const text = files?.[file];
      return text === undefined ? undefined : Buffer.from(text);
    },
    list: (ref, dir) => Object.keys(opts.tags[ref]?.files ?? {}).filter((f) => f.startsWith(`${dir}/`)),
  };
}

function fakeFiles(files: Record<string, string>): Files {
  return {
    read: (f) => (files[f] === undefined ? undefined : Buffer.from(files[f])),
    list: (dir) => Object.keys(files).filter((f) => f.startsWith(`${dir}/`)).sort(),
  };
}

function selfTest(): number {
  const m = (types: Array<[string, string]>): string =>
    JSON.stringify({ format: 1, "oscal-release": "1.2.3", schema: { file: "s.json", sha256: "0".repeat(64) }, types: types.map(([name, site]) => ({ name, kind: "object", sites: [site] })) });
  const ov = (names: Record<string, string> = {}): string => JSON.stringify({ format: 1, "oscal-release": "1.2.3", "local-names": {}, names, merges: [] });
  const N = "manifest/1.2.3/names.json";
  const O = "manifest/1.2.3/overrides.json";
  const S = "schemas/1.2.3/oscal_complete_schema.json";
  const released = m([["Hash", "#/definitions/h"], ["Status", "#/definitions/s"]]);
  const tagged = { files: { [N]: released, [S]: "{}" } };
  const cases: Array<[string, () => boolean | string]> = [];
  const test = (name: string, fn: () => boolean | string) => cases.push([name, fn]);
  const check = (git: Git, now: Record<string, string>, version: string) => checkReleases(git, fakeFiles(now), ["1.2.3"], version);

  test("NAM-008.01 rename without a breaking increment fails", () => {
    const r = check(fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), { [N]: m([["Digest", "#/definitions/h"], ["Status", "#/definitions/s"]]), [S]: "{}" }, "0.2.1+oscal.1.2.3");
    return (r.failures.some((f) => f.includes("not a breaking increment")) && r.lines.some((l) => l.includes("changed Hash -> Digest"))) || JSON.stringify(r);
  });
  test("NAM-008.01 removed released name fails", () => {
    const r = check(fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), { [N]: m([["Status", "#/definitions/s"]]), [S]: "{}" }, "0.2.1+oscal.1.2.3");
    return r.failures.length === 1 && r.lines.some((l) => l.includes("removed Hash"));
  });
  test("NAM-008.02 added type passes without a breaking increment", () => {
    const r = check(fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), { [N]: m([["Hash", "#/definitions/h"], ["Status", "#/definitions/s"], ["New", "#/definitions/n"]]), [S]: "{}" }, "0.2.1+oscal.1.2.3");
    return r.failures.length === 0 || JSON.stringify(r);
  });
  test("NAM-008.03 shallow clone fails", () => check(fakeGit({ shallow: true, tags: {} }), {}, "0.2.0+oscal.1.2.3").failures.some((f) => f.includes("shallow")));
  test("NAM-008.03 clone without release tags fails", () => check(fakeGit({ tags: {} }), {}, "0.2.0+oscal.1.2.3").failures.some((f) => f.includes("no release tags")));
  test("NAM-008.03 git error fails", () => {
    const git = { ...fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), onMain: () => { throw new Error("no origin/main"); } };
    return check(git, { [N]: released, [S]: "{}" }, "0.2.0+oscal.1.2.3").failures.some((f) => f.includes("git failed"));
  });
  test("NAM-008.04 permitted rename is listed", () => {
    const r = check(fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), { [N]: m([["Digest", "#/definitions/h"], ["Status", "#/definitions/s"]]), [S]: "{}" }, "0.3.0+oscal.1.2.3");
    return (r.failures.length === 0 && r.lines.some((l) => l.includes("changed Hash -> Digest"))) || JSON.stringify(r);
  });
  test("baseline: v0.10.0 has precedence over v0.9.0", () => {
    const old = { files: { [N]: m([["Old", "#/definitions/h"]]), [S]: "{}" } };
    const r = check(fakeGit({ tags: { "v0.9.0+oscal.1.2.3": old, "v0.10.0+oscal.1.2.3": tagged } }), { [N]: released, [S]: "{}" }, "0.10.1+oscal.1.2.3");
    return (r.failures.length === 0 && r.lines.some((l) => l.includes("v0.10.0"))) || JSON.stringify(r);
  });
  test("baseline: tags off main, other releases, and other grammars are ignored", () => {
    const bad = { files: { [N]: m([["Other", "#/definitions/h"]]), [S]: "{}" } };
    const git = fakeGit({
      tags: { "v0.2.0+oscal.1.2.3": tagged, "v0.9.0+oscal.1.2.3": { ...bad, main: false }, "v0.8.0+oscal.1.2.4": bad, "v9": bad, "v0.7.0": bad },
    });
    const r = check(git, { [N]: released, [S]: "{}" }, "0.2.1+oscal.1.2.3");
    return (r.failures.length === 0 && r.lines.some((l) => l.includes("v0.2.0"))) || JSON.stringify(r);
  });
  test("baseline: a pre-release is below its release", () =>
    precedence(parseVersion("1.0.0-rc.1+oscal.1.2.3")!, parseVersion("1.0.0+oscal.1.2.3")!) < 0 &&
    precedence(parseVersion("1.0.0-rc.2+oscal.1.2.3")!, parseVersion("1.0.0-rc.10+oscal.1.2.3")!) < 0);
  test("no tag holds a manifest: pass without comparison", () => {
    const r = check(fakeGit({ tags: { "v0.1.0+oscal.1.2.3": { files: { [S]: "{}" } } } }), { [N]: released, [S]: "{}" }, "0.2.0+oscal.1.2.3");
    return (r.failures.length === 0 && r.lines.some((l) => l.includes("nothing to compare"))) || JSON.stringify(r);
  });
  test("breaking: 0.x minor and major increments are breaking, patch is not", () =>
    isBreaking(parseVersion("0.2.0+oscal.1.2.3")!, parseVersion("0.3.0+oscal.1.2.3")!) &&
    isBreaking(parseVersion("1.4.0+oscal.1.2.3")!, parseVersion("2.0.0+oscal.1.2.3")!) &&
    !isBreaking(parseVersion("1.4.0+oscal.1.2.3")!, parseVersion("1.5.0+oscal.1.2.3")!) &&
    !isBreaking(parseVersion("0.2.0+oscal.1.2.3")!, parseVersion("0.2.1+oscal.1.2.3")!));
  test("released schema: a changed byte fails", () => {
    const r = check(fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), { [N]: released, [S]: "{ }" }, "0.2.1+oscal.1.2.3");
    return r.failures.some((f) => f.includes("[released-schema]") && f.includes("differs")) || JSON.stringify(r);
  });
  test("released schema: an added file fails", () => {
    const r = check(fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), { [N]: released, [S]: "{}", "schemas/1.2.3/extra.json": "{}" }, "0.2.1+oscal.1.2.3");
    return r.failures.some((f) => f.includes("is not in the release")) || JSON.stringify(r);
  });
  test("released schema: unchanged files pass", () => check(fakeGit({ tags: { "v0.2.0+oscal.1.2.3": tagged } }), { [N]: released, [S]: "{}" }, "0.2.1+oscal.1.2.3").failures.length === 0);
  test("name diff: one override change gives one changed name with the cause override name", () => {
    const base = { [N]: m([["Hash", "#/definitions/h"], ["HashAlgorithm", "#/definitions/h/properties/a"]]), [O]: ov() };
    const now = { [N]: m([["Hash", "#/definitions/h"], ["Digest", "#/definitions/h/properties/a"]]), [O]: ov({ "#/definitions/h/properties/a": "Digest" }) };
    const rows = nameDiff(fakeGit({ tags: {}, refs: { HEAD: base } }), fakeFiles(now), ["1.2.3"], "HEAD");
    return (rows.length === 1 && rows[0].includes("changed | HashAlgorithm -> Digest | override name |")) || JSON.stringify(rows);
  });
  test("name diff: a parent override is the cause of a child rename", () => {
    const base = { [N]: m([["RiskRiskLog", "#/r/l"], ["RiskRiskLogEntry", "#/r/l/e"]]), [O]: ov() };
    const now = { [N]: m([["RiskLog", "#/r/l"], ["RiskLogEntry", "#/r/l/e"]]), [O]: ov({ "#/r/l": "RiskLog" }) };
    const rows = nameDiff(fakeGit({ tags: {}, refs: { HEAD: base } }), fakeFiles(now), ["1.2.3"], "HEAD");
    return (rows.length === 2 && rows.some((r) => r.includes("RiskRiskLogEntry -> RiskLogEntry | override name (parent)"))) || JSON.stringify(rows);
  });
  test("name diff: a base without a manifest lists every name as added", () => {
    const rows = nameDiff(fakeGit({ tags: {}, refs: { HEAD: {} } }), fakeFiles({ [N]: released, [O]: ov() }), ["1.2.3"], "HEAD");
    return (rows.length === 2 && rows.every((r) => r.includes("| added |"))) || JSON.stringify(rows);
  });
  test("name diff: a removed name is listed", () => {
    const rows = nameDiff(fakeGit({ tags: {}, refs: { HEAD: { [N]: released } } }), fakeFiles({ [N]: m([["Hash", "#/definitions/h"]]) }), ["1.2.3"], "HEAD");
    return (rows.length === 1 && rows[0].includes("| removed | Status |")) || JSON.stringify(rows);
  });

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

if (process.argv.includes("--self-test")) process.exit(selfTest());
else process.exit(main());
