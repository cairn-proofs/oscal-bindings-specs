/**
 * Evaluates the constraint manifest on the JSON documents of a clone of usnistgov/oscal-content, and reports the result for
 * each document (tasks.md 3.5 of the change validate-metaschema-constraints). The clone is not part of the contract store. The
 * reference evaluator (STO-012) gives the failures. The RFC 9535 evaluation of the manifest (STO-013) must give the same
 * number of failures for each entry.
 *
 *   npm run content:evaluate -- <clone directory>   print the result for each document
 *   npm run content:self-test                        run the cases on documents made for the test
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluate } from "./constraint-reference.js";
import { schemaValidator } from "./constraints-docs.js";
import { evaluateManifest } from "./constraints-manifest.js";
import { Generator, type ConstraintManifest } from "./constraints-lib.js";
import { loadDoc } from "./metapath.js";

export interface DocumentResult {
  name: string;
  /** False when the document does not conform to the JSON Schema. Constraints apply only to a document that does (PRS-015). */
  schemaValid: boolean;
  /** The failures of each entry, by the `id` of the entry (`(no id)` when it has none). */
  failures: Record<string, number>;
  /** The entries for which the evaluation of the manifest gives another number of failures than the reference evaluator. */
  disagreements: string[];
  seconds: number;
}

/** The JSON documents of a clone: `examples/` and `nist.gov/`, without the minified copies. */
export function contentFiles(clone: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json") && !e.name.endsWith("-min.json")) out.push(p);
    }
  };
  for (const d of ["examples", "nist.gov"]) if (fs.existsSync(path.join(clone, d))) walk(path.join(clone, d));
  return out;
}

export function evaluateFiles(gen: Generator, manifest: ConstraintManifest, files: string[], base: string): DocumentResult[] {
  const validate = schemaValidator(`schemas/${gen.release}/oscal_complete_schema.json`);
  const { selected } = gen.select();
  return files.map((file) => {
    const start = Date.now();
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    const name = path.relative(base, file);
    const result: DocumentResult = { name, schemaValid: validate(json) === true, failures: {}, disagreements: [], seconds: 0 };
    if (result.schemaValid) {
      const tree = loadDoc(json, gen.model.roots);
      const reference = new Array<number>(selected.length).fill(0);
      for (const f of evaluate(selected, tree, gen.release).failures) reference[selected.indexOf(f.constraint)]++;
      const rfc9535 = new Array<number>(selected.length).fill(0);
      for (const f of evaluateManifest(manifest.entries, json, { document: true })) rfc9535[f.entry]++;
      manifest.entries.forEach((e, i) => {
        if (reference[i]) result.failures[e.id ?? "(no id)"] = (result.failures[e.id ?? "(no id)"] ?? 0) + reference[i];
        if (reference[i] !== rfc9535[i]) result.disagreements.push(`entry ${i} (${e.id ?? "no id"}): reference ${reference[i]}, manifest ${rfc9535[i]}`);
      });
    }
    result.seconds = (Date.now() - start) / 1000;
    return result;
  });
}

const total = (r: DocumentResult) => Object.values(r.failures).reduce((a, b) => a + b, 0);

function report(results: DocumentResult[]): void {
  for (const r of results) {
    const status = !r.schemaValid ? "SCHEMA-INVALID" : total(r) === 0 ? "PASS" : "FAIL";
    console.log(`${status}  ${r.name}  (${r.seconds.toFixed(1)} s)`);
    for (const [id, n] of Object.entries(r.failures)) console.log(`      ${id}: ${n}`);
    for (const d of r.disagreements) console.log(`      DISAGREEMENT ${d}`);
  }
  const pass = results.filter((r) => r.schemaValid && total(r) === 0).length;
  console.log(`\n${results.length} documents: ${pass} meet the manifest, ${results.filter((r) => r.schemaValid && total(r) > 0).length} fail, ${results.filter((r) => !r.schemaValid).length} do not conform to the schema`);
}

function main(clone: string): number {
  const gen = new Generator("1.2.3");
  const { manifest } = gen.generate();
  if (!manifest) throw new Error("the generation fails");
  const results = evaluateFiles(gen, manifest, contentFiles(clone), clone);
  report(results);
  return results.some((r) => r.disagreements.length) ? 1 : 0;
}

function selfTest(): number {
  const gen = new Generator("1.2.3");
  const { manifest } = gen.generate();
  if (!manifest) throw new Error("the generation fails");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-"));
  try {
    const metadata = { title: "t", "last-modified": "2024-01-02T03:04:05Z", version: "1", "oscal-version": "1.2.3" };
    const catalog = (props: object[]) => ({ catalog: { uuid: "00000000-0000-4000-8000-000000000001", metadata, controls: [{ id: "c", title: "t", props, parts: [{ name: "statement" }] }] } });
    const write = (file: string, json: unknown) => {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), JSON.stringify(json));
    };
    write("examples/ok.json", catalog([{ name: "label", value: "1" }]));
    write("examples/bad.json", catalog([{ name: "bogus", value: "1" }]));
    write("nist.gov/schema.json", { catalog: { uuid: "x" } });
    write("nist.gov/ok-min.json", catalog([]));
    write("other/skipped.json", catalog([]));
    const files = contentFiles(dir);
    const results = evaluateFiles(gen, manifest, files, dir);
    const by = (n: string) => results.find((r) => r.name === n)!;
    const cases: Array<[string, () => boolean | string]> = [
      ["the files are examples/ and nist.gov/ without the minified copies", () => files.map((f) => path.relative(dir, f)).join() === "examples/bad.json,examples/ok.json,nist.gov/schema.json" || files.join()],
      ["a valid document meets the manifest", () => by("examples/ok.json").schemaValid && total(by("examples/ok.json")) === 0],
      ["a document with an unknown property name gives one failure for each closed entry", () => JSON.stringify(by("examples/bad.json").failures) === '{"oscal-control-prop-name":1,"oscal-metadata-prop-name-values":1}' || JSON.stringify(by("examples/bad.json").failures)],
      ["a document that does not conform to the schema gets no constraint check", () => !by("nist.gov/schema.json").schemaValid && total(by("nist.gov/schema.json")) === 0],
      ["the RFC 9535 evaluation agrees with the reference evaluator", () => results.every((r) => r.disagreements.length === 0)],
    ];
    let failed = 0;
    for (const [name, fn] of cases) {
      const out = fn();
      if (out !== true) failed++;
      console.log(`${out === true ? "PASS" : "FAIL"}  ${name}${out === true || out === false ? "" : `\n      ${out}`}`);
    }
    console.log(`\n${cases.length - failed}/${cases.length} passed`);
    return failed ? 1 : 0;
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "evaluate-content.ts") {
  const arg = process.argv[2];
  if (arg === "--self-test") process.exit(selfTest());
  if (!arg) {
    console.error("usage: tsx scripts/evaluate-content.ts <clone of usnistgov/oscal-content> | --self-test");
    process.exit(2);
  }
  process.exit(main(arg));
}
