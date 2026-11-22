# Contribute

This repo holds the contract that every OSCAL binding implements. The [README](README.md#develop) describes the
toolchain and the checks. Run `npm run check` before you open a pull request.

## Change a requirement

A change to the contract is an OpenSpec change in `openspec/changes/`. The identifier rules are in
[openspec/config.yaml](openspec/config.yaml), and the ledger is [openspec/spec-ids.yaml](openspec/spec-ids.yaml).

When a commit adds, renames, or removes a requirement in the main specs, do these steps in the same commit:

1. Run `npm run requirements:write`.
2. Commit `openspec/requirements.json` with the specs.

`npm run check` fails when the index differs from the main specs ([STO-053]).

When a commit changes `openspec/config.yaml`, run `npm run templates:write`, and commit the template config in
`templates/binding/` with it ([STO-058]). Read the diff of the template config. When the change adds a sentence that
only the store can follow, such as an `npm run` command, add an edit for it to `EDITS` in `scripts/templates.ts`.

When a commit adds a scenario to the main specs, the scenario needs one of these:

1. A corpus case that cites the scenario identifier.
2. A self-test in `scripts/` with a name that starts with the scenario identifier.
3. A `by-design` reason in [openspec/scenario-checks.yaml](openspec/scenario-checks.yaml). Use it only when no store
   script can check the scenario.

Then run `npm run coverage:write`, and commit `openspec/coverage.json` with the specs. Do not add a `gap` entry. The
`gap` list can get shorter, but not longer. `npm run coverage:check` fails for a scenario that has none of these
methods.

One pull request carries a change from proposal to archive:

1. Sync the delta specs into the main specs. When the change needs a version increment, set `VERSION` as
   [README.md, Version](README.md#version) states.
2. Archive the change in the same pull request. Steps that can run only after the merge, such as the release tag and
   follow-up issues in binding repos, go in the `## Workflow follow-up` section of `tasks.md`, not in tracked tasks.
3. After the merge, tag the release on `main`. Record the archive `sha256` in the release notes.

## Add an operation to a binding

A binding exposes only the operations that [SRF-001] allows. Each binding keeps a traceability record that conforms to
[openspec/traceability.schema.json](openspec/traceability.schema.json) ([SRF-003], [SRF-004]).

When a binding needs an operation that the contract does not define:

1. If the operation meets each condition of [SRF-002], define it in a binding-local requirement of the binding. Add
   it to the record of the binding. The contract does not change. The identifier of the requirement uses a prefix of
   the binding, never a prefix of the store ([SRF-010]). The binding checker in `templates/binding/` checks the
   record of the binding ([STO-057]).
2. If the operation does not meet a condition of [SRF-002], open an issue in this repo first. The binding adds the
   operation only after a contract requirement defines it.

## Promote a binding-local operation

A second binding can need an operation that another binding declared binding-local. Then promote the operation to the
contract:

1. Open an issue in this repo. Name the operation and the binding-local requirement of each binding that has it.
2. Propose a change that adds a contract requirement for the operation. Add corpus cases when the operation has a
   result that a test can compare.
3. After the release, each binding that declared the operation binding-local follows [SRF-005] when it moves its pin.

[SRF-001]: openspec/specs/binding-surface/spec.md#requirement-srf-001-a-binding-exposes-only-operations-that-a-requirement-defines
[SRF-002]: openspec/specs/binding-surface/spec.md#requirement-srf-002-a-binding-local-operation-adds-no-contract-behavior
[SRF-003]: openspec/specs/binding-surface/spec.md#requirement-srf-003-a-binding-records-the-requirement-that-covers-each-public-operation
[SRF-004]: openspec/specs/binding-surface/spec.md#requirement-srf-004-contract-identifiers-in-a-traceability-record-resolve-in-the-requirement-index
[SRF-005]: openspec/specs/binding-surface/spec.md#requirement-srf-005-a-binding-local-operation-that-the-contract-defines-conforms-or-is-deprecated
[STO-053]: openspec/specs/spec-store/spec.md#requirement-sto-053-the-store-publishes-a-requirement-index
[SRF-010]: openspec/specs/binding-surface/spec.md#requirement-srf-010-a-binding-local-requirement-does-not-use-a-store-prefix
[STO-057]: openspec/specs/spec-store/spec.md#requirement-sto-057-the-binding-checker-checks-the-traceability-record
[STO-058]: openspec/specs/spec-store/spec.md#requirement-sto-058-the-template-config-follows-the-store-config
