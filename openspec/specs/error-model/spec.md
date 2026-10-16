# error-model Specification

## Purpose

Defines the language-neutral error taxonomy for OSCAL bindings and maps each failure situation to a category. Every port
then reports the same conditions, even though each language surfaces errors in its own idiom.

## Requirements

### Requirement: ERR-001 Error situations map to a fixed taxonomy

The implementation SHALL distinguish the following error categories. The categories stay the same regardless of how a
language surfaces them, whether as an exception, a returned result, or an error value:

1. **Parse error** — the input is not valid JSON, is not valid UTF-8, or does not conform to the schema. A
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

### Requirement: ERR-002 A non-raising validity check is available

The implementation SHALL offer a validity check that returns a boolean and never reports an error for invalid input. It
returns true for a conformant document and false for any input that would otherwise produce a parse error.

#### Scenario: ERR-002.01 Valid document returns true

- **WHEN** the caller runs the validity check on a conformant document
- **THEN** it returns true

#### Scenario: ERR-002.02 Invalid document returns false without raising

- **WHEN** the caller runs the validity check on malformed input
- **THEN** it returns false and does not surface an error

### Requirement: ERR-003 Parse errors expose structured validation detail

A schema-conformance parse error SHALL carry a structured list of the individual validation failures, each identifying
the failing location. This lets a caller present every failure rather than only the first. The container shape is
language-specific, but the per-failure location MUST be present.

#### Scenario: ERR-003.01 Multiple failures are all exposed

- **WHEN** a document fails validation at several locations
- **THEN** the parse error exposes one structured entry per failing location
