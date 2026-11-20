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

### Requirement: PRS-020 A JSON object has no two members with the same key

A parse operation of [PRS-001], or an operation that the contract defines through it, SHALL report a parse error when
one object in a JSON input has two members with the same key. Two keys are the same when their text is the same after
the JSON escapes in them are decoded. The operation MUST NOT keep one of the members and drop the other. The validity
check of [ERR-002] returns false for such an input.

#### Scenario: PRS-020.01 Two members with the same key

- **WHEN** a JSON input holds an object with two members that both have the key `name`
- **THEN** the operation reports a parse error and does not return a document value

#### Scenario: PRS-020.02 Keys that differ only in an escape

- **WHEN** a JSON input holds an object with the key `name` and, in the same object, the key `\u006eame`
- **THEN** the operation reports a parse error and does not return a document value

#### Scenario: PRS-020.03 The validity check of a duplicate key

- **WHEN** the caller runs the validity check on a JSON input in which one object has two members with the same key,
  and the input is otherwise a conformant document
- **THEN** it returns false and does not surface an error

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
in every input mode and at every depth.

#### Scenario: PRS-005.01 OSCAL property key is accepted

- **WHEN** the document uses the OSCAL key `media-type`
- **THEN** parsing accepts it

#### Scenario: PRS-005.02 Internal field name key is rejected

- **WHEN** the document uses an internal field name in place of the OSCAL property key
- **THEN** parsing reports a parse error and does not populate the field

### Requirement: PRS-007 Regex patterns follow a defined portability rule

OSCAL writes some string patterns for an XSD-flavored regex engine, for example with the Unicode property class
`\p{L}`. The implementation SHALL define and document how it maps each OSCAL pattern to its own regex engine. The
mapping MUST preserve the set of accepted and rejected values. When its engine cannot express a pattern as written, a
binding MUST translate the pattern or document the deviation. It MUST NOT drop the pattern constraint silently.

#### Scenario: PRS-007.01 Pattern constraint is preserved across engines

- **WHEN** an OSCAL field constrains its value with a Unicode-property pattern
- **THEN** the binding accepts the same values and rejects the same values as the OSCAL pattern defines

#### Scenario: PRS-007.02 Untranslatable pattern is documented, not dropped

- **WHEN** a target regex engine cannot express an OSCAL pattern as written
- **THEN** the binding translates it to an equivalent or documents the deviation, and does not silently remove the
  constraint

#### Scenario: PRS-007.03 Engine that needs a Unicode flag

- **WHEN** the regex engine of a binding matches `\p{L}` only with an explicit Unicode flag
- **THEN** the mapped pattern accepts the same values and rejects the same values as the OSCAL pattern defines

### Requirement: PRS-008 Timezone-aware datetimes are enforced where OSCAL requires them

Where OSCAL requires a timezone-qualified datetime, the implementation SHALL reject a datetime that has no timezone.
Parsing MUST keep the instant, the timezone offset, and each fraction digit of a datetime, so that serialization can
write them as the serialization capability requires.

#### Scenario: PRS-008.01 Datetime without timezone is rejected

- **WHEN** a field that OSCAL requires to be timezone-qualified carries a datetime with no timezone
- **THEN** parsing reports a parse error

### Requirement: PRS-009 Enum values are checked by the kind of the enum

Parsing SHALL check each enum value by the kind of its enum, as [MDL-011] defines. The rules apply at every depth of
the document. Element validation applies the same rules to an element.

1. For a closed enum, parsing MUST reject a value that is not in the enum, with a parse error of [ERR-001].
2. For an open enum, parsing MUST accept a value that is not in the enum when the value is valid for the base datatype.
   Parsing MUST keep that value, so that serialization writes it unchanged.

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

### Requirement: PRS-010 A binding can limit the resources that a parse uses

A binding SHALL document each resource limit that it applies to a parse operation, with what the limit measures and
the operations that it applies to. A parse operation is one of these:

1. An operation of this capability.
2. An operation that the contract defines through a parse operation.

