# Tasks

## 1. Implement

- [x] 1.1 Add `corpus/1.2.3/required-keys.json`.
- [x] 1.2 Add check 19 and its self-test `SER-006.01` to `scripts/check-corpus.ts`. Describe the
      check in `corpus/1.2.3/README.md`.

## 2. Sync, archive and integration

- [x] 2.1 Sync the delta into `openspec/specs/serialization/spec.md`. Set `next` of SER to 7 in
      `openspec/spec-ids.yaml`. Run `npm run requirements:write` and `npm run coverage:write`.
      Verify `npm run spec-ids`, `npm run requirements:check` and `npm run coverage:check` pass.
- [x] 2.2 Verify `npm run version:check` passes with `VERSION` unchanged.
- [x] 2.3 Archive the change.

## Workflow follow-up

1. Close #165 with the pull request.
2. The next release holds this change. After the release, each binding gets a pin-move issue.
