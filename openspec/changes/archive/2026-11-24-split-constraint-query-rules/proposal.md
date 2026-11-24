# Proposal

## Why

[CNS-006] and [CNS-007] each hold two rules for two readers. One half says what the constraint manifest contains: that is a
rule for the contract store. The other half says how a binding evaluates the queries: that is a rule for a binding. A
requirement has one reader, so a binding cannot report its coverage of the evaluation rules while they sit with the
manifest rules.

## What Changes

1. [STO-059] holds the manifest half of CNS-006: the queries use only RFC 9535 syntax and I-Regexp.
2. [STO-060] holds the manifest half of CNS-007: each entry holds document context queries, element context queries and
   target queries. It also holds the scenario about a target in another document, which describes how the manifest is
   generated.
3. [CNS-006] and [CNS-007] keep the evaluation half. A binding evaluates each query as RFC 9535 defines, takes the union of
   nodes once, and runs each kind of query on its own input. Both are retitled.
4. [CNS-009] and [CNS-017] cite [STO-060] for the element context queries.
5. The scenario CNS-007.01 is retired and replaced by STO-060.02.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `contract-store`: two requirements are added.
2. `constraint-validation`: [CNS-006], [CNS-007], [CNS-009] and [CNS-017] change.

## Impact

1. `openspec/specs/`, `openspec/spec-ids.yaml`, `openspec/requirements.json` and `openspec/coverage.json`.
2. `scripts/constraints.ts` and `scripts/constraint-reference.ts`: the names of self-tests, and one new self-test.
3. A binding that cites CNS-007.01 cites STO-060.02 instead, or drops the citation.
