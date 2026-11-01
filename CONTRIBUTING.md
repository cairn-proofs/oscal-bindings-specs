# Contribute

This repo holds the contract that every OSCAL binding implements. The [README](README.md#develop) describes the
toolchain and the checks. Run `npm run check` before you open a pull request.

## Change a requirement

A change to the contract is an OpenSpec change in `openspec/changes/`. The identifier rules are in
[openspec/config.yaml](openspec/config.yaml), and the ledger is [openspec/spec-ids.yaml](openspec/spec-ids.yaml).

When a commit adds, renames, or removes a requirement in the main specs, do these steps in the same commit:

1. Run `npm run requirements:write`.
2. Commit `openspec/requirements.json` with the specs.

`npm run check` fails when the index differs from the main specs ([SRF-006]).

## Add an operation to a binding

A binding exposes only the operations that [SRF-001] allows. Each binding keeps a traceability record that conforms to
[openspec/traceability.schema.json](openspec/traceability.schema.json) ([SRF-003], [SRF-004]).

When a binding needs an operation that the contract does not define:

1. If the operation meets each condition of [SRF-002], define it in a binding-local requirement of the binding. Add
   it to the record of the binding. The contract does not change.
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
[SRF-006]: openspec/specs/binding-surface/spec.md#requirement-srf-006-the-store-publishes-a-requirement-index
