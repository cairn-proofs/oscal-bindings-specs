# error-model Specification

## Purpose

Defines the language-neutral error taxonomy for OSCAL bindings and maps each failure situation to a category. Every
binding then reports the same conditions, even though each language surfaces errors in its own idiom.

## Requirements

### Requirement: ERR-001 Error situations map to a fixed taxonomy

The implementation SHALL distinguish these five error categories. Each category is the same in each language, whether
the language surfaces an error as an exception, a returned result, or an error value:

1. Parse error.
2. Document-type mismatch.
3. Not-found.
4. Access error.
5. Unknown element type.

Each error situation MUST map to exactly one category, except that a document-type mismatch is also a parse error.

#### Scenario: ERR-001.08 Same category in each surfacing style

- **WHEN** one binding raises an exception and another binding returns an error value for the same input that is not
  valid JSON
- **THEN** both bindings report the parse-error category

### Requirement: ERR-002 A non-raising validity check is available

The implementation SHALL offer a validity check that returns a boolean and never reports an error for invalid input. A
binding can apply a documented limit of [PRS-010] to the check, and the documentation then names the check. The check
returns true for a conformant document that is within each limit that applies to the check. It returns false for any
other input.

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

### Requirement: ERR-003 Parse errors expose structured validation detail

A schema-conformance parse error SHALL carry a structured list of the individual validation failures, each identifying
the failing location. This lets a caller present each failure, except as [PRS-012] permits, rather than only the
first. The container shape is language-specific, but the per-failure location MUST be present.

#### Scenario: ERR-003.01 Multiple failures are all exposed

- **WHEN** a document fails validation at several locations, and the parse error identifies no limit
- **THEN** the parse error exposes one structured entry per failing location

### Requirement: ERR-004 Inputs that are not a valid document are a parse error

The parse-error category of [ERR-001] SHALL apply to these inputs:

1. An input that is not valid JSON, not valid UTF-8, or not conformant to the schema.
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

### Requirement: ERR-005 A document of another type is a document-type mismatch

A typed parser that receives a document of another type SHALL report the document-type mismatch category of
[ERR-001]. The mismatch is also a parse error of [ERR-004]. Its message SHALL name the expected document type.

#### Scenario: ERR-005.01 Wrong document type maps to parse error naming the type

- **WHEN** a typed parser receives a document of another type
- **THEN** the binding reports a parse error that names the expected document type

### Requirement: ERR-006 A missing file is a not-found error

A file-path parse operation that receives a path that does not exist SHALL report the not-found category of
[ERR-001]. The error SHALL name the path. It is not a parse error.

#### Scenario: ERR-006.01 Missing file maps to not-found

- **WHEN** a file-path parse operation receives a path that does not exist
- **THEN** the binding reports the not-found category and includes the path

#### Scenario: ERR-006.02 Not-found is not a parse error

- **WHEN** a file-path parse operation receives a path that does not exist
- **THEN** the binding does not report the parse-error category

### Requirement: ERR-007 A type-restricted accessor on an unsupported document type is an access error

A type-restricted accessor that is called on a document type that it does not support SHALL report the access-error
category of [ERR-001].

#### Scenario: ERR-007.01 Wrong-type accessor maps to access error

- **WHEN** a type-restricted accessor is called on an unsupported document type
- **THEN** the binding reports the access-error category

### Requirement: ERR-008 An element type that the binding does not recognize is an unknown-element-type error

An element-validation call that names an element type that the binding does not recognize SHALL report the
unknown-element-type category of [ERR-001].

#### Scenario: ERR-008.01 Unrecognized element type maps to unknown-element-type

- **WHEN** an element-validation call names an element type the binding does not recognize
- **THEN** the binding reports the unknown-element-type category
