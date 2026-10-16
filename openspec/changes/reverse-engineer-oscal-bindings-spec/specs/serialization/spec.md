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

### Requirement: SER-004 Round-trip equivalence uses the shared canonical form

A document that is parsed and then serialized SHALL be equivalent to the input document. Two documents are equivalent
when their canonical forms are the same bytes. The canonical form is defined in
[Canonical JSON for conformance comparison](../../../docs/canonical-json.md#rules). It sorts the object keys, removes
insignificant whitespace, and uses one number format, so that the output of each language binding is comparable.
The canonical form applies to comparison only. A binding MAY write any key order, whitespace, or number format.

#### Scenario: SER-004.01 Parse then serialize yields an equivalent document

- **WHEN** a valid OSCAL document is parsed and then serialized
- **THEN** the canonical form of the output is the same bytes as the canonical form of the input

#### Scenario: SER-004.02 Byte differences in key order do not fail equivalence

- **WHEN** two bindings serialize the same document with different physical key order
- **THEN** both outputs are equivalent after canonical key ordering

### Requirement: SER-005 A datetime keeps its instant and offset

Serialization of a datetime SHALL keep its instant and its timezone offset. Serialization MUST NOT convert the datetime
to another offset, and MUST NOT remove or round a significant fraction digit. A binding MAY write a zero offset as `Z`
or as `+00:00`, and MAY add or remove trailing zeros of the fractional seconds. The canonical form in
[Canonical JSON for conformance comparison](../../../docs/canonical-json.md#datetimes) treats these forms as the same.

#### Scenario: SER-005.01 Offset is kept

- **WHEN** a document with the datetime `2024-01-02T03:04:05-05:00` is parsed and serialized
- **THEN** the serialized datetime has the offset `-05:00` and the same instant

#### Scenario: SER-005.02 Zero offset and trailing zeros are equivalent

- **WHEN** a binding serializes `2024-01-02T03:04:05.120+00:00` as `2024-01-02T03:04:05.12Z`
- **THEN** the output is equivalent to the input

#### Scenario: SER-005.03 Significant fraction digits are kept

- **WHEN** a document with the datetime `2024-01-02T03:04:05.1234567Z` is parsed and serialized
- **THEN** the serialized datetime keeps all seven fraction digits
