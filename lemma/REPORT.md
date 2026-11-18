# Feasibility pilot: verified Dafny evaluator for the `allowed-values` kind

A subagent wrote this report. The parent session saved it here and re-ran the checks:

1. `build.sh` gives 89 verified and 6 verified, with 0 errors.
2. Both harnesses agree on all 261 runs.
3. The JS and Python results are identical.
4. A grep of `dafny/` finds no `assume`, `{:axiom}`, `{:verify false}` or `{:extern}`.

Scope: CNS-006, CNS-007, CNS-008 and CNS-017 (restricted to `allowed-values`) were specified. CNS-021 was read
only, to see which entries take part. Document mode only.

## Bottom line

The verified implementation exists and compiles to JS and Python. It agrees with every document-level corpus case in
both languages, with identical failure multisets on all 261 runs. The proof was cheaper than expected. The more useful
result is that writing the spec forced 12 decisions the prose does not make (section 4), and the corpus does not test
some of them (5.4). Go/no-go is in section 8.

## 0. Layout and reproduction

All paths are relative to `lemma/` (this directory was `pilot/` when the report was written).

| Path | What |
|---|---|
| `dafny/Spec.dfy` | Ghost spec, plus the datatypes (these are compiled) |
| `dafny/SpecProps.dfy` | Lemma that the spec meets CNS-017 "at most one failure for one location" |
| `dafny/Impl.dfy` | Compiled implementation and its proofs |
| `dafny/Parser.dfy` | Query parser and entry builder. **Outside the claim.** |
| `dafny/Api.dfy` | Entry point: `Api.Check`, plus an empty `Main` |
| `harness/run.js`, `harness/run.py` | Harnesses |
| `harness/extra-cases.json` | The 13 directed cases |
| `harness/xcheck-ts.ts` | Cross-check against the store's TS manifest evaluator |
| `build.sh` | Verify everything, then translate to JS and Python |
| `mutants.sh` | Mutation experiments (5.2) |
| `count-lines.py` | Line counts (section 2) |

```
./build.sh                                       # verify + compile, about 12 s
node harness/run.js --out build/results-js.json
python3 -I harness/run.py --out build/results-py.json
```

## 1. Setup

Everything worked first time.

| Tool | Version | Command |
|---|---|---|
| .NET SDK | 8.0.134 (`8.0.134-0ubuntu1~24.04.1`) | `apt-get install -y dotnet-sdk-8.0` |
| Dafny | 4.11.0 | `dotnet tool install --global dafny --version 4.11.0`; `export PATH=$PATH:~/.dotnet/tools` |
| Z3 | 4.12.1, 64 bit | `python3 -m venv lemma/.venv-z3 && lemma/.venv-z3/bin/pip install z3-solver==4.12.1.0` |
| Node | v22.23.4 (preinstalled) | none |
| `bignumber.js` | 9.1.2 | `npm install bignumber.js@9.1.2` (in `lemma/`) |
| Python | 3.13.18 (preinstalled) | none |

1. **Z3 location:** the pip binary is `.venv-z3/bin/z3`, not `site-packages/z3/bin`. It is passed to Dafny with
   `--solver-path`.
2. **Verify:** `dafny verify --solver-path $Z3 --verify-included-files dafny/Api.dfy`, then the same without the flag on
   `dafny/SpecProps.dfy`. `dafny translate` and `dafny verify` verify only the root file unless
   `--verify-included-files` is given. A translate-only run prints "1 verified", which is misleading.
3. **Translate:** `dafny translate js|py --no-verify --include-runtime -o build/js/oscal dafny/Api.dfy`. With
   `--include-runtime` each output stands alone, so the Python runtime is the `_dafny/` copy Dafny emits. The
   `DafnyRuntimePython` 4.11.0 wheel downloads from PyPI but was not needed.
