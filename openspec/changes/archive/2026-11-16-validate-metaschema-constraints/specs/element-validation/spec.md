# Spec Delta

## ADDED Requirements

### Requirement: ELV-005 Element validation applies the constraints that the element can decide

Element validation SHALL return an invalid result for an element that conforms to the schema of
the named type and does not meet the constraint manifest as an element of that type, as
[CNS-018] states. Each failure of the result SHALL also carry the `id` of the manifest entry that
fails. A result for an element that does not conform to the schema SHALL list no constraint
failure. [ELV-004] applies to the constraint failures as to the schema failures.

#### Scenario: ELV-005.01 A hash with the wrong length

- **WHEN** the caller validates a `hash` element with the algorithm `SHA-256` and a value of 63
  hexadecimal digits
- **THEN** the result reports invalid, and its failure carries the `id`
  `oscal-check-hash-length-SHA2-3-256`

#### Scenario: ELV-005.02 A reference that the element cannot decide

- **WHEN** the caller validates a `responsible-party` element whose party identifier names no party
  in the element
- **THEN** the result reports valid, if no other manifest entry fails for the element
