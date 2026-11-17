# Tasks

## 1. Generate the coverage file

- [x] 1.1 Add `scripts/coverage.ts` with `--write` and `--self-test`, and the npm scripts `coverage:write` and
      `coverage:self-test`. It reads the scenario headings of `openspec/specs/` (design.md, D1, item 3), the
      `requirements` of `corpus/<release>/cases.json`, the string literals of `scripts/*.ts` (D1, item 2) and
      `openspec/scenario-checks.yaml`, and writes `openspec/coverage.json` in the format of D2. Self-test cases: a
      scenario-level cite counts, a requirement-level cite does not, a name in each of the three forms of Context,
      item 3 counts, a name built at run time does not, a scenario of `openspec/changes/` is not in the list, and the
      output is canonical JSON. The fixtures use a prefix that is not in `openspec/spec-ids.yaml`. Verify
      `npm run coverage:self-test` passes.
- [x] 1.2 Rename the self-tests of D7, item 3. Verify the self-test of each changed script passes.
- [x] 1.3 Run `npm run coverage:write` with no `openspec/scenario-checks.yaml`. Verify the file gives 319 scenarios.
      Before task 1.2, 180 have a check and 139 have none. Record the numbers after task 1.2 in the pull request
      description. Do not commit `openspec/coverage.json` yet.

## 2. Record the unchecked scenarios, and add the check

- [x] 2.1 Classify each unchecked scenario as D7, items 1 and 2 state. Write the list of `by-design` scenarios with
      their reasons, and the list of `gap` scenarios by requirement. Show both lists to the user, and get approval
      before task 2.2.
- [x] 2.2 Create the label `scenario-gap` in this repository, with a description that names
      `openspec/scenario-checks.yaml`. Open one issue for each requirement in the approved `gap` list. Each issue
      names its scenarios and has the label. Get the user's approval before you open the issues. Verify
      `gh issue list --label scenario-gap` gives one issue for each requirement.
- [x] 2.3 Write `openspec/scenario-checks.yaml` with the approved entries and the issue numbers of task 2.2. Run
      `npm run coverage:write`. Verify each scenario of `openspec/coverage.json` has at least one method.
- [x] 2.4 Add the default mode and the npm script `coverage:check`, with the 7 rules of D3. Add a self-test case
      for each rule that passes and one that fails. For rule 7, use a fake git with three bases: a ref that does not
      resolve (fails), a ref without the file (passes), and a ref with a shorter `gap` list (fails). Verify
      `npm run coverage:self-test` and `npm run coverage:check` pass.
- [x] 2.5 Add the job summary of D6 to `coverage:check`, with self-test cases for a new `by-design` entry, a move
      from `gap` to `by-design`, and a new cite. Run `GITHUB_STEP_SUMMARY=<scratch file> npm run coverage:check`, and
      verify the file has the table and the two lists.
- [x] 2.6 Add `coverage:self-test` and `coverage:check` to `npm run check`. Add rows for `openspec/coverage.json`
      (generated, `npm run coverage:write`) and `openspec/scenario-checks.yaml` (hand-edited) to the table of
      AGENTS.md, Find your way. In CONTRIBUTING.md, Change a requirement, state that a new scenario needs a corpus
      case, a self-test or a `by-design` reason. Verify `npm run check` passes. Commit group 1 and group 2, with
      `openspec/coverage.json` and `openspec/scenario-checks.yaml`.
- [x] 2.7 With `SPEC_IDS_BASE=HEAD`, remove the only check of a checked scenario, and verify `npm run check` fails
      with a line that names the scenario (rule 2). Add a `gap` entry for that scenario, and verify rule 7 fails. Run
      with `SPEC_IDS_BASE=no-such-ref`, and verify the check fails. Undo the edits, and verify `git status` shows no
      change.

## 3. Measure which cases detect a fault

- [x] 3.1 Add `scripts/coverage-faults.ts` with the npm scripts `coverage:faults` and `coverage:faults:self-test`.
      First write the import of a patched `.mts` copy of `scripts/constraints-manifest.ts` from a temporary directory
      (D4). Verify that an empty patch gives the same failures as the unpatched module for one corpus case.
- [x] 3.2 Move the case selection of `main()` in `scripts/check-corpus.ts` to the exported generator of D5, item 1,
      and make `main()` use it. Verify `npm run corpus:self-test` and `npm run corpus:check` pass, and the generator
      gives 267 cases. Verify the runner checks the unpatched evaluator against each case with no difference (D5,
      item 2).
- [x] 3.3 Add the three faults of D4 and the report of D5. Self-test cases: a patch that does not match fails, a
      patch that matches twice fails, a patched evaluator that throws fails, and a fault that no case detects is a
      gap that does not fail. Verify `npm run coverage:faults:self-test` passes.
- [x] 3.4 Run `npm run coverage:faults`. Verify it exits 0, `no-union` is a gap that names [CNS-017.03], and the
      report names the cases that detect `descendant-as-child` and `entry-only-set`. If one of these two is a gap,
      record it in the pull request description.
- [x] 3.5 Add `coverage:faults:self-test` and `coverage:faults` to `npm run check`. Change the text of a patched line
      of `scripts/constraints-manifest.ts`, and verify `npm run check` fails and names the fault. Undo the edit.

## 4. Integration

- [x] 4.1 Run `npm run check` and `npm run archive`. Verify the check passes, and the archive lists no file of
      `openspec/` other than the files that `CONTENTS` names.

## Workflow follow-up

1. Archive this change in the pull request after the required review. The change has no spec deltas, so
   `openspec archive` changes no spec.
2. The first CI run on the pull request writes the job summary with no base files. Each later pull request shows the
   change against `main`.
3. #68 closes the `no-union` gap. After the first report, decide whether a fault that no case detects fails CI
   (#69).

[CNS-017.03]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
