# Spec Delta

## MODIFIED Requirements

### Requirement: ERR-002 A non-raising validity check is available

The implementation SHALL offer a validity check that returns a boolean and never reports an error for invalid input. A
binding can apply a documented limit of [PRS-010] to the check, and the documentation then names the check. The check
returns true for a conformant document that is within each limit that applies to the check. It returns false for any
other input. A conformant document conforms to the schema and meets the constraint manifest of [CNS-017].

#### Scenario: ERR-002.01 Valid document returns true

- **WHEN** the caller runs the validity check on a conformant document that is within each documented limit that
  applies to the validity check
- **THEN** it returns true

#### Scenario: ERR-002.02 Invalid document returns false without raising

- **WHEN** the caller runs the validity check on malformed input
- **THEN** it returns false and does not surface an error

#### Scenario: ERR-002.03 Valid document over a documented limit returns false

- **WHEN** a binding documents a limit of [PRS-010] for the validity check, and the caller runs the check on a
  conformant document over that limit
- **THEN** it returns false and does not surface an error

### Requirement: ERR-004 Inputs that are not a valid document are a parse error

The parse-error category of [ERR-001] SHALL apply to these inputs:

1. An input that is not valid JSON, not valid UTF-8, or not conformant to the schema or to the constraint manifest.
2. A YAML input that [YML-002], [YML-003], [YML-004], or [YML-009] in the yaml-documents capability rejects.
3. An input that exceeds a documented limit of [PRS-010] in the document-parsing capability.

A schema-conformance parse error carries the structured detail of [ERR-003].

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
