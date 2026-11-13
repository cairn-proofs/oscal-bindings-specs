# Spec Delta

## MODIFIED Requirements

### Requirement: ELV-001 Validate a standalone element against a named type

The implementation SHALL provide an element-validation operation. It takes an element value and an
element-type name, and returns a result that states whether the element is valid. The result lists
the failures when the element is not valid. The list covers each failure, unless the result
identifies a documented limit, as [PRS-010] defines. Each failure identifies a location and a
message. The operation validates the element against the named OSCAL type's constraints.

#### Scenario: ELV-001.01 Valid element returns a valid result

- **WHEN** the caller validates a well-formed observation element against the observation type
- **THEN** the result reports valid with no failures

#### Scenario: ELV-001.02 Invalid element returns failures

- **WHEN** the caller validates an element that violates the named type's constraints, and the
  result identifies no limit
- **THEN** the result reports invalid and lists each failing location with a message
