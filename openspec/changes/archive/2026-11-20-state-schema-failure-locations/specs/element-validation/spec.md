# Spec Delta

## ADDED Requirements

### Requirement: ELV-006 The location of a schema failure of an element is the location of the failing node

Each fault of the schema in the result of [ELV-001] SHALL give one failure with the location of its
failing node, as [PRS-021] states. The input is the array that holds only the element, as [CNS-024]
states. [PRS-014] applies to the failures of an element as to the entries of a parse error.
[ELV-004] states when the result lists fewer failures.

#### Scenario: ELV-006.01 A value that the schema rejects

- **WHEN** the caller validates a `parameter-selection` element whose `how-many` is `seven`
- **THEN** the result reports invalid, and its one failure carries the location `$[0]['how-many']`

#### Scenario: ELV-006.02 A required member that is absent

- **WHEN** the caller validates an `observation` element that has no `collected`
- **THEN** the result reports invalid, and its one failure carries the location `$[0]`

#### Scenario: ELV-006.03 An array with too few items

- **WHEN** the caller validates a `back-matter` element whose `resources` is an empty array
- **THEN** the result reports invalid, and its one failure carries the location `$[0]['resources']`

#### Scenario: ELV-006.04 A failure in a selected nested-union branch

- **WHEN** the caller validates a `parameter` element whose `select` sets `how-many` to `seven`
- **THEN** the result reports invalid, and it lists exactly one failure, with the location
  `$[0]['select']['how-many']`
