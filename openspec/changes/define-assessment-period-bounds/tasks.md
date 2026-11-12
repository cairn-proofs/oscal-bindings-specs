# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs`. A change in a binding repository is out
of scope (design.md, Non-Goals 3). The change edits a spec, the requirement index, the ledger, the corpus checker, and
the corpus index and README. It adds three corpus inputs.

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (sync) ---> 3 (checker) ---> 4 (cases)
```

Group 2 syncs the delta, so that the identifiers that the cases cite are in the main specs. Group 3 adds the field to
the checker before group 4 uses it in `cases.json`. The groups run in order.

## 1. Branch and planning commit

- [ ] 1.1 Create the feature branch from [#43] with `gh issue develop 43 --base main`, with the user's approval, and
      check it out. Commit the planning artifacts of this change as the first commit, with `#43` in the message.
      Commit the `README.md` entry for `oscal-bindings-typescript` in Known implementations as a separate commit.
      Verify `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate define-assessment-period-bounds --strict` passes.

## 2. Sync

- [ ] 2.1 Sync the delta of this change into `openspec/specs/`, without archiving the change. In `document-facade`,
      [FAC-007] follows [FAC-006]. Verify `openspec show document-facade --type spec` lists [FAC-007], [FAC-007.01] to
      [FAC-007.03]. Verify the requirement texts of [FAC-004] to [FAC-006] contain no "calendar date", "start date",
      or "end date". The headings of [FAC-005.02], [FAC-006], and [FAC-006.01] keep their words.
- [ ] 2.2 In the same commit as task 2.1, set `FAC` `next` to 8 in `openspec/spec-ids.yaml`, and run
      `npm run requirements:write`. Do not change `VERSION` (design.md, D6). Verify `npm run spec-ids` passes, and
      `openspec/requirements.json` has an entry for [FAC-007].
- [ ] 2.3 Commit tasks 2.1 and 2.2 with `#43` in the message. Verify `npm run check` passes before the commit.

## 3. Checker

- [ ] 3.1 In `scripts/check-corpus.ts`, add `"expected-period"?: { start: string; end: string }` to `Case`. For an
      `assessment-period` case with the field, apply the three checks of design.md, D4. Keep the existing check for a
      case with `expected-category`, and fail a case that has both fields or neither. Use `normalizeDatetime` from
      `scripts/canonical-json.ts` for the canonical form. Update the header comment of the script. Verify
      `npm run typecheck` and `npm run corpus:check` pass with the unchanged `cases.json`.
- [ ] 3.2 In `corpus/1.2.3/README.md`, add `expected-period` to the expected results of Cases, and change the
      `assessment-period` operation: the facade must report `expected-category`, or return the start and the end of
      `expected-period`. State that the runner normalizes each bound as `docs/canonical-json.md` states before it
      compares. Verify the README names each field that `Case` holds.
- [ ] 3.3 Commit group 3 with `#43` in the message. Verify `npm run check` passes before the commit.

## 4. Cases

- [ ] 4.1 Add the three inputs of design.md, D5, to `corpus/1.2.3/documents/valid/`. Each is a minimal valid document
      with the values of the D5 table, in that order. Add the three cases of D5 to `corpus/1.2.3/cases.json`, with
      `expected-period` and the `requirements` identifiers of D5. Verify `npm run corpus:check` passes.
- [ ] 4.2 Verify each check of design.md, D4, and the computation, fail a case that breaks them. On the working copy,
      apply these mutations one at a time, and restore after each:
      1. Set `expected-period.start` of `assessment-period/mixed-offsets` to `2026-03-01T23:00:00-05:00`.
      2. Set `expected-period.end` of `assessment-period/equal-instant` to `2026-03-01T07:00:00-05:00`.
      3. Set `expected-period.start` of `assessment-period/seventh-fraction-digit` to
         `2026-03-01T10:00:00.1234568Z`.
      4. Swap the order of the two results in `assessment-results-seventh-fraction-digit.json`. The checker must still
         pass, because the bounds do not depend on the tie rule.
      5. Add `expected-category` to `assessment-period/mixed-offsets`.
      6. In `assessment-period/catalog`, replace `expected-category` with an `expected-period`.
      Verify `npm run corpus:check` reports the case for mutations 1, 2, 3, 5, and 6, passes for mutation 4, and
      passes after each restore.
- [ ] 4.3 Commit group 4 with `#43` in the message. Verify `npm run check` passes before the commit, and
      `git status --short` shows no file under `corpus/`, `scripts/`, `openspec/specs/`, or `openspec/changes/`.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The change is archived in the same pull
request.

- Archive this change in the pull request. If a requirement or scenario changed after task 2.1, update the ledger and
  the index in the archive commit. Verify `npm run check` passes and `openspec list` shows no active change.
- Open the pull request with `Closes #43`, with the user's approval.
- The release that carries this change is out of scope. Its version is a minor increment (design.md, D6).
- After the release, draft an issue in `cairn-proofs/oscal-bindings-python` to move the pin. The issue states that
  `assessment_period()` returns datetime bounds by [FAC-007], and that the conformance runner reads `expected-period`.
  Post the issue only after the user approves it.

[#43]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/43
