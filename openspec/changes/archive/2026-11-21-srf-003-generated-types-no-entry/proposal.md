# Proposal

## Why

[SRF-001] and [SRF-003] disagree about generated model types (#153). The Purpose of `binding-surface`
defines a public operation as a function, a type, or a member of a type that a binding exports.
[SRF-003] requires one record entry for each public operation. Read literally, each of the 244 types
of the OSCAL 1.2.3 naming manifest needs an entry. [SRF-001] already states that its rule does not
apply to a generated model type or to its members. [SRF-003] has no such statement. The traceability
records of `oscal-bindings-python` and `oscal-bindings-typescript` have 40 entries each. Neither has
an entry for a generated model type. The bindings already read the rule with the exception.

## What Changes

1. [SRF-003] states that the record holds no entry for a generated model type or for its members.
   The model-derivation capability and the naming manifest govern them. The wording follows
   [SRF-001].
2. A new scenario, SRF-003.05, states that a binding which exports the generated type of the Catalog
   document has no record entry for it and conforms.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `binding-surface`: the requirement SRF-003 gets the exception and the scenario SRF-003.05.

## Impact

1. `openspec/specs/binding-surface/spec.md`: the sync of the delta.
2. `openspec/scenario-checks.yaml`: a `by-design` reason for SRF-003.05, as for the other scenarios
   of SRF-003.
3. `openspec/coverage.json` and `openspec/requirements.json`: regenerated after the sync.
4. `VERSION`: no change. A pending increment already covers this change.
5. Each binding: no change. The traceability records of the bindings already conform.

[SRF-001]: ../../specs/binding-surface/spec.md#requirement-srf-001-a-binding-exposes-only-operations-that-a-requirement-defines
[SRF-003]: ../../specs/binding-surface/spec.md#requirement-srf-003-a-binding-records-the-requirement-that-covers-each-public-operation
