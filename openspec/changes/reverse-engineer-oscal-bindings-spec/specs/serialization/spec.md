## Purpose

Defines how an implementation writes a typed OSCAL document back to OSCAL JSON. Covers the no-null rule, OSCAL property
keys, the pretty and compact forms, and the round-trip equivalence contract that conformance checks against.

## ADDED Requirements

### Requirement: SER-001 Serialization emits OSCAL property keys

Serialization SHALL write OSCAL property keys (for example `media-type`), not an implementation's internal field names.
This MUST hold on every serialization path the binding exposes, so that a document serialized through any path is valid
OSCAL.

#### Scenario: SER-001.01 Output uses OSCAL keys

- **WHEN** a document is serialized
- **THEN** each property appears under its OSCAL key, such as `media-type`

#### Scenario: SER-001.02 All serialization paths agree

- **WHEN** the same document is serialized through two different paths the binding offers
- **THEN** both produce OSCAL property keys

### Requirement: SER-002 Serialization never emits null

Serialization SHALL omit any field whose value is absent rather than writing a null, because OSCAL forbids null. An unset
optional field MUST be absent from the output, and no option MAY cause a null to be written.

#### Scenario: SER-002.01 Absent optional field is omitted

- **WHEN** an optional field has no value
- **THEN** the field does not appear in the output

#### Scenario: SER-002.02 No path writes null

- **WHEN** a document with absent optional fields is serialized through any path
- **THEN** the output contains no null values

### Requirement: SER-003 Pretty output by default, compact output on request

Serialization SHALL produce human-readable, indented output by default, and MUST offer a compact (unindented) form on
request. Both forms represent the same document and differ only in whitespace.

#### Scenario: SER-003.01 Default is indented

- **WHEN** a document is serialized with default options
- **THEN** the output is indented for readability

#### Scenario: SER-003.02 Compact form on request

- **WHEN** the caller requests compact output
- **THEN** the output has no insignificant whitespace and represents the same document

### Requirement: SER-004 Round-trip equivalence is semantic, with canonical key order

A document that is parsed and then serialized SHALL be equivalent to its canonical form. Equivalence is defined as
semantic JSON equality under a canonical key order, not byte-for-byte identity, because key order and number formatting
differ across language serializers. The implementation SHALL define the canonical key order and the number formatting it
uses, so that conformance output is comparable across languages.

#### Scenario: SER-004.01 Parse then serialize yields the canonical form

- **WHEN** a valid OSCAL document is parsed and then serialized
- **THEN** the output equals the document's canonical form under semantic JSON equality

#### Scenario: SER-004.02 Byte differences in key order do not fail equivalence

- **WHEN** two bindings serialize the same document with different physical key order
- **THEN** both outputs are equivalent after canonical key ordering

### Requirement: SER-005 Datetime round-trip behavior is defined

Serialization of a timezone-qualified datetime SHALL follow the round-trip rule the parsing capability defines. The
implementation MUST state whether the serialized datetime preserves the original offset or normalizes it, so that a
conformance fixture can assert the correct output.

#### Scenario: SER-005.01 Serialized datetime matches the declared round-trip rule

- **WHEN** a document with a timezone-qualified datetime is parsed and serialized
- **THEN** the serialized datetime follows the binding's declared offset-preservation or normalization rule
