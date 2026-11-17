# Design

## Context

See proposal.md, Why. These facts of the current store shape the approach:

1. Each scenario heading starts with its identifier, for example `#### Scenario: CNS-017.03 ...`.
   `specIdentifiers()` in `scripts/check-corpus.ts` reads the headings of each `spec.md` in `openspec/`, which
   includes `openspec/changes/`. It gives 353 scenario identifiers. 319 of them are in `openspec/specs/`.
2. A corpus case cites identifiers in `requirements`. 16 cases cite a requirement without a scenario of it, for
   example `PRS-013` and `FAC-001`.
3. A self-test gives the name of a test in one of three forms: a `test(name, fn)` helper (for example
   `scripts/names.ts`), a `scenario(name, ...)` helper (`scripts/requirements.ts`), or an item `[name, ...]` of an
   array (`scripts/check-corpus.ts`, `scripts/yaml-reader.ts`). Many names start with a scenario identifier, for
   example `"CNS-003.01: an unknown id fails"`. Some start with a requirement identifier only, for example
   `"CNS-017: two keys of one location are two failures"`.
4. `scripts/check-releases.ts` compares a generated file with its copy at `SPEC_IDS_BASE` (`git show`) and writes
   the result to `GITHUB_STEP_SUMMARY`. CI sets `SPEC_IDS_BASE` to the target branch of a pull request.
5. The store has two constraint evaluators. `scripts/constraint-reference.ts` evaluates the Metapath of the
   metaschema ([CNS-019]), and gives the expected failures of the corpus. `evaluateManifest` in
   `scripts/constraints-manifest.ts` evaluates the manifest with RFC 9535 queries ([CNS-022]), as a binding does.
6. A corpus case compares failures with `constraintMismatch` in `scripts/check-corpus.ts`. The comparison counts
   each repeat of an `id`.

## Goals / Non-Goals

**Goals:**

1. A scenario counts as checked only when a case or a test names the scenario identifier.
2. The checks of the hand-edited file run offline, as the other checks of `npm run check` do.
3. A fault is defined beside the evaluator text that it changes, and fails loudly when that text changes.

**Non-Goals:**

1. A check that a cite or a test name proves anything about the scenario. Item 3 of proposal.md, What Changes, is
   the only measurement, and only for `allowed-values`.
2. A check of the state of an issue on GitHub.
3. A change to `evaluateManifest` or to `scripts/constraint-reference.ts`.

## Decisions

### D1: A check names the scenario identifier

1. `corpus`: a case checks a scenario when its `requirements` holds the scenario identifier. A case that cites only
   the requirement does not check a scenario of it. A requirement-level cite does not say which scenario the case
   tests.
2. `self-test`: a test checks a scenario when a string literal in `scripts/*.ts` starts with the scenario
   identifier, followed by `:` or a space. The script reads the text of the files. It does not run the tests, and it
   does not look at the form of the self-test (Context, item 3). A name that the script builds at run time does not
   count. The self-test fixtures of `scripts/coverage.ts` use a prefix that is not in `openspec/spec-ids.yaml`, so
   they name no real scenario.
3. The scenario list comes from the scenario headings of `openspec/specs/` only. A scenario of an archived change or
   of an active change is not in the list. `specIdentifiers()` stays as it is, so `corpus:check` does not change.

Alternative: run each self-test and record the names at run time. Rejected. It needs a change to each script, and
it makes `coverage:write` as slow as all self-tests together. `scripts/verify-release.sh` already reads a script as
text. A rule for the `test(` call only is rejected too, because it misses the other two forms of Context, item 3.

### D2: Two files in `openspec/`

1. `openspec/scenario-checks.yaml` is hand-edited. It is YAML, as `openspec/spec-ids.yaml` is, and the `yaml`
   dependency reads it:

   ```yaml
   by-design:
     SRF-002.01: The rule applies to the process of a binding repository, which no store script can observe.
   gap:
     PRS-009.01: 71
   ```

   A `by-design` value is the reason. A `gap` value is the number of an issue in this store. A number needs no
   quotes in YAML, and the format check is simple: a positive integer.
