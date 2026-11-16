# Spec Delta

## ADDED Requirements

### Requirement: BMB-005 A builder input is invalid when its element fails the constraint manifest

The input of the builders of [BMB-001], [BMB-002] and [BMB-003] SHALL also be invalid when the
element that it gives does not meet the constraint manifest as an element of its type, as
[CNS-018] states. Invalid input MUST report a validation error.

#### Scenario: BMB-005.01 A hash value with the wrong length

- **WHEN** the caller builds a hash from a value of 63 hexadecimal digits and omits the algorithm
- **THEN** the builder reports a validation error

#### Scenario: BMB-005.02 A resource with two links to the same reference

- **WHEN** the caller builds a resource with two rlinks that have the same target
  reference and no media type
- **THEN** the builder reports a validation error
