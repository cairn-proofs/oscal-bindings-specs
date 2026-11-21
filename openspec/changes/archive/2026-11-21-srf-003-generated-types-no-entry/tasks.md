# Tasks

## 1. Sync, archive and integration

- [x] 1.1 Sync the delta. In `openspec/specs/binding-surface/spec.md`, replace SRF-003 with the delta.
      In `openspec/scenario-checks.yaml`, add the `by-design` reason of SRF-003.04 for SRF-003.05
      directly below SRF-003.04. Run `npm run requirements:write` and `npm run coverage:write`. Verify
      `npm run spec-ids`, `npm run requirements:check` and `npm run coverage:check` pass. Verify
      `openspec/coverage.json` lists the `by-design` method for SRF-003.05. Verify the description of
      SRF-003 has 500 characters or fewer in the main spec.
- [x] 1.2 Verify `npm run version:check` and `npm run releases:check` pass with `VERSION` unchanged at
      `0.10.0+oscal.1.2.3`.
- [x] 1.3 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 1.4 Run `npm run check` with the pinned `openspec` binary. If `npm run templates:check` fails,
      run `npm run templates:write` and run `npm run check` again. Verify `npm run check` passes.

## Workflow follow-up

1. Close #153 with the pull request.
2. The next release holds this change. After the release, each binding gets a pin-move issue.