2. `openspec/coverage.json` is generated, in canonical JSON. It has a `format` field, as `openspec/requirements.json`
   has. It has one item for each scenario, in identifier order, with the capability, `corpus` (case ids, sorted),
   `self-test` (items of script and test name, sorted), and `by-design` or `gap` when the YAML file has an entry.
   Empty lists are left out.

`CONTENTS` in `scripts/build-archive.ts` lists files in `openspec/` one by one, so the two files stay out of the
archive. A binding does not read them.

### D3: The rules of `coverage:check`

`coverage:check` fails, with one line for each failure, when:

1. `openspec/coverage.json` is not equal to the output of `coverage:write`.
2. A scenario has no `corpus`, no `self-test`, no `by-design` and no `gap`.
3. An entry of `openspec/scenario-checks.yaml` names an identifier that is not a scenario heading.
4. A scenario is in both lists.
5. A `by-design` reason is empty, or a `gap` value is not a positive integer.
6. A `by-design` or `gap` entry names a scenario that has a `corpus` or `self-test` check. The entry is then false,
   and the author removes it.
7. The `gap` list has a scenario that the `gap` list at `SPEC_IDS_BASE` does not have. The list can get shorter,
   but not longer. The check first resolves `SPEC_IDS_BASE` with `git rev-parse --verify`. When the ref does not
   resolve, the check fails. When the ref resolves and the file does not exist at it, the check passes.
   `realGit.show` of `scripts/check-releases.ts` gives the same result for both cases, so the check does not use
   it alone.

Rule 7 compares scenario identifiers only. A change of the issue number of an entry passes. Rule 6 removes entries
as checks arrive, and rule 7 prevents new entries, so the list goes toward empty. A new scenario must arrive with a
check or a `by-design` reason. A change that removes the only check of a scenario cannot move it to `gap`.

Alternative: ask GitHub whether each `gap` issue is open. Rejected. `npm run check` then needs the network and a
token, and rules 6 and 7 already keep the list from growing.

### D4: A fault is a text patch on `scripts/constraints-manifest.ts`

A fault has an id, the identifier that it breaks, and one or more patches. A patch is a pair of text strings: the
text to find, and the text to put in its place. The runner fails when the text to find does not occur exactly once
in `scripts/constraints-manifest.ts`. It then reports the fault and the patch. A change to the evaluator that breaks
a patch fails `npm run check`, and the author updates the patch.

The runner writes the patched text to a `.mts` file in a temporary directory, with each relative import changed to
the absolute path of the module in `scripts/`. It imports `evaluateManifest` from that file. `tsx` loads a `.ts` file
outside the package as CommonJS, and the import of `json-p3` then fails. A `.mts` file loads as an ES module.

The first set has three faults, from #69:

| Fault | Breaks | Patch |
|---|---|---|
| `no-union` | [CNS-017.03] | Remove the `includes` check before `set.entries.push(i)`. Remove the `reported` check in `add`. |
| `descendant-as-child` | [CNS-006] | Before each `run(q, ...)` of a context or target query, change `..[` to `[` and `..` to `.` in the query. |
| `entry-only-set` | [CNS-008.01] | Each entry of the applicable set checks the value against its own `values` only. |

The `no-union` fault needs two patches. The `reported` check of [CNS-017] removes a repeat of the failure even
when the applicable set holds the entry twice. `descendant-as-child` names a requirement, because no scenario of
[CNS-006] states the `..` rule.

Alternative: a fault option in `evaluateManifest`. Rejected. Each fault adds a branch that only the fault runner
uses to the code that [CNS-022] checks, and the set of faults is expected to grow to other kinds.

### D5: A case detects a fault when its result changes

1. The cases are the corpus cases whose input is a document that `scripts/check-corpus.ts` checks against the
   constraint manifest. The expected list is `expected-constraints`, or an empty list for a case that expects a
   valid document. Today `main()` of `scripts/check-corpus.ts` selects these cases inside its `switch`, for the
   operations `round-trip`, `parse`, `parse-typed`, `facade`, `assessment-period` and `yaml-round-trip`. Move that
   selection to an exported generator that gives each case, its document and its expected list. `main()` and the
   runner both use the generator, so the two scripts select the same cases.