An input over a documented limit SHALL be a parse error that identifies the limit, also when the input conforms to the
schema. A binding MUST NOT reject an input for a limit that it does not document.

#### Scenario: PRS-010.01 Valid input over a documented size limit

- **WHEN** a binding documents a limit on the bytes of a JSON input, and the caller passes a valid document larger
  than the limit
- **THEN** parsing reports a parse error that identifies the limit

#### Scenario: PRS-010.02 Nesting over a documented depth limit

- **WHEN** a binding documents a limit on the nesting depth of a JSON input, and the input nests arrays deeper than the
  limit
- **THEN** parsing reports a parse error that identifies the limit

#### Scenario: PRS-010.03 Alias expansion over a documented limit

- **WHEN** aliases in a YAML input expand to more nodes than the documented limit of the binding
- **THEN** the YAML parse operation reports a parse error that identifies the limit

#### Scenario: PRS-010.04 No undocumented limit

- **WHEN** a binding documents no limit that a valid document of 50 MiB exceeds, and the caller passes that document
- **THEN** the operation returns the typed document value

### Requirement: PRS-006 Schema validation failures carry structured error detail

When a document fails the schema or the constraint manifest of [CNS-017], the parse error SHALL carry structured detail about the failures. The detail SHALL cover each failure, unless
the parse error identifies a limit of [PRS-010]. A caller can then report which locations failed and why. The detail
format is language-specific, but each entry MUST identify the failing location. A later requirement states when
several entries identify the same location.

#### Scenario: PRS-006.01 Validation failure lists failing locations

- **WHEN** a document fails schema validation at two locations
- **THEN** the parse error carries one structured entry per failing location

### Requirement: PRS-011 A binding can limit the structured entries of a parse error

A binding can document a limit of [PRS-010] that counts the failures of a document. That limit SHALL count the
structured entries of the parse error of [PRS-006], and SHALL be 100 or more. When the failures give more entries than
the limit, the parse error SHALL carry as many entries as the limit.

#### Scenario: PRS-011.01 Failures over a documented entry limit

- **WHEN** a binding documents a limit of 100 entries, and the failures of a document give 1000 entries
- **THEN** the parse error carries 100 structured entries, states that the list is incomplete, and identifies the limit

#### Scenario: PRS-011.02 Failures within the entry limit

- **WHEN** a binding documents a limit of 100 entries, and the failures of a document give 99 entries
- **THEN** the parse error carries the 99 entries, and does not state that the list is incomplete

#### Scenario: PRS-011.03 Failures at the entry limit

- **WHEN** a binding documents a limit of 100 entries, and the failures of a document give exactly 100 entries
- **THEN** the parse error carries the 100 entries, and it can identify the limit and state that the list is
  incomplete

### Requirement: PRS-012 A parse error carries each entry or 100 entries or more

A parse error that carries structured entries of [PRS-006] can carry entries for only some of the failures. It SHALL
then meet each of these conditions:

1. It carries 100 entries or more.
2. It identifies a limit of [PRS-010].
3. It states that the list of entries is incomplete.

A parse error that identifies no limit SHALL NOT state that the list is incomplete. A parse error over a limit of
[PRS-010] can also carry no structured entries.

#### Scenario: PRS-012.01 Document with 101 failing locations

- **WHEN** a document fails schema validation at 101 locations, and each failure gives one structured entry or more
- **THEN** the parse error carries 100 structured entries or more

#### Scenario: PRS-012.02 Short list from a limit

- **WHEN** a binding documents a limit on validation time, the limit stops a parse after 10 entries, and the failures
  of the document give 200 entries
- **THEN** the parse error identifies the limit and carries no structured entries, or carries 100 entries or more and
  states that the list is incomplete

#### Scenario: PRS-012.03 Byte limit on an invalid document

- **WHEN** a binding documents a limit on the bytes of a JSON input, and an invalid document with 200 failing locations
  is larger than the limit
