## MODIFIED Requirements

### Requirement: ERR-001 Error situations map to a fixed taxonomy

The implementation SHALL distinguish these seven error categories. Each category is the same in
each language, whether the language surfaces an error as an exception, a returned result, or an
error value:

1. Parse error.
2. Document-type mismatch, a subcategory of parse error.
3. Not-found.
4. Access error.
5. Unknown element type.
6. Limit exceeded.
7. Read error.

Each error situation MUST map to exactly one category. The error is then also in each ancestor of
that category, as [ERR-009] states.

#### Scenario: ERR-001.08 Same category in each surfacing style

- **WHEN** one binding raises an exception and another binding returns an error value for the same
  input that is not valid JSON
- **THEN** both bindings report the parse-error category

## ADDED Requirements

### Requirement: ERR-012 A path that cannot be read is a read error

A file-path parse operation that cannot read the file at a path SHALL report the read-error category
of [ERR-001]. The exception is a path that the platform reports as missing, which [ERR-006] covers.
Examples of a read error:

1. The caller cannot read the file or search a directory of the path.
2. The path is a directory.
3. The path holds a loop of symbolic links.
4. An I/O error occurs during the read.

The error SHALL name the path. It is not a parse error and not a not-found error.

#### Scenario: ERR-012.01 Directory maps to read error

- **WHEN** a file-path parse operation receives a path that is a directory
- **THEN** the binding reports the read-error category and includes the path

#### Scenario: ERR-012.02 File without read permission maps to read error

- **WHEN** a file-path parse operation receives a path to a file that the caller has no permission
  to read
- **THEN** the binding reports the read-error category and includes the path

#### Scenario: ERR-012.03 Read error is not a parse error or a not-found error

- **WHEN** a file-path parse operation receives a path that is a directory
- **THEN** a test for the parse-error category is false, and a test for the not-found category is
  false