2. Before it applies a fault, the runner runs the unpatched `evaluateManifest` on each case. Each result must equal
   the expected list, by `constraintMismatch`. Otherwise the runner fails, because a fault result is then not
   meaningful.
3. A case detects a fault when `constraintMismatch` reports a difference for the patched evaluator. The comparison
   uses all failures, of all kinds, as a conformance run of a binding does.
4. A patched evaluator that throws for a case fails the runner. An error hides whether a case detects the fault.
5. The report lists each fault, the identifier that it breaks, and the cases that detect it. A fault that no case
   detects is a gap. A gap does not fail the runner. The runner prints the report and writes it to
   `GITHUB_STEP_SUMMARY`.

The fault report is not a committed file. A committed report needs a staleness check, and that check fails CI on a
change of the corpus.

### D6: The job summary

`coverage:check` reads `openspec/coverage.json` and `openspec/scenario-checks.yaml` at `SPEC_IDS_BASE`, as
`scripts/check-releases.ts` does for the name diff, with the ref check of D3, rule 7. When a file does not exist at
the base, all its content counts as new. The summary has:

1. A table with one row for each capability: the scenarios, and the number with `corpus`, `self-test`, `by-design`
   and `gap`, at the base and now.
2. Each `by-design` entry that is new or has a new reason, with the scenario and the reason. A move from `gap` to
   `by-design` is in this list, so a reviewer sees it.
3. Each scenario that has a new `corpus` or `self-test` check, with the case id or the script and test name. A
   reviewer can then find a cite on a case that does not test the scenario.

### D7: The first `scenario-checks.yaml`

1. A scenario gets a `by-design` reason when no store script can observe the rule. Examples: a rule for the
   process of a binding repository, or a rule for a release step.
2. Each other unchecked scenario gets a `gap` entry. One issue in this store covers all `gap` scenarios of one
   requirement. The issue names the scenarios, and has the label `scenario-gap`.
3. Before items 1 and 2, rename each self-test whose name starts with a requirement identifier only, when the test
   checks one scenario of the requirement. The name then starts with the scenario identifier. Examples are the tests
   for `CNS-006`, `CNS-017`, `MDL-006`, `MDL-013` and `NAM-005`. A test that checks no single scenario keeps its
   name.

## Risks / Trade-offs

1. [A cite on a case that does not test the scenario passes `coverage:check`] → D6, item 3 lists each new cite for
   the reviewer. D5 measures detection for `allowed-values` only.
2. [A testable scenario gets a `by-design` reason] → Code-owner review of `openspec/`. D6, item 2 lists each new or
   changed reason.
3. [The import of a patched copy from a temporary directory fails with `tsx`] → D4 uses a `.mts` file. Task 3.1
   verifies the import before the faults are written.
4. [A string literal in a self-test fixture of another script names a real scenario, and counts as a check] → D6,
   item 3 lists each new `self-test` check with its script and name, so a reviewer sees it.
5. [The `descendant-as-child` patch makes a query that is not RFC 9535] → D5, item 4 fails the runner. The patch
   then changes.
6. [The first fault report shows `no-union` as a gap] → Expected. #68 adds the cases that detect it.

[CNS-006]: ../../specs/constraint-validation/spec.md#requirement-cns-006-the-manifest-selects-nodes-with-rfc-9535-queries
[CNS-008.01]: ../../specs/constraint-validation/spec.md#requirement-cns-008-an-allowed-values-entry-checks-the-value-against-its-applicable-set
[CNS-017]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-017.03]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-019]: ../../specs/constraint-validation/spec.md#requirement-cns-019-the-store-checks-the-queries-against-a-reference-evaluator
[CNS-022]: ../../specs/constraint-validation/spec.md#requirement-cns-022-the-store-checks-the-failures-of-the-manifest-against-the-reference-evaluator