- **THEN** parsing reports a parse error that identifies the limit and carries no structured entries

### Requirement: PRS-013 The root key selects the document type of the parse failures

The root key of a document type is the body field of its wrapper ([MDL-002]). A parse error of the parse operation of
[PRS-001], or of an operation that the contract defines through it, SHALL meet these conditions:

1. For an object whose root keys name exactly one document type, each structured entry is a failure of that type.
2. For an input that is not an object or has no root key, the error states that the input names no OSCAL document
   type. It carries no failure of any document type.

#### Scenario: PRS-013.01 One fault gives one entry

- **WHEN** the caller parses a catalog in which one resource link carries `media_type` in place of `media-type`
- **THEN** the parse error carries exactly one structured entry, and the entry identifies that resource link

#### Scenario: PRS-013.02 An object with no root key

- **WHEN** the caller parses an object whose only key is `not-an-oscal-document`
- **THEN** the parse error states that the input names no OSCAL document type, and it carries no failure of any
  document type

### Requirement: PRS-014 A distinguishing property selects the nested-union branch of parse failures
A parse error of [PRS-001] SHALL meet this condition when its document root names exactly one
 document type. The condition also applies to an operation that the contract defines through a
parse operation.
1. If an object holds the distinguishing property of exactly one nested-union branch, that object
   selects the branch. Each structured entry for a failure of the object is a failure of that
   branch ([NAM-020]).
#### Scenario: PRS-014.01 Invalid closed enum in a selected parameter branch
- **WHEN** the caller parses a catalog in which a parameter selection sets `how-many` to
  `seven`
- **THEN** the parse error carries exactly one structured entry, and the entry identifies that
  parameter selection

### Requirement: PRS-015 A constraint failure is a parse failure that names its constraint

A parse operation SHALL report a parse error for a document that conforms to the schema and does
not meet the constraint manifest of [CNS-017]. The parse error SHALL carry one structured entry
of [PRS-006] for each constraint failure, so several entries can identify the same location. Each
of these entries SHALL also carry the `id` of the manifest entry that fails. A parse error for a
document that does not conform to the schema SHALL carry no entry for a constraint failure.

#### Scenario: PRS-015.01 A document that fails one constraint

- **WHEN** the caller parses a catalog that conforms to the schema, and a control in it holds a
  property of the OSCAL namespace with the name `priority`
- **THEN** the parse operation reports a parse error, and each structured entry identifies the
  `name` of the property and carries the `id` of a manifest entry that fails

#### Scenario: PRS-015.02 A document that fails the schema

- **WHEN** the caller parses a catalog that does not conform to the schema, and that also holds a
  property that a manifest entry rejects
- **THEN** each structured entry of the parse error is a schema failure

#### Scenario: PRS-015.03 The validity check of a document that fails a constraint

- **WHEN** the caller runs the validity check on a document that conforms to the schema and does
  not meet the constraint manifest
- **THEN** it returns false and does not surface an error

### Requirement: PRS-016 The patterns of the schema decide a value, not its format keyword

The implementation SHALL decide the validity of a value with the patterns of the schema. It MUST NOT
accept or reject a value because of the `format` keyword of the schema alone. Other requirements of
this capability add rules for the datatypes `DateTimeWithTimezoneDatatype`, `URIDatatype`,
`URIReferenceDatatype` and `EmailAddressDatatype`. A value that fails such a rule does not conform
to the schema. Element validation and the builders apply the same rules.

#### Scenario: PRS-016.01 A value that the pattern accepts and a format check rejects

- **WHEN** the caller parses a catalog in which a party has the email address `a@b`
- **THEN** parsing accepts the document

#### Scenario: PRS-016.02 A date-time value that the pattern rejects

- **WHEN** the caller parses a catalog whose `last-modified` is `2026-01-01T00:00:00z`
- **THEN** parsing reports a parse error

#### Scenario: PRS-016.03 A datatype fault and a constraint fault

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `a b`, and a property of
  the OSCAL namespace in the metadata has the name `priority`
