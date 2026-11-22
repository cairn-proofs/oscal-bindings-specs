# Tasks

## 1. Index and schema

- [ ] 1.1 In `scripts/requirements.ts`, add the boolean `corpus` to each index entry. Read it from the generated
  coverage data. Run `npm run coverage:write` before `npm run requirements:write`. Verify: `requirements:self-test`
  covers [SRF-006.05] and [SRF-006.06].
- [ ] 1.2 Rewrite `openspec/traceability.schema.json` for format 2 ([SRF-020]). Verify: the self-test of
  `scripts/requirements.ts` covers [SRF-020.01] and [SRF-020.02].

## 2. Binding checker

- [ ] 2.1 In `scripts/traceability.ts`, add the badge rule ([SRF-017]) and the rules of [SRF-021].
  Verify: self-tests `SRF-021.01` to `SRF-021.03` and `SRF-017.01` to `SRF-017.04` pass.
- [ ] 2.2 In `scripts/binding-check.ts`, add `--write` and `--failed <file>` ([SRF-018]). Verify: self-tests
  `SRF-018.01` to `SRF-018.03` pass.

## 3. Templates

- [ ] 3.1 Change `templates/binding/hooks/pre-commit` and `templates/binding/bin/install.sh` to read `pin` from the
  record ([SRF-019]). Change the empty record and the template README text in `scripts/templates.ts`, and change
  `templates/binding/AGENTS.md`. Run `npm run templates:write`. Verify: `npm run templates:check` and the template
  self-tests for `SRF-019.01` to `SRF-019.03` pass.

## 4. Sticker

- [ ] 4.1 Rewrite `docs/sticker.md` for one badge that reads `$.badge`. Remove the `spec-pin.json` steps and the
  workflow steps. Verify: the badge URL renders with a placeholder repository.
- [ ] 4.2 In `scripts/build-archive.ts`, replace the self-tests of [SRF-008] with `SRF-015.01` and `SRF-015.02`.
  Verify: `npm run archive:self-test` passes.
- [ ] 4.3 Update the sticker text in `README.md`. Verify: `npm run binding-links:check` passes.

## 5. Sync, archive and integration

- [ ] 5.1 Sync the delta into `openspec/specs/binding-surface/spec.md`. Put [SRF-020] below [SRF-007], and [SRF-015] to
  [SRF-017] where [SRF-008] and [SRF-009] are. Put [SRF-018], [SRF-021] and [SRF-019] below [SRF-014], in that order, so
  that each requirement cites only requirements above it.
  Verify: each requirement has 500 characters or fewer.
- [ ] 5.2 Update `openspec/spec-ids.yaml`. Set `SRF` `next: 22`. Retire `SRF-008` and `SRF-009` with `replaced_by`
  `SRF-015` and `SRF-016`. Add the `by-design` reasons for `SRF-016.01` to `SRF-016.04` and `SRF-019.01` to
  `SRF-019.03` in `openspec/scenario-checks.yaml` where no script can observe them. Run `npm run requirements:write`
  and `npm run coverage:write`. Verify: `npm run spec-ids` and `npm run coverage:check` pass.
- [ ] 5.3 Decide the `VERSION` increment for a record format that older bindings cannot read. Verify:
  `npm run version:check` and `npm run releases:check` pass.
- [ ] 5.4 Archive the change. Verify: `openspec list --json` shows no active change with this name.
- [ ] 5.5 Run `npm run check`. If `npm run templates:check` fails, run `npm run templates:write` and run
  `npm run check` again. Verify: `npm run check` passes.

## Workflow follow-up

- After the store release, open a pin-move issue in each binding tracker that does not call `pin-move-check.yml`.
- Open an issue in each binding tracker to move its record to format 2, remove `spec-pin.json` and the workflow
  badge, and add the sticker.
