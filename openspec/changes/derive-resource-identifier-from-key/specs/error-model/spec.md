## MODIFIED Requirements

### Requirement: ERR-001 Error situations map to a fixed taxonomy

The implementation SHALL distinguish eight error categories. Each category is the same in each
language, whether the error is an exception, a returned result, or an error value:

1. Parse error.
2. Document-type mismatch, a subcategory of parse error.
3. Not-found.
4. Access error.
5. Unknown element type.
6. Limit exceeded.
7. Read error.
8. Builder error.

Each error situation MUST map to exactly one category. The error is then also in each ancestor of
that category, as [ERR-009] states.

#### Scenario: ERR-001.08 Same category in each surfacing style

- **WHEN** one binding raises an exception and another binding returns an error value for the same
  input that is not valid JSON
- **THEN** both bindings report the parse-error category

## ADDED Requirements

### Requirement: ERR-013 Invalid input to a back-matter builder is a builder error

Each validation error that a builder of the backmatter-builders capability reports SHALL be in the
builder-error category of [ERR-001]. It is not a parse error.

#### Scenario: ERR-013.01 Invalid hash algorithm maps to builder error

- **WHEN** the caller builds a hash with an algorithm that OSCAL does not define
- **THEN** the binding reports the builder-error category

#### Scenario: ERR-013.02 Builder error is not a parse error

- **WHEN** the caller builds a resource with a key and an identifier
- **THEN** the binding reports the builder-error category, and a test for the parse-error category
  is false
