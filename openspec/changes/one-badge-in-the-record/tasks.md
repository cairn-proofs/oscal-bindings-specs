# Tasks

## 1. Ledger and index

- [ ] 1.1 In `scripts/check-spec-ids.ts`, require `binding` in each prefix entry of the contract store ledger, and read
  it. A binding ledger needs no `binding`. Add `binding` to each prefix entry of `openspec/spec-ids.yaml`: false for
  `STO`, true for each other prefix. Verify: self-tests `STO-059.01` and `STO-059.02` pass.
- [ ] 1.2 In `scripts/requirements.ts`, add `binding` to each index entry from the ledger. Verify: self-tests
  `STO-053.05` and `STO-053.06` pass.
- [ ] 1.3 Rewrite `openspec/traceability.schema.json` for format 2 ([SRF-015]). Verify: the self-test of
  `scripts/requirements.ts` covers `SRF-015.01` and `SRF-015.02`.

## 2. Binding checker

- [ ] 2.1 In `scripts/traceability.ts`, add the rules of [SRF-016], [SRF-017], [SRF-004] (`SRF-004.03`) and
  [STO-062]. Verify: self-tests `SRF-016.01` to `SRF-016.03`, `SRF-017.01` to `SRF-017.04`, `SRF-004.03` and
  `STO-062.01` to `STO-062.04` pass.
- [ ] 2.2 In `scripts/binding-check.ts`, add `--write` and `--results <file>` ([STO-061]). Verify: self-tests
  `STO-061.01` to `STO-061.03` pass.

## 3. Templates

- [ ] 3.1 Change `templates/binding/hooks/pre-commit` and `templates/binding/bin/install.sh` to read `pin` from the
  record ([STO-063]). Change the empty record and the template README text in `scripts/templates.ts`, and change
  `templates/binding/AGENTS.md`. Run `npm run templates:write`. Verify: `npm run templates:check` and the template
  self-tests for `STO-063.01` to `STO-063.03` pass.

## 4. Sticker

- [ ] 4.1 Rewrite `docs/sticker.md` for one badge that reads `$.badge`. Remove the `spec-pin.json` steps and the
  workflow steps. Verify: the badge URL renders with a placeholder repository.
- [ ] 4.2 In `scripts/build-archive.ts`, replace the self-tests of [SRF-008] with `STO-060.01` and `STO-060.02`.
  Verify: `npm run archive:self-test` passes.
- [ ] 4.3 Update the sticker text in `README.md`. Verify: `npm run binding-links:check` passes.

## 5. Sync, archive and integration

- [ ] 5.1 Sync the delta into the main specs. Put [SRF-015] to [SRF-018] below [SRF-010], in the order of the delta.
  Put [STO-059] to [STO-063] below [STO-058]. Verify: each requirement has 500 characters or fewer.
- [ ] 5.2 Update `openspec/spec-ids.yaml`. Set `SRF` `next: 19` and `STO` `next: 64`. Retire `SRF-008` and `SRF-009`
  with `replaced_by` `STO-060` and `SRF-018`. Add the `by-design` reasons for `SRF-018.01` to `SRF-018.04` and
  `STO-063.01` to `STO-063.03` in `openspec/scenario-checks.yaml` where no script can observe them. Run
  `npm run requirements:write` and `npm run coverage:write`. Verify: `npm run spec-ids` and `npm run coverage:check`
  pass.
- [ ] 5.3 Decide the `VERSION` increment for a record format and identifiers that older bindings cannot read. Verify:
  `npm run version:check` and `npm run releases:check` pass.
- [ ] 5.4 Archive the change. Verify: `openspec list --json` shows no active change with this name.
- [ ] 5.5 Run `npm run check`. If `npm run templates:check` fails, run `npm run templates:write` and run
  `npm run check` again. Verify: `npm run check` passes.

## Workflow follow-up

- After the contract store release, open a pin-move issue in each binding tracker that does not call
  `pin-move-check.yml`.
- Open an issue in each binding tracker to move its record to format 2, give a status to each requirement that the
  index marks `binding`, remove `spec-pin.json` and the workflow badge, and add the sticker.
- Open an issue in the contract store for the requirements that have no corpus case, starting with the generated
  names, so that a binding can check them.
