# Proposal

## Why

The store does not report which scenarios have a check, or whether a check detects a wrong implementation (#69). On
`main`, 180 of 319 scenarios have a corpus case or a self-test that names them, and 139 have neither. #69 counts 172
and 147, because its count reads only self-tests of the form `test(name, fn)`. The store does not record which of
the unchecked scenarios cannot have a mechanical check, or why. A case that cites a scenario does not prove that
the case fails for an implementation that breaks the scenario. #68 is an example: no case makes a query select the
same node twice, so a manifest evaluator without the union rule of [CNS-017.03] passes all cases.

## What Changes

1. Add `npm run coverage:write`. It writes `openspec/coverage.json`, a committed file. For each scenario, the file
   gives each method that checks the scenario (design.md, D1 and D2):
   1. `corpus`: the ids of the corpus cases that cite the scenario identifier.
   2. `self-test`: the script and the test name of each self-test whose name starts with the scenario identifier.
   3. `by-design`: a reason from a hand-edited file. The scenario cannot have a mechanical check.
   4. `gap`: an issue in this store, from the same hand-edited file. The scenario can have a check, but has none.
2. Add `npm run coverage:check` to `npm run check`. It fails when the generated file is stale, when a scenario has no
   method, or when the hand-edited file breaks one of the rules of design.md, D3. One rule lets the `gap` list get
   shorter, but not longer.
3. Add `npm run coverage:faults`. It applies each fault of a set to the RFC 9535 evaluation of the manifest
   ([CNS-022]) and runs the document-level corpus cases (design.md, D4 and D5). The report gives each fault and the
   cases that detect it. A fault that no case detects names its scenario. The faults are for `allowed-values` only.
   A fault that no case detects does not fail CI.
4. Add the change in coverage, against the base ref, to the CI job summary (design.md, D6).
5. Write the first hand-edited file. Each unchecked scenario gets a `by-design` reason, or a `gap` entry that names
   the issue of its requirement. Open one issue in this store for each requirement that has a `gap` entry. Each of
   these issues has the new label `scenario-gap`, so that a search can find them and tell them from other issues.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change is store tooling. It adds no requirement and no file to the release archive, and no binding data
([VER-006]). `.openspec.yaml` sets `skip_specs: true`.

## Impact

1. New scripts in `scripts/`, with self-tests. New npm scripts `coverage:write`, `coverage:check`,
   `coverage:self-test` and `coverage:faults`.
2. Two new files in `openspec/`: the generated `coverage.json` and the hand-edited `scenario-checks.yaml`, which
   holds the `by-design` and `gap` entries. `CONTENTS` in `scripts/build-archive.ts` does not list them, so the
   archive does not change.
3. `scripts/check-corpus.ts` exports the document-level cases and their expected failures, for the fault runner.
4. `npm run check` runs `coverage:check` and `coverage:faults`, so CI runs them with no change to the workflows.
5. A change that adds a scenario must also add a corpus case, a self-test or a `by-design` reason. A change that
   removes the only check of a scenario fails `coverage:check`.
6. New issues in this store, one for each requirement with a `gap` entry, and the new label `scenario-gap`.

[VER-006]: ../../specs/schema-versioning/spec.md#requirement-ver-006-dependencies-run-from-bindings-to-the-store-never-back
[CNS-017.03]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-022]: ../../specs/constraint-validation/spec.md#requirement-cns-022-the-store-checks-the-failures-of-the-manifest-against-the-reference-evaluator
