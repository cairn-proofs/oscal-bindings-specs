## MODIFIED Requirements

### Requirement: ERR-001 Error situations map to a fixed taxonomy

The implementation SHALL distinguish these six error categories. Each category is the same in each
language, whether the language surfaces an error as an exception, a returned result, or an error
value:

1. Parse error.
2. Document-type mismatch, a subcategory of parse error.
3. Not-found.
4. Access error.
5. Unknown element type.
6. Limit exceeded.

Each error situation MUST map to exactly one category. The error is then also in each ancestor of
that category, as [ERR-009] states.

#### Scenario: ERR-001.08 Same category in each surfacing style

- **WHEN** one binding raises an exception and another binding returns an error value for the same
  input that is not valid JSON
- **THEN** both bindings report the parse-error category

## ADDED Requirements

### Requirement: ERR-009 Error categories form a tree

Each category of [ERR-001] SHALL have one parent category or none. An error in a category is also in
each ancestor of that category. In each binding, a caller can test whether an error is in a
category. The test is true for an error in that category or in a descendant of that category, and
false for any other error.

#### Scenario: ERR-009.01 An error in a subcategory is also in its parent

- **WHEN** a typed parser receives a document of another type
- **THEN** the error is in the document-type-mismatch category, and a test for the parse-error
  category is true

#### Scenario: ERR-009.02 An error in a parent is not in its subcategory

- **WHEN** a parse operation receives input that is not valid JSON
- **THEN** a test for the parse-error category is true, and a test for the document-type-mismatch
  category is false

### Requirement: ERR-010 An error can carry portable properties

A property of an error SHALL be independent of its category. An error SHALL carry each property that
the contract defines for its situation, and no other property. In each binding, a caller can test
whether an error carries a property. The properties are:

1. Limit: a documented limit of the binding stopped the operation. The property identifies the
   limit, in a binding-defined form. An error identifies a limit only when it carries this property.

#### Scenario: ERR-010.01 Same property test in each surfacing style

- **WHEN** one binding raises an exception and another binding returns an error value for a parse of
  a valid document over a documented limit
- **THEN** in both bindings, a test for the limit property is true

#### Scenario: ERR-010.02 An error within each limit carries no limit property

- **WHEN** a document fails schema validation, and no documented limit stops the parse
- **THEN** the parse error does not carry the limit property

### Requirement: ERR-011 An element over a documented limit is a limit-exceeded error

The error that [ELV-004] item 2 in the element-validation capability requires SHALL be in the
limit-exceeded category of [ERR-001]. The error SHALL carry the limit property of [ERR-010]. It is
not a parse error.

#### Scenario: ERR-011.01 Element over a documented depth limit maps to limit-exceeded

- **WHEN** a binding documents a limit on the nesting depth of an element, and the caller validates
  an element that nests deeper than the limit
- **THEN** the binding reports the limit-exceeded category, and the error carries the limit property

#### Scenario: ERR-011.02 Limit-exceeded is not a parse error

- **WHEN** a binding documents a limit on the nesting depth of an element, and the caller validates
  an element that nests deeper than the limit
- **THEN** a test for the parse-error category is false
