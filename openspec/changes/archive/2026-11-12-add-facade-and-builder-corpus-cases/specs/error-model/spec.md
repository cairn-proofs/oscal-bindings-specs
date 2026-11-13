## MODIFIED Requirements

### Requirement: ERR-013 Invalid input to a back-matter builder is a builder error

Each validation error that a builder of the backmatter-builders capability reports SHALL be in the
builder-error category of [ERR-001]. It is not a parse error.

#### Scenario: ERR-013.01 Invalid hash algorithm maps to builder error

- **WHEN** the caller builds a hash with an algorithm that the schema rejects
- **THEN** the binding reports the builder-error category

#### Scenario: ERR-013.02 Builder error is not a parse error

- **WHEN** the caller builds a resource with a key and an identifier
- **THEN** the binding reports the builder-error category, and a test for the parse-error category
  is false
