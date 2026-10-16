/**
 * Helpers that read spec Markdown, shared by scripts/check-spec-ids.ts and
 * scripts/check-spec-terms.ts.
 */
import fs from "node:fs";
import path from "node:path";

import GithubSlugger from "github-slugger";

/** Repository-relative path -> file text. */
export type Files = Record<string, string>;

export const SPEC_PATH = /^openspec\/specs\/([^/]+)\/spec\.md$/;
export const REQUIREMENT = /^### Requirement:\s*(.*)$/;
export const SCENARIO = /^#### Scenario:\s*(.*)$/;
export const LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** Lines outside fenced code blocks, with their line numbers. */
export function proseLines(text: string): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  let fenced = false;
  text.split("\n").forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced) out.push([index + 1, line]);
  });
  return out;
}

export const withoutCode = (line: string) => line.replace(/`[^`]*`/g, "");

/** github-slugger anchors of every heading in a Markdown file. */
export function anchors(text: string): Set<string> {
  const slugger = new GithubSlugger();
  const out = new Set<string>();
  for (const [, line] of proseLines(text)) {
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (m) out.add(slugger.slug(m[1].replace(/`/g, "")));
  }
  return out;
}

/** Every Markdown file under openspec/ and docs/, plus each of `extra` that exists. */
export function readRepository(root: string, extra: string[] = []): Files {
  const files: Files = {};
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (rel.endsWith(".md")) files[rel] = fs.readFileSync(path.join(root, rel), "utf8");
    }
  };
  for (const dir of ["openspec", "docs"]) if (fs.existsSync(path.join(root, dir))) walk(dir);
  for (const rel of extra) {
    if (fs.existsSync(path.join(root, rel))) files[rel] = fs.readFileSync(path.join(root, rel), "utf8");
  }
  return files;
}