4. **Strings:** the Dafny 4 default `--unicode-char` was not overridden.
5. **TS tooling:** the repo's own TS tooling pins Node 26.13.0, and `npm ci` refuses Node 22. The subagent used it only
   in a scratch copy of the repo, with `npm ci --engine-strict=false --ignore-scripts`, for the cross-check in 5.3.

## 2. Size

**Counting method** (`count-lines.py`):

1. Physical lines, with blank lines and comment-only lines dropped.
2. Dafny lines are classified by regex, so boundaries are about plus or minus 10 lines.
3. **Spec:** `ghost function`/`ghost predicate` and `datatype`/`type` declarations of `Spec.dfy`.
4. **Contract:** `requires`/`ensures` lines of compiled methods in `Impl.dfy`.
5. **Proof:** all lines of lemmas and ghost predicates, plus in compiled methods the lines starting `invariant`,
   `decreases`, `assert`, `reveal` or a lemma call, plus `assert ... by {}` and `forall ... ensures {}` bodies.
6. **Code:** the rest of `Impl.dfy`, with signatures and closing braces included.

| Part | Lines |
|---|---|
| Ghost spec (`Spec.dfy`): ghost functions and predicates | 108 |
| Spec datatypes (compiled: JSON, AST, Entry, Failure) | 25 |
| Lemmas about the spec (`SpecProps.dfy`) | 65 |
| `Impl.dfy`: code | 272 |
| `Impl.dfy`: contracts | 24 |
| `Impl.dfy`: proof (lemmas, ghost predicates, invariants, asserts) | 169 |
| Parser and entry builder (`Parser.dfy`) | 228 |
| `Api.dfy` | 13 |
| Harness, JS (33 of them adapters) | 88 |
| Harness, Python (39 of them adapters) | 95 |
| Directed cases (`extra-cases.json`, data) | 364 |

1. **Dafny total:** 933 lines.
2. **Proof to code in `Impl.dfy`:** 169 : 272, about 0.6.
3. **Spec to implementation (code plus contracts):** 133 : 296.
4. **Generated JS:** `oscal.js` is 2,976 lines and 88 KB. The runtime is the first 1,188 lines and the generated
   modules about 1,788.
5. **Generated Python:** `Spec.py` 396, `Impl.py` 527, `Parser.py` 460, `Api.py` 31, glue 31, which is 1,445 lines.
   With the `_dafny/` runtime (589) and `System_` (20), the total is 2,054 lines and 72 KB.

## 3. Proof effort

**Result:** 89 verified symbols in the main run, plus 6 in `SpecProps.dfy`, 0 errors.

1. There is no `assume`, no `{:axiom}`, no `{:verify false}` and no `{:extern}` (checked by grep).
2. The only attribute is `{:opaque}` on two ghost predicates.

**Verification time:**

1. `--verify-included-files dafny/Api.dfy` takes 8.0 to 8.9 s wall (user 11.8 s).
2. The per-symbol times sum to 3.65 s. The slowest is `Impl.CheckAllowedValues` at 0.53 s.
3. `SpecProps` takes 2.4 s.
4. No resource-limit tuning and no `--verification-time-limit` change.
5. The default 30 s limit was hit once, in an intermediate version (item 4 below).
6. 12 values of `--boogie -randomSeed:N` (0 to 11) all pass, at 7.8 to 8.4 s each.

What was hard and what was not, in the order trouble was expected:

1. **`..` traversal order: easy.**
   1. The spec defines the visit as snoc recursion over the children (`VisitJ`, `VisitArr` and `VisitObj`, mutually
      recursive). Termination was accepted with no help.
   2. The implementation uses an accumulator (`VisitAcc(p,j,acc) ensures out == acc + VisitJ(p,j)`) and needed only
      loop invariants. Dafny proved associativity of `+` itself. No lemma.
2. **Filter semantics: easy, and the proof is thin.**
   1. `EvalLogI` has the same recursion structure as `EvalLog`, so the proof is a lockstep.
   2. `Nothing == Nothing` is true in the spec, as in RFC 9535. No manifest query can reach it, because all comparisons
      are `@['k'] == 'lit'`.
