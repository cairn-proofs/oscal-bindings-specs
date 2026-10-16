/**
 * Parses the requirement and scenario identifiers of the main specs and the ledger
 * openspec/spec-ids.yaml. The rules are in openspec/config.yaml. scripts/check-spec-ids.ts checks them.
 */
import YAML from "yaml";

import { proseLines, REQUIREMENT, SCENARIO } from "./spec-markdown.js";

export const LEDGER = "openspec/spec-ids.yaml";
export const REQUIREMENT_ID = /^([A-Z]{2,5})-(\d+) \S/;
export const SCENARIO_ID = /^([A-Z]{2,5})-(\d+)\.(\d+) \S/;
export const ID = /^([A-Z]{2,5})-(\d+)(?:\.(\d+))?$/;
export const CITATION = /\[([A-Z]{2,5}-\d+(?:\.\d+)?)\]/g;

export interface Heading {
  file: string;
  text: string;
  /** Canonical identifier, such as WID-2 or WID-2.1. Absent when malformed. */
  id?: string;
  prefix?: string;
  kind: "requirement" | "scenario";
}

/** WID-002 and WID-2 are one identifier. Returns the canonical key, or undefined. */
export function canonical(id: string): string | undefined {
  const m = ID.exec(id);
  if (!m) return undefined;
  return m[3] === undefined
    ? `${m[1]}-${Number(m[2])}`
    : `${m[1]}-${Number(m[2])}.${Number(m[3])}`;
}

/** The canonical key rendered back in the published form, such as WID-002.01. */
export function render(key: string): string {
  const m = ID.exec(key)!;
  const req = `${m[1]}-${m[2].padStart(3, "0")}`;
  return m[3] === undefined ? req : `${req}.${m[3].padStart(2, "0")}`;
}

const wellFormedNumber = (digits: string, width: number) =>
  digits === String(Number(digits)).padStart(width, "0");

export function parseSpec(file: string, text: string): { headings: Heading[]; bad: string[] } {
  const headings: Heading[] = [];
  const bad: string[] = [];
  let current: Heading | undefined;
  for (const [, line] of proseLines(text)) {
    const req = REQUIREMENT.exec(line);
    if (req) {
      const m = REQUIREMENT_ID.exec(req[1]);
      const ok = m && wellFormedNumber(m[2], 3);
      current = {
        file,
        text: req[1],
        kind: "requirement",
        id: ok ? `${m[1]}-${Number(m[2])}` : undefined,
        prefix: ok ? m[1] : undefined,
      };
      headings.push(current);
      if (!ok) bad.push(`[requirement-id] ${file}: requirement heading "${req[1]}" has no well-formed identifier.`);
      continue;
    }
    const sc = SCENARIO.exec(line);
    if (!sc) continue;
    const m = SCENARIO_ID.exec(sc[1]);
    const ok = m && wellFormedNumber(m[2], 3) && wellFormedNumber(m[3], 2);
    const heading: Heading = {
      file,
      text: sc[1],
      kind: "scenario",
      id: ok ? `${m[1]}-${Number(m[2])}.${Number(m[3])}` : undefined,
      prefix: ok ? m[1] : undefined,
    };
    headings.push(heading);
    if (!ok) {
      bad.push(`[scenario-id] ${file}: scenario heading "${sc[1]}" has no well-formed identifier.`);
    } else if (current?.id !== `${m[1]}-${Number(m[2])}`) {
      bad.push(
        `[scenario-parent] ${file}: scenario heading "${sc[1]}" is under ${current?.id ? render(current.id) : "no identified requirement"}.`,
      );
    }
  }
  return { headings, bad };
}

export interface Ledger {
  prefixes: Map<string, { capability: string; next: number }>;
  retired: Map<string, { replacedBy?: string }>;
}

/** A retired requirement also retires each of its scenarios (retired-scenarios). */
export const isRetired = (ledger: Ledger | undefined, id: string) =>
  !!ledger && (ledger.retired.has(id) || ledger.retired.has(id.split(".")[0]));

export function parseLedger(text: string | undefined, failures: string[]): Ledger | undefined {
  if (text === undefined) {
    failures.push(`[ledger] ${LEDGER} does not exist.`);
    return undefined;
  }
  let data: any;
  try {
    data = YAML.parse(text);
  } catch (error) {
    failures.push(`[ledger] ${LEDGER} is not valid YAML: ${(error as Error).message}`);
    return undefined;
  }
  const ledger: Ledger = { prefixes: new Map(), retired: new Map() };
  if (!data || typeof data.prefixes !== "object" || data.prefixes === null) {
    failures.push(`[ledger] ${LEDGER} has no prefixes map.`);
    return ledger;
  }
  for (const [prefix, entry] of Object.entries<any>(data.prefixes)) {
    if (
      !/^[A-Z]{2,5}$/.test(prefix) ||
      typeof entry?.capability !== "string" ||
      !Number.isInteger(entry?.next) ||
      entry.next < 1
    ) {
      failures.push(`[ledger] ${LEDGER}: prefix entry "${prefix}" needs a capability and a positive integer next.`);
      continue;
    }
    ledger.prefixes.set(prefix, { capability: entry.capability, next: entry.next });
  }
  if (!Array.isArray(data.retired)) {
    failures.push(`[ledger] ${LEDGER} has no retired list.`);
    return ledger;
  }
  for (const entry of data.retired) {
    const key = typeof entry?.id === "string" ? canonical(entry.id) : undefined;
    const target = entry?.replaced_by;
    if (!key || typeof entry.reason !== "string" || !entry.reason.trim()) {
      failures.push(`[ledger] ${LEDGER}: retired entry ${JSON.stringify(entry)} needs a well-formed id and a reason.`);
      continue;
    }
    if (target !== undefined && (typeof target !== "string" || !canonical(target))) {
      failures.push(`[ledger] ${LEDGER}: replaced_by of ${entry.id} is not a well-formed identifier.`);
      continue;
    }
    ledger.retired.set(key, { replacedBy: target === undefined ? undefined : canonical(target) });
  }
  return ledger;
}
