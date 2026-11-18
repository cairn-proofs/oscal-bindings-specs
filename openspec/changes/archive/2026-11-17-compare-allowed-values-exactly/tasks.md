# Tasks

## 1. Corpus case and fault

- [x] 1.1 Add the corpus case of [D2]. Write the file
      `corpus/1.2.3/documents/invalid/allowed-value-case.json`, and add the case to
      `corpus/1.2.3/cases.json` directly after the case
      `parse/nested-control-part-name-three-levels`. Add a `notes` field that states the listed
      value, the value and the expected failure. Verify `npm run corpus:check` passes, and verify
      `npm run corpus:cases` leaves the case in `cases.json`.
- [x] 1.2 Add the fault of [D3] to `FAULTS` in `scripts/coverage-faults.ts`, after
      `entry-only-set`. Verify `npm run coverage:faults:self-test` passes. Run
      `npm run coverage:faults` with `GITHUB_STEP_SUMMARY` set to a temporary file. Verify the
      output states that one case detects `case-insensitive`, and verify the file lists the case
      `parse/allowed-value-case` for it.

## 2. Sync, archive and integration

- [x] 2.1 Sync the delta into `openspec/specs/constraint-validation/spec.md`. Put CNS-025 directly
      below `CNS-008` ([D1]). In `openspec/spec-ids.yaml`, set `next` of `CNS` to 26. Run
      `npm run requirements:write` and `npm run coverage:write`. Verify `npm run spec-ids`,
      `npm run requirements:check` and `npm run coverage:check` pass, and verify
      `openspec/coverage.json` lists the case of 1.1 for `CNS-025.01`.
- [x] 2.2 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 2.3 Run `npm run check`. Verify it passes.

## Workflow follow-up

1. Close #127 with the pull request.
2. The next release holds this change. `VERSION` stays `0.9.0+oscal.1.2.3`. After the release, each
   binding gets a pin-move issue.

[D1]: design.md#d1-a-new-requirement-below-cns-008
[D2]: design.md#d2-a-hand-written-corpus-case-outside-the-generated-block
[D3]: design.md#d3-a-case-insensitive-fault