3. **Union and dedup: one lemma.**
   1. The spec keeps a list and tests membership in the prefix paths. The implementation keeps a `set<Path>`.
   2. It needed `PathsOfSnoc` (16 lines, set extensionality by hand) and the invariants `out == Dedup(ns[..i])` and
      `seen == PathsOf(out)`.
4. **The applicable set: the one place with real friction.**
   1. The spec recomputes `Targets` per entry per node. The implementation computes targets once, builds a
      `map<Path, seq<nat>>`, and reads the applicable set from it.
   2. The proof is two `{:opaque}` ghost predicates, six lemmas (about 70 lines), and `AppIsApplicable`.
   3. History: the first version had the quantified invariant inline, and 2 of 4 random seeds failed one assertion.
      Restructuring it into lemmas made `CheckAllowedValues` time out at 30 s (a quantifier instantiation loop: user
      CPU stayed near 10 s while wall time reached 37 to 45 s). Marking the predicates `{:opaque}` and instantiating
      by explicit lemma calls fixed it, and it has been stable since.
5. **Boilerplate.**
   1. Forward loops against a spec in snoc form need `assert ns[..i+1][..i] == ns[..i]` and
      `assert ns[..i+1][i] == ns[i]` before each step. That occurs about 14 times, about 28 lines, roughly a third of
      the assert lines.
   2. Quantifiers over `j` needed an explicit `j: nat`. Otherwise `int` brings an index-out-of-range obligation.
6. **Iterations:** the spec verified at the first attempt. `Impl.dfy` took about 6 verify runs. `SpecProps.dfy`
   verified at the first attempt.

**Where the proof carries information:** only where the implementation differs from the spec (accumulator traversal,
set-based dedup, the table). The rest is lockstep. If the implementation were written like the spec, the proof would
be near zero and so would its value. The three differences were chosen on purpose.

## 4. Prose ambiguities (a choice the prose does not make)

"TS" means `scripts/constraints-manifest.ts` and `scripts/jsonpath.ts`, consulted after the spec was written.

1. **CNS-007, CNS-008, CNS-017: when two selections are "the same node".**
   1. Choice: the same location, meaning the same Normalized Path in the document.
   2. Told by: TS, where the `applicable` map is keyed by path string.
2. **CNS-007: mapping a node of the one-element array back to the document.**
   1. Choice: `$[0]` is the context node, so `[0] ++ rest` becomes `ctxPath ++ rest`. Anything else is dropped
      (`Rebase`).
   2. Told by: TS, `ctx.path + h.path.slice(4)`.
3. **CNS-006: whether the union rule applies to a single query.**
   1. Prose: "when several queries ... union ... each node once". RFC 9535 nodelists can hold a node twice, and one
      query can do that.
   2. Choice: dedup in every case.
   3. Told by: CNS-017 and TS (`run` dedups by path). The corpus does not decide it (5.2, 5.4).
4. **CNS-006, CNS-007: which sets are the "same purpose" sets.**
   1. Choice: union of context queries per entry; union of target queries per context node; then union over context
      nodes.
   2. The prose never says targets of different context nodes merge. It follows only indirectly from CNS-017.03.
   3. Told by: TS.
5. **CNS-008: the value of a target node that holds no string.**
   1. Prose: "the string at the node", which is undefined for number, boolean, null, array or object.
   2. Choice: such a node is listed by no entry, so a closed entry fails.
   3. Told by: TS, which uses `String(value)` (`5` becomes `"5"`, an object becomes `"[object Object]"`). The two
      differ only if an entry lists such a string. The corpus does not test it.
6. **CNS-008: selected from which context.**
   1. Choice: from some context node of that entry.
   2. An entry with no context node (one entry has an empty `document` list) never applies.
   3. Told by: TS.
