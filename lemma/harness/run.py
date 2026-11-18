"""Python harness: loads the manifest and the document-level corpus cases, runs the compiled Dafny checker, and
compares the allowed-values failure ids (with multiplicity) with the expected ones.
Usage: python3 -I harness/run.py [--out build/results-py.json]"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../build/py/lemma-py"))
sys.setrecursionlimit(10000)
import _dafny, Spec, Parser, Api  # noqa: E402  (the generated modules)

ROOT = os.path.abspath(os.path.join(HERE, "../.."))
MANIFEST = os.path.join(ROOT, "manifest/1.2.3/constraints.json")
CORPUS = os.path.join(ROOT, "corpus/1.2.3")

# ---- adapters: Python values to Dafny values ---------------------------------------------------------------
def S(s):
    return _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, s))

def seq_of(xs):
    return _dafny.Seq(list(xs))

def to_json(v):
    if v is None:
        return Spec.Json_JNull()
    if isinstance(v, bool):
        return Spec.Json_JBool(v)
    if isinstance(v, (int, float)):
        return Spec.Json_JNum(S(repr(v)))
    if isinstance(v, str):
        return Spec.Json_JStr(S(v))
    if isinstance(v, list):
        return Spec.Json_JArr(seq_of(to_json(x) for x in v))
    return Spec.Json_JObj(seq_of(Spec.Member_Member(S(k), to_json(x)) for k, x in v.items()))

def from_str(seq):
    return "".join(seq)

def opt_id(i):
    return Spec.Option_None() if i is None else Spec.Option_Some(S(i))

def build_entries(manifest):
    entries, meta = [], []
    for e in manifest["entries"]:
        if e["kind"] != "allowed-values":
            continue
        r = Parser.default__.BuildEntry(opt_id(e["id"]), seq_of(S(q) for q in e["context"]["document"]),
                                        seq_of(S(q) for q in e["target"]), seq_of(S(v) for v in e["values"]),
                                        e["allow-other"])
        if not r.is_Ok:
            raise RuntimeError(f"entry {e['id']}: {from_str(r.msg)}")
        entries.append(r.value)
        meta.append(e)
    return seq_of(entries), meta

def failure_ids(fails):
    out = []
    for f in fails:
        i = f.id_
        out.append(from_str(i.v) if i.is_Some else None)
    return out

# ---- main --------------------------------------------------------------------------------------------------
def load(p):
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)

t0 = time.perf_counter()
manifest = load(MANIFEST)
entries, meta = build_entries(manifest)
av_ids = {e["id"] for e in meta if e["id"] is not None}
t1 = time.perf_counter()

cases = load(os.path.join(CORPUS, "cases.json"))["cases"]
work = []
for c in cases:
    if c["operation"] == "parse" and "expected-constraints" in c:
        work.append(dict(id=c["id"], kind="failing", input=c["input"], expected=[i for i in c["expected-constraints"] if i in av_ids]))
    elif c["operation"] == "round-trip" and c["input"].endswith(".json"):
        work.append(dict(id=c["id"], kind="valid", input=c["input"], expected=[]))
covered = {w["input"] for w in work}
for f in sorted(os.listdir(os.path.join(CORPUS, "documents/valid"))):
    rel = "documents/valid/" + f
    if f.endswith(".json") and rel not in covered:
        work.append(dict(id="extra/" + f, kind="valid-extra", input=rel, expected=[]))

# Directed cases written for the pilot (not corpus cases): union rule, filter edge cases, non-string values.
for c in load(os.path.join(HERE, "extra-cases.json")):
    work.append(dict(id="directed/" + c["id"], kind="directed", doc=c["document"], expected=c["expected"]))

results = []
for w in work:
    doc = w["doc"] if "doc" in w else load(os.path.join(CORPUS, w["input"]))
    ts = time.perf_counter()
    fails = Api.default__.Check(entries, to_json(doc))
    ms = (time.perf_counter() - ts) * 1000
    got = sorted("<null-id>" if x is None else x for x in failure_ids(fails))
    exp = sorted(w["expected"])
    results.append(dict(id=w["id"], kind=w["kind"], ok=got == exp, ms=ms, got=got, exp=exp))
t2 = time.perf_counter()

summary = {}
for r in results:
    s = summary.setdefault(r["kind"], dict(total=0, agree=0))
    s["total"] += 1
    s["agree"] += r["ok"]
seen = {i for r in results for i in r["exp"]}
uncovered = [i for i in {e["id"] for e in meta if e["reportable"]} if i not in seen]
print(json.dumps(dict(language="python", entries=len(meta), summary=summary, uncoveredReportable=len(uncovered),
                      setupMs=(t1 - t0) * 1000, runMs=(t2 - t1) * 1000), indent=1))
for r in results:
    if not r["ok"]:
        print("DISAGREE", r["id"], "expected", json.dumps(r["exp"]), "got", json.dumps(r["got"]))
if "--out" in sys.argv:
    with open(sys.argv[sys.argv.index("--out") + 1], "w") as fh:
        json.dump(dict(summary=summary, results=results), fh, indent=1)
sys.exit(0 if all(r["ok"] for r in results) else 1)
