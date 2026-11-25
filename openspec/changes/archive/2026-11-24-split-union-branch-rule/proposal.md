# Proposal

## Why

[STO-040] holds two rules for two readers. One rule says what the naming manifest records for a branch of a union: that is
a rule for the contract store. The other says that an object without an optional distinguishing property conforms to each
branch: that is a rule for a binding. A corpus case tests the second rule and cites the scenario of the first. Both bindings
cite the scenario in their tests.

## What Changes

1. A new requirement, [PRS-024], holds the rule for a binding. Its scenario is the one that the corpus case tests.
2. [STO-040] keeps the rule for the manifest. Its scenario states the manifest rule, and a store self-test checks it.
3. The corpus case cites the scenario of [PRS-024].

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-parsing`: one requirement is added.
2. `contract-store`: [STO-040] holds the manifest rule only.

## Impact

1. `openspec/specs/document-parsing/spec.md`, `openspec/specs/contract-store/spec.md`, `openspec/spec-ids.yaml`,
   `openspec/requirements.json` and `openspec/coverage.json`.
2. `corpus/1.2.3/cases.json`: the `requirements` of one case.
3. `scripts/names.ts`: one self-test.
4. A binding that cites STO-040.01 for the group case cites PRS-024.01 instead.
