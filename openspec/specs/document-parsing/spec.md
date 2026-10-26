# document-parsing Specification

## Purpose

Defines how an implementation reads an OSCAL document from text or bytes into a typed document value. Covers the typed
per-document-type parsers and the strict rejection of unknown and name-keyed input.

## Requirements

### Requirement: PRS-001 Parse an OSCAL document from text or bytes

The implementation SHALL provide a parse operation that accepts an OSCAL JSON document as either text or raw bytes. It
returns a typed document value whose concrete type is one of the eight OSCAL document types. The operation MUST accept
raw bytes directly, without the caller first decoding them to text. A document from a byte-source then parses without an
extra decode step. Such byte-sources include an HTTP response body, an object-store read, and a file read.

#### Scenario: PRS-001.01 Parse from text

- **WHEN** the caller passes a valid OSCAL document as text
- **THEN** the operation returns the typed document value

#### Scenario: PRS-001.02 Parse from bytes

- **WHEN** the caller passes the same valid OSCAL document as raw bytes
- **THEN** the operation returns an equivalent typed document value

#### Scenario: PRS-001.03 Invalid encoding is a parse error

- **WHEN** the caller passes bytes that are not valid UTF-8
- **THEN** the operation reports a parse error and does not surface a lower-level decoding error

### Requirement: PRS-002 Parse an OSCAL document from a file path

The implementation SHALL provide a parse-from-file operation that reads a document from a path and returns the typed
document value. A missing file MUST report a distinct not-found condition that names the path, separate from the parse
error used for malformed content.

#### Scenario: PRS-002.01 Parse an existing file

- **WHEN** the caller passes a path to a valid OSCAL file
- **THEN** the operation returns the typed document value

#### Scenario: PRS-002.02 Missing file reports not-found

- **WHEN** the caller passes a path that does not exist
- **THEN** the operation reports a not-found condition that includes the path

### Requirement: PRS-003 Typed parsers return the matching document type or report a type mismatch

For each of the eight OSCAL document types, the implementation SHALL provide a typed parse operation. The operation
returns that document type on success. When the parsed document is a different type, the operation MUST report a parse
error that states the document is not the requested type. The typed parsers return the document wrapper, so the caller
reaches the body through the wrapper.

#### Scenario: PRS-003.01 Typed parser returns its type

- **WHEN** the caller calls the Catalog parser on a Catalog document
- **THEN** the operation returns the Catalog document wrapper

#### Scenario: PRS-003.02 Typed parser rejects the wrong type

- **WHEN** the caller calls the Catalog parser on a Profile document
- **THEN** the operation reports a parse error stating the document is not a Catalog

### Requirement: PRS-004 Unknown fields are rejected during parsing

Parsing SHALL reject any field that the vendored schema release does not define, at any depth. An implementation MUST
NOT silently ignore unknown fields. This ties the accepted input to the vendored release, consistent with the
strict-coverage rule in the model-derivation capability.

#### Scenario: PRS-004.01 Unknown field at the top level is rejected

- **WHEN** the document carries an undefined field next to a known one
- **THEN** parsing reports a parse error rather than ignoring the field

#### Scenario: PRS-004.02 Unknown nested field is rejected

- **WHEN** an undefined field appears inside a nested object
- **THEN** parsing reports a parse error

### Requirement: PRS-005 Input uses OSCAL property keys, not internal field names

OSCAL input SHALL use the OSCAL property keys, for example `media-type` and `document-ids`. A key that matches an
implementation's internal field name, but not the OSCAL property key, MUST be rejected as an unknown field. This holds
in every input mode and at every depth. This requirement states the intended behavior. A known defect in one Python
runtime drops such a key in one input mode instead of rejecting it. That defect is tracked separately and is not the
contract.

#### Scenario: PRS-005.01 OSCAL property key is accepted

- **WHEN** the document uses the OSCAL key `media-type`
- **THEN** parsing accepts it

#### Scenario: PRS-005.02 Internal field name key is rejected

- **WHEN** the document uses an internal field name in place of the OSCAL property key
- **THEN** parsing reports a parse error and does not populate the field

### Requirement: PRS-006 Schema validation failures carry structured error detail

When parsing fails because the document does not conform to the schema, the parse error SHALL carry structured detail
about each failure. A caller can then report which locations failed and why. The detail format is language-specific, but
each entry MUST identify the failing location.

#### Scenario: PRS-006.01 Validation failure lists failing locations

- **WHEN** a document fails schema validation at two locations
- **THEN** the parse error carries one structured entry per failing location

### Requirement: PRS-007 Regex patterns follow a defined portability rule

OSCAL constrains some string fields with regular-expression patterns written for an XSD-flavored engine. These include
Unicode property classes such as `\p{L}`. Target languages differ: one rejects some of these constructs, and another
needs an explicit Unicode flag. The implementation SHALL define and document how it maps each OSCAL pattern to its own
regex engine. The mapping MUST preserve the set of accepted and rejected values. A binding MUST NOT drop a pattern
constraint silently when its engine cannot express the pattern as written. It MUST translate the pattern or document the
deviation.

#### Scenario: PRS-007.01 Pattern constraint is preserved across engines

- **WHEN** an OSCAL field constrains its value with a Unicode-property pattern
- **THEN** the binding accepts the same values and rejects the same values as the OSCAL pattern defines

#### Scenario: PRS-007.02 Untranslatable pattern is documented, not dropped

- **WHEN** a target regex engine cannot express an OSCAL pattern as written
- **THEN** the binding translates it to an equivalent or documents the deviation, and does not silently remove the
  constraint

### Requirement: PRS-008 Timezone-aware datetimes are enforced where OSCAL requires them

Where OSCAL requires a timezone-qualified datetime, the implementation SHALL reject a datetime that has no timezone.
Parsing MUST keep the instant, the timezone offset, and each fraction digit of a datetime, so that serialization can
write them as the serialization capability requires.

#### Scenario: PRS-008.01 Datetime without timezone is rejected

- **WHEN** a field that OSCAL requires to be timezone-qualified carries a datetime with no timezone
- **THEN** parsing reports a parse error

### Requirement: PRS-009 Enum values are checked by the kind of the enum

Parsing SHALL check each enum value by the kind of its enum, as [MDL-011] in the model-derivation capability defines:

1. For a closed enum, parsing MUST reject a value that is not in the enum. The rejection is the parse-error category of
   [ERR-001] in the error-model capability, because the document does not conform to the schema.
2. For an open enum, parsing MUST accept a value that is not in the enum when the value is valid for the base datatype.
   Parsing MUST keep that value, so that serialization writes it unchanged.

These rules apply at every depth of the document. Element validation applies the same rules to an element.

#### Scenario: PRS-009.01 Out-of-set value of a closed enum is rejected

- **WHEN** the `how-many` property of a parameter selection carries `seven`, and the closed enum allows only `one` and
  `one-or-more`
- **THEN** parsing reports a parse error

#### Scenario: PRS-009.02 Off-list value of an open enum is accepted

- **WHEN** the `algorithm` property of a hash carries a valid string that is not in the open enum
- **THEN** parsing accepts the document, and serialization writes the same value

#### Scenario: PRS-009.03 Element validation rejects an out-of-set closed value

- **WHEN** the caller validates a parameter-selection element whose `how-many` property carries `seven`
- **THEN** the result reports invalid
