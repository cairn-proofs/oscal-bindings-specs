## MODIFIED Requirements

### Requirement: ERR-001 Error situations map to a fixed taxonomy

The implementation SHALL distinguish the following error categories. The categories stay the same regardless of how a
language surfaces them, whether as an exception, a returned result, or an error value:

1. **Parse error** — the input is not valid JSON, is not valid UTF-8, or does not conform to the schema. A YAML input
   that [YML-002], [YML-003], [YML-004], or [YML-009] in the yaml-documents capability rejects is also a parse error.
   An input that exceeds a documented limit of [PRS-010] in the document-parsing capability is also a parse error. A
   schema-conformance parse error carries structured per-location detail.
2. **Document-type mismatch** — a typed parser received a document of a different type. This is a parse error whose
   message names the expected type.
3. **Not-found** — a file-path parse operation received a path that does not exist. This is distinct from a parse error
   and names the path.
4. **Access error** — a type-restricted accessor was called on a document type that does not support it.
5. **Unknown element type** — an element-validation call named an element type the binding does not recognize.

Each situation listed in the following scenarios MUST map to exactly one category.

#### Scenario: ERR-001.01 Malformed input maps to parse error

- **WHEN** the input is not valid JSON or carries a field the schema does not define
- **THEN** the binding reports the parse-error category

#### Scenario: ERR-001.02 Wrong document type maps to parse error naming the type

- **WHEN** a typed parser receives a document of another type
- **THEN** the binding reports a parse error that names the expected document type

#### Scenario: ERR-001.03 Missing file maps to not-found

- **WHEN** a file-path parse operation receives a path that does not exist
- **THEN** the binding reports the not-found category and includes the path

#### Scenario: ERR-001.04 Wrong-type accessor maps to access error

- **WHEN** a type-restricted accessor is called on an unsupported document type
- **THEN** the binding reports the access-error category

#### Scenario: ERR-001.05 Unrecognized element type maps to unknown-element-type

- **WHEN** an element-validation call names an element type the binding does not recognize
- **THEN** the binding reports the unknown-element-type category

#### Scenario: ERR-001.06 Invalid YAML input maps to parse error

- **WHEN** a YAML parse operation receives input that holds two documents, or a scalar whose text does not match the
  type at its location
- **THEN** the binding reports the parse-error category

#### Scenario: ERR-001.07 Input over a documented limit maps to parse error

- **WHEN** a parse operation receives a valid document that exceeds a documented limit of [PRS-010]
- **THEN** the binding reports the parse-error category

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
