## MODIFIED Requirements

### Requirement: ERR-001 Error situations map to a fixed taxonomy

The implementation SHALL distinguish the following error categories. The categories stay the same regardless of how a
language surfaces them, whether as an exception, a returned result, or an error value:

1. **Parse error** — the input is not valid JSON, is not valid UTF-8, or does not conform to the schema. A YAML input
   that [YML-002], [YML-003], [YML-004], [YML-009], or [YML-011] in the yaml-documents capability rejects is also a
   parse error. A schema-conformance parse error carries structured per-location detail.
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
