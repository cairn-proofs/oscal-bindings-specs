# Tasks

## 1. Sync

- [x] 1.1 Sync the deltas into the main specs. Remove the capabilities `model-derivation` and `naming-manifest`.
  Set the purpose of `spec-store` and `generated-models`. Verify: `openspec validate --all --strict` passes.
- [x] 1.2 Update `openspec/spec-ids.yaml`. Add the prefixes `STO` (`next: 59`) and `GEN` (`next: 4`). Retire each
  moved identifier with `replaced_by`, and retire `MDL-008` with `replaced_by` `PRS-004`. Verify: `npm run spec-ids`
  passes.

## 2. Citations

- [x] 2.1 Replace each moved identifier in the scripts, the documents, the templates, the corpus files and
  `openspec/scenario-checks.yaml`. Run `npm run templates:write`, `npm run requirements:write` and
  `npm run coverage:write`. Verify: `npm run check` passes.

## Workflow follow-up

- After the store release, open a pin-move issue in each binding tracker that does not call `pin-move-check.yml`.
