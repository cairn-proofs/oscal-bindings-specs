## ADDED Requirements

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
