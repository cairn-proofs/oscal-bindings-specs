# Tasks

## 1. Corpus and tests

- [x] 1.1 In `corpus/1.2.3/cases.json`, change the `requirements` of the case
  `round-trip/group-without-distinguishing-property` from `STO-040.01` to `PRS-024.01`. Verify: `npm run corpus:check`
  passes.
- [x] 1.2 In `scripts/names.ts`, add the self-test `STO-040.01`: for a group union with optional distinguishing
  properties, each variant of the entry records its property. Verify: `npm run names:self-test` passes.

## 2. Sync, archive and integration

- [x] 2.1 Sync the delta. Rename the title of `STO-040.01` in `openspec/specs/contract-store/spec.md` to "Variant
  records its distinguishing property when the branch defines it as optional". Verify: the title and the scenario body
  agree.
- [x] 2.2 Update `openspec/spec-ids.yaml`: `PRS` `next: 25`. Run `npm run requirements:write` and
  `npm run coverage:write`. Verify: `npm run spec-ids` and `npm run coverage:check` pass.
- [x] 2.3 Archive the change. Run `npm run check`. Verify: it passes.

## Workflow follow-up

- Bindings that cite STO-040.01 for the group case cite PRS-024.01 at their next pin move.
