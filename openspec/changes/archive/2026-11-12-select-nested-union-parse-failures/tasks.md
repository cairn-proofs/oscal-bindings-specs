# Tasks

## 1. Sync the parse-failure requirement

- [x] 1.1 Sync [PRS-014] from the delta into `openspec/specs/document-parsing/spec.md` after
      [PRS-013]. In the same commit, set `PRS` `next` to 15 in `openspec/spec-ids.yaml` and
      update `openspec/requirements.json`. Verify `openspec show document-parsing --type spec`
      lists [PRS-014] and [PRS-014.01], and `npm run spec-ids` passes.

## 2. Add the selected-branch corpus bounds

- [x] 2.1 Update `parse/closed-enum-out-of-set` in `corpus/1.2.3/cases.json`. Keep
      `PRS-009.01` in the requirements and add [PRS-014.01]. Set `expected-min-failures` and
      `expected-max-failures` to 1. Verify `npm run corpus:check` passes.

## 3. Verify the integrated change

- [x] 3.1 Run `npm run check`. Verify it passes after the synced requirement and corpus case
      are present.

## Workflow follow-up

1. Archive this change in the pull request after the required review. Verify `npm run check`
   passes and `openspec list` has no active change.
