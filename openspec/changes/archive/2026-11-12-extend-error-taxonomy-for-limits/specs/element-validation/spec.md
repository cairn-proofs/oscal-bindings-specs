## MODIFIED Requirements

### Requirement: ELV-001 Validate a standalone element against a named type

The implementation SHALL provide an element-validation operation. It takes an element value and an
element-type name, and returns a result that states whether the element is valid. The result lists
the failures when the element is not valid. The list covers each failure, except as [ELV-004]
permits. Each failure identifies a location and a message. The operation validates the element
against the named OSCAL type's constraints.

#### Scenario: ELV-001.01 Valid element returns a valid result

- **WHEN** the caller validates a well-formed observation element against the observation type
- **THEN** the result reports valid with no failures

#### Scenario: ELV-001.02 Invalid element returns failures

- **WHEN** the caller validates an element that violates the named type's constraints, and the
  result identifies no limit
- **THEN** the result reports invalid and lists each failing location with a message

## ADDED Requirements

### Requirement: ELV-004 A binding can limit the resources that element validation uses

A binding SHALL document each resource limit that it applies to element validation, as [PRS-010]
requires for a parse operation, and MUST NOT apply another limit. For an element over a documented
limit:

1. Over a limit that counts failures, the operation SHALL return an invalid result. [PRS-011] and
   [PRS-012] apply to its failures, with the result for the parse error and this limit for a limit
   of [PRS-010].
2. Over any other limit, the operation SHALL report an error, as [ERR-011] states.

#### Scenario: ELV-004.01 Failures over a documented failure limit

- **WHEN** a binding documents a limit of 100 failures for element validation, and the failures of
  an element give 1000 failures
- **THEN** the result reports invalid, lists 100 failures, states that the list is incomplete, and
  identifies the limit

#### Scenario: ELV-004.02 Element over a documented depth limit

- **WHEN** a binding documents a limit on the nesting depth of an element, and the caller validates
  an element that nests deeper than the limit
- **THEN** the operation reports the limit-exceeded error, and returns no valid or invalid result

#### Scenario: ELV-004.03 No undocumented limit

- **WHEN** a binding documents no limit for element validation, and the caller validates an element
  with 10,000 failures
- **THEN** the result reports invalid and lists each of the 10,000 failures