- **THEN** each structured entry of the parse error is a schema failure, and none carries the `id`
  of a manifest entry

### Requirement: PRS-019 A date-time value matches the grammar of RFC 3339

A value of `DateTimeWithTimezoneDatatype` SHALL match the production `date-time` of RFC 3339. The
pattern of the schema also applies. Parsing MUST reject a value that does not match, with a parse
error of [ERR-001]. The implementation MUST NOT change a value so that the value matches.

#### Scenario: PRS-019.01 A date-time with a two-digit year

- **WHEN** the caller parses a catalog whose `last-modified` is `19-02-29T00:00:00Z`
- **THEN** parsing reports a parse error

### Requirement: PRS-017 A URI value matches the grammar of RFC 3986

A value of `URIDatatype` SHALL match the production `URI` of RFC 3986. A value of
`URIReferenceDatatype` SHALL match the production `URI-reference`. The pattern of the schema also
applies. Parsing MUST reject a value that does not match, with a parse error of [ERR-001]. The
implementation MUST NOT change a value so that the value matches.

#### Scenario: PRS-017.01 A reference with a space

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `a b`
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.02 A reference with an invalid escape

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `%zz`
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.03 A reference with an unclosed host bracket

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `http://[x`
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.04 A reference with a trailing space

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `#a` followed by a space
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.05 A reference with a control character

- **WHEN** the caller parses a catalog in which the `href` of an rlink is the text `java`, a tab
  character and the text `script:alert(1)`
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.06 A URI with a space

- **WHEN** the caller parses a catalog in which the `ns` of a property is `http://exa mple.org`
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.07 A valid reference is accepted and kept

- **WHEN** the `href` values of the rlinks of a catalog are `#a`, `../x`, `a%20b`, `./a:b`, `//h/p`,
  `?q`, `https://example.org/a`, `ftp://u:pw@h:21/x`, `http://[::1]/` and the empty string, and the
  `ns` values of two properties are `https://example.org/ns` and `urn:example:ns`
- **THEN** parsing accepts the document, and serialization writes the same values

#### Scenario: PRS-017.08 Element validation rejects a reference with a space

- **WHEN** the caller validates a back-matter element in which the `href` of an rlink is `a b`
- **THEN** the result reports invalid

#### Scenario: PRS-017.09 A builder rejects a reference with a space

- **WHEN** the caller builds an rlink with the `href` `a b`
- **THEN** the builder reports a validation error

#### Scenario: PRS-017.10 A reference with a non-ASCII character

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `http://é.example/`
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.11 A reference with a backslash

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `/a\b`
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.12 A reference with a trailing line feed

- **WHEN** the caller parses a catalog in which the `href` of an rlink is `#a` followed by a line
  feed character
- **THEN** parsing reports a parse error

#### Scenario: PRS-017.13 A URI with nothing after the scheme

- **WHEN** the caller parses a catalog in which the `ns` of a property is `http:`
- **THEN** parsing reports a parse error

### Requirement: PRS-018 An email address holds no control character

A value of `EmailAddressDatatype` SHALL match the pattern of the schema. It MUST NOT hold an ASCII
control character, which is a character from U+0000 to U+001F or the character U+007F.
Parsing MUST reject a value that holds one, with a parse error of [ERR-001]. The implementation
MUST NOT apply another rule for the format of an email address.

#### Scenario: PRS-018.01 An address with a control character

- **WHEN** the caller parses a catalog in which a party has the email address `a@b`, the character
  U+0001 and `.org`, in this order
- **THEN** parsing reports a parse error

#### Scenario: PRS-018.02 An address with international characters

- **WHEN** the caller parses a catalog in which a party has the email address `用户@例子.广告`
- **THEN** parsing accepts the document

#### Scenario: PRS-018.03 An address with the delete character

- **WHEN** the caller parses a catalog in which a party has the email address `a@b`, the character
  U+007F and `.org`, in this order
- **THEN** parsing reports a parse error
