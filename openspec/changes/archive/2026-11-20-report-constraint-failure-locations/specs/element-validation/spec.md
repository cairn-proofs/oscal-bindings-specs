# Spec Delta

## MODIFIED Requirements

### Requirement: ELV-005 Element validation applies the constraints that the element can decide

Element validation SHALL return an invalid result for an element that conforms to the schema of the
named type and does not meet the constraint manifest as an element of that type, as [CNS-018]
states. Each failure SHALL also carry the `id` of its manifest entry and its location as the
Normalized Path of [CNS-024]. A result for an element that fails the schema SHALL list no constraint
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

#### Scenario: ELV-005.03 The location of a failure of an element

- **WHEN** the caller validates a `hash` element with the algorithm `SHA-256` and a value of 63
  hexadecimal digits
- **THEN** the failure with the `id` `oscal-check-hash-length-SHA2-3-256` carries the location
  `$[0]['value']`

#### Scenario: ELV-005.04 The location of a failure in a list element

- **WHEN** the caller validates an element of the type `mapping-collection-mappings` that is a list
  of two mappings, and the second mapping holds a property with the name `bogus`
- **THEN** the failure with the `id` `oscal-metadata-prop-name-values` carries the location
  `$[0][1]['props'][0]['name']`
