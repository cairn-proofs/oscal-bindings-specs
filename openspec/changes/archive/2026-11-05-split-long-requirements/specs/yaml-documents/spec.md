## MODIFIED Requirements

### Requirement: YML-005 Parse an OSCAL document from YAML text or bytes

The implementation SHALL provide a YAML parse operation that accepts YAML text or raw bytes, as [PRS-001] defines for
JSON input. The result SHALL be the result of the JSON parse operation for the JSON text of the input.
[PRS-010] defines the result over a documented limit. The JSON text holds the value that [YML-003] reads, with each
number written as the text of its scalar. The result includes the typed document value and each parse error of the
document-parsing capability.

#### Scenario: YML-005.01 Parse from bytes

- **WHEN** the caller passes a valid OSCAL YAML document as raw bytes
- **THEN** the operation returns the typed document value

#### Scenario: YML-005.02 Same result as the JSON parse operation

- **WHEN** a YAML input reads as the same JSON value as a JSON document
- **THEN** the YAML parse operation and the JSON parse operation return equivalent typed document values

#### Scenario: YML-005.03 Unknown field is rejected

- **WHEN** a YAML input carries a field that the vendored schema does not define
- **THEN** parsing reports a parse error, as [PRS-004] requires

#### Scenario: YML-005.04 Number text is the JSON number token

- **WHEN** the `start` property of a port range carries the plain scalar `443.0`
- **THEN** the result is the result of the JSON parse operation for a document with `"start": 443.0`

#### Scenario: YML-005.05 YAML input over a documented limit on YAML bytes

- **WHEN** a binding documents a limit on YAML input bytes, a YAML input exceeds the limit, and the JSON text of the
  input does not
- **THEN** the YAML parse operation reports a parse error, as [PRS-010] requires