7. **CNS-008 and CNS-021: whether non-reportable entries take part.**
   1. Choice: all 194 entries take part, including the 58 open ones (needed for CNS-008.01) and the 21 closed
      non-reportable ones.
   2. Closed non-reportable entries could fail on a document that does not conform to the schema.
   3. CNS-021 therefore plays no role in evaluation. It matters only for corpus coverage (CNS-020).
   4. The corpus never exercises this, because its documents conform.
8. **CNS-008 and CNS-017: entries that share an id.**
   1. Four ids belong to two entries each. Choice: one failure per entry, so the id repeats.
   2. Told by: the corpus, which lists such ids twice in `expected-constraints`.
   3. Nine entries have a null id. Their failures would have a null id, which the corpus cannot express.
9. **CNS-017: what "at most one failure for one location" ranges over.**
   1. Choice: per entry and location, so two entries can fail the same location (this follows from CNS-008.02).
   2. Proved as a spec property: `AtMostOneFailurePerLocation`.
10. **CNS-008: how a value is compared with a listed value.**
    1. CNS-012 says "character for character" only for keys.
    2. Choice: code-point equality with no normalization.
11. **CNS-006 and RFC 9535: order.**
    1. The prose requires "each node once", not an order. RFC 9535 does not fix object member order.
    2. Choice: members in parse order, first occurrence kept, failures ordered by entry then target node. The corpus
       compares multisets, so no test depends on it.
12. **CNS-006: which syntax a manifest uses.**
    1. All 288 document-context and 206 target queries of the 194 entries were checked (63 distinct shapes).
    2. Constructs found: `['k']`, `[*]`, `[0]`, `..`, filters with `!`, `||`, `&&`, parentheses, `@['k']` existence and
       `@['k'] == 'lit'`.
    3. Not found: `$` inside a filter, comma lists, escapes or non-ASCII in literals, double quotes, functions,
       `match()`. The 13 `match()` calls are in other kinds.
    4. All 194 entries parse.

Other notes:

1. The document root passed to a query is the whole document object (the `catalog` key is part of the path). The
   manifest makes this clear and the prose does not.
2. Duplicate JSON object keys are assumed absent (I-JSON). With duplicates the spec takes the first member.

## 5. Corpus agreement

### 5.1 Results

**What was run:**

1. The 233 `parse` cases with `expected-constraints` (all JSON, under `documents/invalid/constraints/`).
2. The 12 `round-trip` cases on valid JSON documents (expected valid, so no failures).
3. The 3 other JSON documents in `documents/valid/` (not corpus cases).
4. 13 directed cases written for the pilot.

**What was not run:**

1. YAML inputs.
2. `parse` cases with only `expected-category` (they do not conform to the schema).
3. Element cases.

Expected ids are restricted to `allowed-values` entry ids, compared with multiplicity.

| Group | Runs | Agree |
|---|---|---|
| Corpus `parse` with `expected-constraints` | 233 | 233 |
| Corpus `round-trip` (valid) | 12 | 12 |
| Other valid JSON documents | 3 | 3 |
| Directed cases | 13 | 13 |

**Disagreements: none**, in either language. JS and Python give identical failure multisets on all 261 runs.

**Non-vacuity:**

1. 122 of the 233 failing cases have a non-empty restricted expectation: 188 expected failures across 112 distinct ids.
2. The other 111 test only that no spurious `allowed-values` failure appears.
3. Every reportable `allowed-values` id appears in some expected list (0 uncovered).
4. The corpus lists ids only, so failure **locations** are not tested by it.

### 5.2 Mutation tests: what the corpus can distinguish

These are deliberately broken, unverified copies of the implementation, run with the JS harness (`mutants.sh`).

| Mutant | Corpus cases that differ | Directed cases that differ |
|---|---|---|
| A: applicable set = the entry itself only (CNS-008.01/02) | 47 (5 valid, 42 failing) | not run |
| D: `..` treated as `.` | 117 | not run |
| B: no dedup anywhere (CNS-006.01, CNS-017.03) | **0** | 2 |
| I: a non-string target never fails | **0** | 1 |
| B2: print each time dedup removes a duplicate | **0 duplicates in any corpus run** | n/a |

