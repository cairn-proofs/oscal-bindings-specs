# Spec Delta

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

Each error situation MUST map to exactly one category.

#### Scenario: ERR-001.08 Same category in each surfacing style

- **WHEN** one binding raises an exception and another binding returns an error value for the same
  input that is not valid JSON
- **THEN** both bindings report the parse-error category
