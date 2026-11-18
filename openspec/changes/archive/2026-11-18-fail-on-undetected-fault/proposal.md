# Proposal

## Why

`npm run coverage:faults` applies faults to the manifest evaluator. It lists the corpus cases that
detect each fault (#122). A fault that no case detects is a gap. A gap appears in the report. A gap
does not fail the run. The corpus can lose the case that detects a fault, and no check shows it
(#123).

## What Changes

1. A fault that no corpus case detects fails `npm run coverage:faults`. It therefore fails
   `npm run check`. The failure names the fault and the identifier that it breaks.
2. The header comment of `scripts/coverage-faults.ts` states when a fault is valid. A fault is valid
   only when an input that conforms to the schema can change the list of failure identifiers that
   the runner compares. A fault that no such input can detect fails the run, and the author removes
   it.
3. A new fault lands in the same pull request as the case that detects it.
4. The self-test of the runner checks the new rule. `README.md` describes the rule.

The 4 faults of `main` each have a detecting case. `npm run check` passes with no other change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change is store tooling. It adds no requirement and changes no file of the release
archive. `.openspec.yaml` sets `skip_specs: true`.

## Impact

1. `scripts/coverage-faults.ts`: `runFaults`, the header comment, and the self-test.
2. `README.md`: the text of the scenario coverage item.
3. A pull request that adds a fault with no detecting case fails CI. A pull request that removes the
   last case that detects a fault also fails CI.
4. `CONTENTS` in `scripts/build-archive.ts`, the archive, and `VERSION` do not change.

