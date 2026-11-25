# Tasks

## 1. Tests

- [x] 1.1 In `scripts/constraints.ts`, name the tests of the manifest half with the new scenario identifiers: the two
  `CNS-006:` tests become `STO-059.01` and `STO-059.02`, the `CNS-007.01` test becomes `STO-060.02`, and the `CNS-007:`
  tests become `STO-060`. In `scripts/constraint-reference.ts`, rename the `CNS-007.01` test to `STO-060.02`.
- [x] 1.2 In `scripts/constraints.ts`, add the self-test `STO-060.01`: an entry without `target` fails the check.
  Verify: `npm run constraints:self-test` passes.

## 2. Sync, archive and integration

- [x] 2.1 Sync the delta. Remove the scenario CNS-007.01 from `openspec/specs/constraint-validation/spec.md` by hand.
  Verify: the requirement CNS-007 holds CNS-007.02 only.
- [x] 2.2 Update `openspec/spec-ids.yaml`: `STO` `next: 61`. Retire `CNS-007.01` with `replaced_by` `STO-060.02`. Run
  `npm run requirements:write` and `npm run coverage:write`. Verify: `npm run spec-ids` and `npm run coverage:check` pass.
- [x] 2.3 Archive the change. Run `npm run check`. Verify: it passes.

## Workflow follow-up

- Open an issue in the contract store for corpus cases of CNS-006.01 and CNS-007.02, so that a binding can check how it
  evaluates the queries of the manifest.
- Bindings that cite CNS-007.01 cite STO-060.02 or drop the citation at their next pin move.
