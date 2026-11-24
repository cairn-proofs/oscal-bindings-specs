# Spec Delta

## MODIFIED Requirements

### Requirement: STO-040 A distinguishing property identifies a branch only when an object holds it

The `property` member of each variant of a `union` entry of [STO-017] SHALL hold the distinguishing property of
[STO-039] for that branch, also when the branch defines that property as optional.

#### Scenario: STO-040.01 Object without an optional distinguishing property conforms to each branch

- **WHEN** the `CatalogGroup` entry records the distinguishing properties `groups` and `controls`, and each branch
  defines its distinguishing property as optional
- **THEN** the `property` member of the two variants is `groups` and `controls`
