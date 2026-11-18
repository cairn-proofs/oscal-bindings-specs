// JS harness: loads the manifest and the document-level corpus cases, runs the compiled Dafny checker, and
// compares the allowed-values failure ids (with multiplicity) with the expected ones.
// Usage: node harness/run.js [--out build/results-js.json]
"use strict";
const fs = require("fs");
const path = require("path");
const { _dafny, Spec, Parser, Api } = require(process.env.OSCAL_JS_LIB || "../build/js/oscal_lib.js");

const ROOT = path.resolve(__dirname, "../..");
const MANIFEST = path.join(ROOT, "manifest/1.2.3/constraints.json");
const CORPUS = path.join(ROOT, "corpus/1.2.3");

// ---- adapters: JS values to Dafny values ------------------------------------------------------------------
const S = (str) => _dafny.Seq.UnicodeFromString(str);
const seqOf = (arr) => _dafny.Seq.of(...arr); // fine for the sizes of the corpus
const toJson = (v) => {
  if (v === null) return Spec.Json.create_JNull();
  switch (typeof v) {
    case "boolean": return Spec.Json.create_JBool(v);
    case "number": return Spec.Json.create_JNum(S(String(v)));
    case "string": return Spec.Json.create_JStr(S(v));
  }
  if (Array.isArray(v)) return Spec.Json.create_JArr(seqOf(v.map(toJson)));
  return Spec.Json.create_JObj(seqOf(Object.entries(v).map(([k, x]) => Spec.Member.create_Member(S(k), toJson(x)))));
};
const fromStr = (seq) => seq.toVerbatimString(false);
const optId = (id) => (id === null ? Spec.Option.create_None() : Spec.Option.create_Some(S(id)));

function buildEntries(manifest) {
  const entries = [], meta = [];
  for (const e of manifest.entries) {
    if (e.kind !== "allowed-values") continue;
    const r = Parser.__default.BuildEntry(optId(e.id), seqOf(e.context.document.map(S)), seqOf(e.target.map(S)), seqOf(e.values.map(S)), e["allow-other"]);
    if (!r.is_Ok) throw new Error(`entry ${e.id}: ${fromStr(r.dtor_msg)}`);
    entries.push(r.dtor_value);
    meta.push(e);
  }
  return { entries: seqOf(entries), meta };
}

const failureIds = (fs_) => {
  const out = [];
  for (let i = 0; i < fs_.length; i++) {
    const id = fs_[i].dtor_id;
    out.push(id.is_Some ? fromStr(id.dtor_v) : null);
  }
  return out;
};

// ---- main -------------------------------------------------------------------------------------------------
const t0 = process.hrtime.bigint();
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const { entries, meta } = buildEntries(manifest);
const avIds = new Set(meta.map((e) => e.id).filter((x) => x !== null));
const t1 = process.hrtime.bigint();

const cases = JSON.parse(fs.readFileSync(path.join(CORPUS, "cases.json"), "utf8")).cases;
const work = [];
for (const c of cases) {
  if (c.operation === "parse" && c["expected-constraints"]) {
    work.push({ id: c.id, kind: "failing", input: c.input, expected: c["expected-constraints"].filter((i) => avIds.has(i)) });
  } else if (c.operation === "round-trip" && c.input.endsWith(".json")) {
    work.push({ id: c.id, kind: "valid", input: c.input, expected: [] });
  }
}
// Extra, not corpus cases: every other JSON document of documents/valid/ (README: none may fail an entry).
const covered = new Set(work.map((w) => w.input));
for (const f of fs.readdirSync(path.join(CORPUS, "documents/valid")).sort()) {
  const rel = "documents/valid/" + f;
  if (f.endsWith(".json") && !covered.has(rel)) work.push({ id: "extra/" + f, kind: "valid-extra", input: rel, expected: [] });
}

// Directed cases written for the pilot (not corpus cases): union rule, filter edge cases, non-string values.
for (const c of JSON.parse(fs.readFileSync(path.join(__dirname, "extra-cases.json"), "utf8")))
  work.push({ id: "directed/" + c.id, kind: "directed", doc: c.document, expected: c.expected });

const results = [];
for (const w of work) {
  const doc = w.doc !== undefined ? w.doc : JSON.parse(fs.readFileSync(path.join(CORPUS, w.input), "utf8"));
  const ts = process.hrtime.bigint();
  const fails = Api.__default.Check(entries, toJson(doc));
  const ms = Number(process.hrtime.bigint() - ts) / 1e6;
  const got = failureIds(fails).map((x) => (x === null ? "<null-id>" : x)).sort();
  const exp = [...w.expected].sort();
  const ok = got.length === exp.length && got.every((x, i) => x === exp[i]);
  results.push({ id: w.id, kind: w.kind, ok, ms, got, exp });
}
const t2 = process.hrtime.bigint();

const summary = {};
for (const r of results) {
  summary[r.kind] ??= { total: 0, agree: 0 };
  summary[r.kind].total++;
  if (r.ok) summary[r.kind].agree++;
}
// Reportable entries that no run exercises (CNS-020 coverage): reportable ids of the manifest seen in expected lists.
const seenExpected = new Set(results.flatMap((r) => r.exp));
const reportable = meta.filter((e) => e.reportable).map((e) => e.id);
const uncovered = [...new Set(reportable)].filter((i) => !seenExpected.has(i));

console.log(JSON.stringify({ language: "js", entries: meta.length, summary, uncoveredReportable: uncovered.length,
  setupMs: Number(t1 - t0) / 1e6, runMs: Number(t2 - t1) / 1e6 }, null, 1));
for (const r of results) if (!r.ok) console.log("DISAGREE", r.id, "expected", JSON.stringify(r.exp), "got", JSON.stringify(r.got));
const outIdx = process.argv.indexOf("--out");
if (outIdx > 0) fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify({ summary, results }, null, 1));
process.exit(results.every((r) => r.ok) ? 0 : 1);
