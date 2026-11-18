# Tasks

## 1. Runner

- [ ] 1.1 In `runFaults` of `scripts/coverage-faults.ts`, add the failure of design.md, D1, for each
      fault with an empty `detected` list. Keep the result in `results`. Update the comment of
      `runFaults`, which says that a fault in `failures` has no result. Verify
      `npm run coverage:faults` exits 0 and prints `faults: ok (4 faults, ...)`.
- [ ] 1.2 Replace the self-test "a fault that no case detects is a gap that does not fail the run".
      The new test verifies that a gap fails the run. The failure names the fault and the identifier
      that it breaks. The fault stays in `results`, and `report` still prints its gap line. Verify
      `npm run coverage:faults:self-test` passes. Remove the new failure of 1.1, and verify the test
      fails. Restore the failure.
- [ ] 1.3 Replace item 4 of the header comment of `scripts/coverage-faults.ts` with the two items of
      design.md, D3. Verify `npm run typecheck` passes and the header holds both items.

## 2. Documentation and full run

- [ ] 2.1 Add the sentence of design.md, D4 to item 13 of the numbered list in `README.md`. Verify
      the item says that a fault that no case detects fails the run.
- [ ] 2.2 Add a fault to `FAULTS` whose patch changes no result, for example a patch that rewrites a
      comment of `scripts/constraints-manifest.ts` to itself with a space added. Verify
      `npm run coverage:faults` exits 1 and the failure names the fault. Remove the fault.
- [ ] 2.3 Run `SPEC_IDS_BASE=main npm run check` and
      `openspec validate fail-on-undetected-fault --strict`. Verify that both exit 0.

## Workflow follow-up

1. Archive this change in the pull request after the required review. The change has no spec deltas,
   so `openspec archive` changes no spec.
2. The pull request description says `Closes #123`.

