#!/usr/bin/env python3
"""Line counts for REPORT.md. Counting method: physical lines that are not blank and not comment-only
(`//` lines and /* ... */ blocks are dropped). Dafny lines are then classified:
  spec-datatype  : inside a `datatype` declaration of Spec.dfy (compiled: the harness builds these values)
  spec-ghost     : inside a `ghost function` / `ghost predicate` of Spec.dfy
  contract       : `requires` / `ensures` lines of methods and functions in Impl.dfy (the claim, per method)
  proof          : lemma declarations (all lines), ghost predicates of Impl.dfy, and inside methods the lines that
                   start with invariant / decreases / assert / reveal / a call of a lemma, plus the bodies of
                   `assert ... by { }` and `forall ... ensures` blocks
  code           : everything else in Impl.dfy (compiled)
"""
import re, sys, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))

def strip_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    out = []
    for ln in text.split("\n"):
        s = ln.strip()
        if not s or s.startswith("//") or s.startswith("# ") or s == "#":
            continue
        out.append(ln)
    return out

def count_plain(path, hash_comments=False):
    text = open(path, encoding="utf-8").read()
    if hash_comments:
        lines = [l for l in text.split("\n") if l.strip() and not l.strip().startswith("#")]
        # drop docstring blocks
        res, inside = [], False
        for l in lines:
            t = l.strip()
            if inside:
                if t.endswith('"""'):
                    inside = False
                continue
            if t.startswith('"""'):
                if not (t.endswith('"""') and len(t) > 3):
                    inside = True
                continue
            res.append(l)
        return len(res)
    if path.endswith(".js"):
        return len([l for l in text.split("\n") if l.strip() and not l.strip().startswith("//")])
    return len(strip_comments(text))

PROOF_START = re.compile(r"^(invariant|decreases|assert|reveal|calc)\b")
LEMMA_CALL = re.compile(r"^(Table\w+|PathsOfSnoc|AppIsApplicable)\(")
CONTRACT = re.compile(r"^(requires|ensures|modifies|reads)\b")

def classify_spec(path):
    c = collections.Counter()
    kind = None
    for ln in strip_comments(open(path, encoding="utf-8").read()):
        s = ln.strip()
        if re.match(r"^(module|import|include)\b", s) or s == "}" and not ln.startswith("  ") or s == "{":
            if ln.startswith("  ") is False and s == "}":
                continue
        indent = len(ln) - len(ln.lstrip())
        if indent == 2:
            if s.startswith("datatype"):
                kind = "spec-datatype"
            elif re.match(r"^ghost (function|predicate)", s):
                kind = "spec-ghost"
            elif s.startswith("type "):
                kind = "spec-datatype"
            else:
                kind = None
        if indent >= 2 and kind:
            c[kind] += 1
        elif indent == 0 and s.startswith("module"):
            c["module/include lines"] += 1
    return c

def classify_impl(path):
    c = collections.Counter()
    kind = None
    depth_block = 0  # brace depth inside an assert-by / forall block
    in_annot = False
    prev_indent = 0
    for ln in strip_comments(open(path, encoding="utf-8").read()):
        s = ln.strip()
        indent = len(ln) - len(ln.lstrip())
        if indent == 0:
            c["module/include lines"] += 1
            continue
        if indent == 2:
            if re.match(r"^lemma\b", s): kind = "lemma"
            elif re.match(r"^ghost predicate", s): kind = "ghostpred"
            elif re.match(r"^(method|function)\b", s): kind = "code"
            elif s == "}": continue
            else: kind = kind
            if s == "}": continue
        if kind in ("lemma", "ghostpred"):
            c["proof"] += 1
            continue
        # inside a compiled method / function
        if depth_block > 0:
            c["proof"] += 1
            depth_block += s.count("{") - s.count("}")
            continue
        if indent == 2 or CONTRACT.match(s) and indent <= 4:
            if CONTRACT.match(s):
                c["contract"] += 1; in_annot = True; continue
            c["code"] += 1; in_annot = False; continue
        if PROOF_START.match(s) or LEMMA_CALL.match(s):
            c["proof"] += 1
            bal = s.count("{") - s.count("}")
            if bal > 0: depth_block = bal
            continue
        if s.startswith("forall") and "ensures" in s:
            c["proof"] += 1
            bal = s.count("{") - s.count("}")
            if bal > 0: depth_block = bal
            continue
        c["code"] += 1
    return c

def main():
    d = os.path.join(HERE, "dafny")
    rows = []
    sp = classify_spec(os.path.join(d, "Spec.dfy"))
    im = classify_impl(os.path.join(d, "Impl.dfy"))
    print("Spec.dfy   :", dict(sp), "total", sum(v for k, v in sp.items() if k.startswith("spec")))
    print("Impl.dfy   :", dict(im), "total", count_plain(os.path.join(d, "Impl.dfy")))
    print("SpecProps.dfy (lemmas about the spec):", count_plain(os.path.join(d, "SpecProps.dfy")))
    for f in ("Parser.dfy", "Api.dfy"):
        print(f, count_plain(os.path.join(d, f)))
    for f, h in (("run.js", False), ("run.py", True)):
        print("harness/" + f, count_plain(os.path.join(HERE, "harness", f), hash_comments=h))
    gen = {"js (oscal.js incl. runtime)": os.path.join(HERE, "build/js/oscal.js")}
    for k, p in gen.items():
        print(k, sum(1 for _ in open(p)), "lines", os.path.getsize(p), "bytes")
    pydir = os.path.join(HERE, "build/py/oscal-py")
    tot = 0; totb = 0
    for root, _, files in os.walk(pydir):
        for f in files:
            if f.endswith(".py"):
                p = os.path.join(root, f); n = sum(1 for _ in open(p)); b = os.path.getsize(p)
                tot += n; totb += b
                print("  py", os.path.relpath(p, pydir), n, "lines", b, "bytes")
    print("py total", tot, "lines", totb, "bytes")
main()
