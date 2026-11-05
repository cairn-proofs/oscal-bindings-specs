## MODIFIED Requirements

### Requirement: SER-004 Round-trip equivalence uses the shared canonical form

A document that is parsed and then serialized SHALL be equivalent to the input document. Two documents are equivalent
when their canonical forms are the same bytes. The canonical form is defined in
[Canonical JSON for conformance comparison](../../../docs/canonical-json.md#rules), so that the output of each
language binding is comparable. The canonical form applies to comparison only. A binding MAY write any key order,
whitespace, or number format.

#### Scenario: SER-004.01 Parse then serialize yields an equivalent document

- **WHEN** a valid OSCAL document is parsed and then serialized
- **THEN** the canonical form of the output is the same bytes as the canonical form of the input

#### Scenario: SER-004.02 Byte differences in key order do not fail equivalence

- **WHEN** two bindings serialize the same document with different physical key order
- **THEN** both outputs are equivalent after canonical key ordering

#### Scenario: SER-004.03 Whitespace differences do not fail equivalence

- **WHEN** two bindings serialize the same document, and the outputs differ only in insignificant whitespace
- **THEN** both outputs are equivalent, because the canonical form has no whitespace between tokens
