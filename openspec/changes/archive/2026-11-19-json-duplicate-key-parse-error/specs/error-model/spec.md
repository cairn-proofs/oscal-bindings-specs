# Spec Delta

## MODIFIED Requirements

### Requirement: ERR-004 Inputs that are not a valid document are a parse error

The parse-error category of [ERR-001] SHALL apply to these inputs:

1. An input that is not valid JSON, not valid UTF-8, or not conformant to the schema or to the constraint manifest.
2. A YAML input that [YML-002], [YML-003], [YML-004], or [YML-009] rejects.
3. An input that exceeds a documented limit of [PRS-010].
4. A JSON input that [PRS-020] rejects.

A parse error for an input that fails the schema or the manifest carries the structured detail of [ERR-003].

#### Scenario: ERR-004.01 Malformed input maps to parse error

- **WHEN** the input is not valid JSON or carries a field the schema does not define
- **THEN** the binding reports the parse-error category

#### Scenario: ERR-004.02 Invalid YAML input maps to parse error

- **WHEN** a YAML parse operation receives input that holds two documents, or a scalar whose text does not match the
  type at its location
- **THEN** the binding reports the parse-error category

#### Scenario: ERR-004.03 Input over a documented limit maps to parse error

- **WHEN** a parse operation receives a valid document that exceeds a documented limit of [PRS-010]
- **THEN** the binding reports the parse-error category

#### Scenario: ERR-004.04 Invalid UTF-8 maps to parse error

- **WHEN** the input holds a byte sequence that is not valid UTF-8
- **THEN** the binding reports the parse-error category

#### Scenario: ERR-004.05 A constraint failure maps to parse error

- **WHEN** a parse operation receives a document that conforms to the schema, and a manifest entry gives a failure
  for it
- **THEN** the binding reports the parse-error category

#### Scenario: ERR-004.06 A duplicate key in a JSON input maps to parse error

- **WHEN** a parse operation receives a JSON input in which one object has two members with the same key
- **THEN** the binding reports the parse-error category