### 5.3 Independent cross-check

1. The store's TS manifest evaluator (`evaluateManifest`, json-p3) was run on the `allowed-values` entries over all 261
   inputs, in a scratch copy.
2. Its failure multisets equal the Dafny ones on all 261, over all `allowed-values` ids rather than only the
   restricted ones.
3. It also matches the hand-written expectations on all 13 directed cases.
4. Caveat: for the three dedup cases the expectations were written after seeing the Dafny output. They follow from
   CNS-008.02 and CNS-017.03, and the independent TS code agrees.

### 5.4 Corpus gaps found (store findings, not acted on)

1. No document makes an `allowed-values` query select the same node twice. The union rule (CNS-006.01, CNS-017.03) is
   untested for this kind: an implementation without dedup passes the whole corpus. A catalog with a control inside a
   control and a bad part name in the inner one catches it (directed case `nested-controls-union`).
2. No document has a non-string target node.
3. Failure locations are never compared.
4. Documents that do not conform to the schema are never run through the entries, so non-reportable entries are never
   tested.

## 6. Compiled output usability

| | JavaScript | Python |
|---|---|---|
| Generated size | 2,976 lines, 88 KB (1,188 runtime) | 2,054 lines, 72 KB (609 runtime) |
| Runtime dependency | `bignumber.js` (the runtime itself is included) | none (the runtime is emitted as `_dafny/`) |
| Wall time, whole corpus (261 runs) | 14.0 s, about 54 ms per run | 19.7 s, about 75 ms per run |
| Setup (load manifest, build entries) | 0.1 s | 0.12 s |
| Slowest run | `system-security-plan.json` (22 KB), 1.9 s | similar |
| Adapter code in the harness | 33 lines | 39 lines |

Awkward parts of the generated API:

1. **JS output is not a module.** It runs `Main` on load and exports nothing, so `build.sh` cuts the last line and
   appends `module.exports`.
2. **Python output is a directory of top-level modules.** The names are `Spec`, `Impl`, `Parser`, `Api`, `module_`,
   `System_` and `_dafny`. It needs a `sys.path` entry and could collide with other packages. The entry points are
   `Api.default__.Check` in Python and `Api.__default.Check` in JS.
3. **Datatypes.**
   1. JS uses `Spec.Json.create_JStr(seq)` and `dtor_` accessors.
   2. Python uses `NamedTuple` subclasses `Spec.Json_JStr(s=...)`, with `id` renamed `id_`.
   3. Every value goes through an adapter.
4. **Sequences and strings.**
   1. All sequences are immutable `_dafny.Seq`, and a `string` is a sequence of code points.
   2. JS uses `UnicodeFromString` and `toVerbatimString(false)`.
   3. Python uses `SeqWithoutIsStrInference(map(CodePoint, s))` and `"".join(seq)`.
   4. Concatenation copies. A CPU profile of the JS run puts 54% of the time in `Concat` and 9% in `Seq`.
5. **Big integers.**
   1. In JS every `int` and `nat`, loop counters included, is a `BigNumber`. The profile shows about 8% in
      `bignumber.js`.
   2. Python uses native `int`.
6. **Not tested:** documents larger than 22 KB, and deep recursion. The Python harness raises the recursion limit to
   10,000 as a precaution; it was not shown to be needed.

Usability verdict: fine as a conformance oracle in a test suite, not for production use inside a binding (1.9 s for a
22 KB document).

## 7. Trusted base: what is not proved

1. **The gap between prose and spec.**
   1. The theorem is `Api.Check(entries, doc) == Failures(entries, doc)`.
   2. That `Failures` means what CNS-006, 007, 008 and 017 say rests on one reading of the prose (section 4), the
      corpus (5.1), the TS cross-check (5.3) and one spec lemma.
   3. The TS code and the spec were written by readers of the same prose, and they agree on every ambiguity TS decides,
      so they could share a misreading.
