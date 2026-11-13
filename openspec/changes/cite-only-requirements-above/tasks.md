# Tasks

## 1. Add the check, sync the specs, and add the rule

These tasks go in one commit, because the check fails on the main specs until the sync and the moves are done
(design.md, D6).

- [x] 1.1 Add the `forward-citation` rule to `checkSpecIds` in `scripts/check-spec-ids.ts`, as design.md, D4
      states. Add the 8 self-test scenarios of D4. Verify `npm run spec-ids:self-test` passes, and `npm run spec-ids`
      reports the 15 forward citations of proposal.md and no other failure. It reports 18 failures, because the
      citations of [SRF-001], [NAM-022], and [YML-004] repeat in the block of the citing requirement.
- [x] 1.2 Sync the 9 MODIFIED blocks of `specs/` into `openspec/specs/` by hand. Replace each requirement block in its
      place with the delta block. Verify `npm run spec-ids` then reports 8 failures: [SRF-001] cites [SRF-002],
      [SRF-004] cites [SRF-006], [PRS-006] cites [PRS-010], [MDL-003] cites [MDL-012], and [NAM-022] cites [NAM-004]
      and [NAM-013].
- [x] 1.3 Make the 4 moves of proposal.md, What Changes, item 2. Move each requirement block whole, with no text
      change. Verify `npm run spec-ids` passes, and `git diff --stat` shows no change in `openspec/spec-ids.yaml` or
      `openspec/requirements.json`.
- [x] 1.4 Check each move against the table of design.md, D1. For each term in that table, verify with `grep` that
      its first occurrence in the spec is in the requirement that defines it.
- [x] 1.5 Add the rule of design.md, D5, to the `specs` rules of `openspec/config.yaml`. Verify
      `openspec instructions specs --change cite-only-requirements-above --json` lists the rule in `rules`.
- [x] 1.6 Add a forward citation to a main spec, for example `[SRF-004]` in the text of [SRF-001]. Verify
      `npm run check` fails with a `[forward-citation]` line that names the file and the line. Remove the citation,
      and verify `git diff` shows no change to that spec from this task.
- [x] 1.7 In `README.md`, Layout, item 1, state that the requirements of each spec are in reading order, not in
      identifier order, and that a reader finds a requirement by its identifier with search or
      `openspec/requirements.json`. Verify `npm run binding-links:check` passes.
- [x] 1.8 Copy the repository to a scratch directory. Run `openspec archive cite-only-requirements-above --yes`
      there, and verify it prints "Specs already in sync; no files changed".
- [x] 1.9 Run `npm run check`. Verify it passes. Commit tasks 1.1 to 1.8.

## 2. Move the OpenSpec CLI pin to 2.0

- [ ] 2.1 Commit the pin in its own commit: `mise.toml` (`2.0`), `mise.lock` (2.0.0 with its `aube` entry), the new
      sidecar `.mise/locks/npm-fission-ai-openspec/2.0.0/`, and the removal of the 1.15.0 sidecar. Verify
      `mise install --locked` succeeds, `openspec --version` prints 2.0.0, and `npm run check` passes.

## Workflow follow-up

1. Archive this change in the pull request after the required review. Verify `openspec archive` prints "Specs
   already in sync", `npm run check` passes, and `openspec list` has no active change.
2. The release 0.8.0 carries this change. Its release notes state that no requirement changes its meaning, no
   identifier changes, and `binding-surface` and `document-parsing` are in a new order.