2. **Scope cuts, so the spec is defined and claimed only for this subset.**
   1. One selector per segment.
   2. Filter queries only `@['k']` (no nested queries, `$`, or functions).
   3. Comparison only `==`.
   4. No slices, negative indexes, `<` or `!=`.
   5. String literals single-quoted, with `\'` and `\\` escapes only.
   6. Numbers are kept as their lexeme, so `1` and `1.0` are not equated.
   7. Deep equality of arrays and objects is not modeled and gives false.
   8. Items 6 and 7 are unreachable by `@['k'] == 'literal'`, but a later kind would need them.
3. **The parser** (`Parser.dfy`, 228 lines).
   1. No postcondition relates a string to its AST. Dafny checked only termination and index safety.
   2. It is compiled to both languages from one source and parses all 494 queries.
   3. A parser bug would make the theorem about the wrong query. Corpus agreement is evidence for it, not proof.
4. **The adapters** (33 lines JS, 39 lines Python) and the host JSON parsers. Number lexemes are lost, JS reorders
   integer-like keys (order only), and duplicate keys keep the last member.
5. **The compilers and runtimes.** That is the Dafny 4.11.0 JS and Python back ends, the `_dafny` runtimes,
   `bignumber.js`, Node and CPython. Verification covers termination and Dafny run-time errors, not stack depth or
   memory.
6. **The verifier and harness.** Dafny 4.11.0 with Z3 4.12.1, and the harness logic itself (id restriction, multiset
   comparison).
7. **Left out by choice:** the other six kinds, element mode, I-Regexp, YAML inputs, and `reportable` as an input.

## 8. Go/no-go for the other kinds

**Conditional go** for the document-mode kinds that need no regex and no RFC 9535 function: `has-cardinality`,
`is-unique`, `index`, `index-has-key`. **No-go for now** on `matches` and `expect`.

Reasons for go:

1. **The infrastructure carries over.** That covers the JSON datatype, query semantics (`..`, filters, union), context
   and target selection, dedup and the failure type. The part expected to be hard (traversal order) was easy.
2. **The cost was small.** 933 Dafny lines, about 6 implementation iterations, 8 s of verification, and seed-stable
   after one refactor.
3. **It found 12 prose decisions and 4 corpus gaps** for one kind. That is the main return, and writing a spec made it
   systematic.
4. **One compiled source** gave identical results in two languages, including the parser.

Reasons for caution:

1. **The residual risk is spec fidelity, not the proof.**
   1. The proof removes implementation bugs relative to the spec. Differential testing against the TS evaluator would
      largely have caught those too, since there were zero disagreements.
   2. Its marginal assurance is moderate, and a shared misreading is invisible to both.
2. **Friction appeared only where the implementation differs from the spec.** That was the table, with quantifier
   instability that needed `{:opaque}`. `is-unique` and `index` have more such places, because of null-bearing key
   lists, prefixes, cross-entry indexes, cartesian key products and partial indexes. Rough line-count guess, not
   measured: has-cardinality about +100 Dafny lines, the three key kinds about +300 to +400.
3. **`matches` and `expect` are a different size.**
   1. `matches` needs I-Regexp (RFC 9485) matching. Dafny has no regex library, and an extern call to a host engine
      would put that engine in the trusted base.
   2. `expect` needs the full RFC 9535 filter language: `<` comparisons, `count`, `length`, `match`, `search`, `value`,
      and function typing.
   3. Expect a multiple of this pilot rather than a fraction, and an I-Regexp decision comes first.
4. **Output performance and ergonomics** (section 6) rule out production use without changing the data structures.
   That does not matter for a conformance oracle.
5. **The corpus gaps (5.4) limit what agreement shows.** An implementation without dedup passes the corpus, so "agrees
   with the corpus" is weak evidence for the union rule in every kind. The store should add the missing cases first. A
   nested-control document is enough.

Suggested order: close the corpus gaps, do `has-cardinality`, then the key kinds together, and decide about I-Regexp
before touching `matches` or `expect`.
