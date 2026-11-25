# Spec Delta

## MODIFIED Requirements

### Requirement: PRS-004 Unknown fields are rejected during parsing

Parsing SHALL reject any field that the vendored schema release does not define, at any depth. An implementation MUST
NOT silently ignore unknown fields. This ties the accepted input to the vendored release, as [VER-002] states.

#### Scenario: PRS-004.01 Unknown field at the top level is rejected

- **WHEN** the document carries an undefined field next to a known one
- **THEN** parsing reports a parse error rather than ignoring the field

#### Scenario: PRS-004.02 Unknown nested field is rejected

- **WHEN** an undefined field appears inside a nested object
- **THEN** parsing reports a parse error

### Requirement: PRS-009 Enum values are checked by the kind of the enum

Parsing SHALL check each enum value by the kind of its enum, as [STO-044] defines. The rules apply at every depth of
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

### Requirement: PRS-013 The root key selects the document type of the parse failures

The root key of a document type is the body field of its wrapper ([STO-037]). A parse error of the parse operation of
[PRS-001], or of an operation that the contract defines through it, SHALL meet these conditions:

1. For an object whose root keys name exactly one document type, each structured entry is a failure of that type.
2. For an input that is not an object or has no root key, the error states that the input names no OSCAL document
   type. It carries no failure of any document type.

#### Scenario: PRS-013.01 One fault gives one entry

- **WHEN** the caller parses a catalog in which the first resource link of the first resource of the back matter
  carries `media_type` in place of `media-type`
- **THEN** the parse error carries exactly one structured entry, and its location is
  `$['catalog']['back-matter']['resources'][0]['rlinks'][0]`

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
   branch ([STO-040]).
#### Scenario: PRS-014.01 Invalid closed enum in a selected parameter branch
- **WHEN** the caller parses a catalog in which the selection of the first parameter sets `how-many` to
  `seven`
- **THEN** the parse error carries exactly one structured entry, and its location is
  `$['catalog']['params'][0]['select']['how-many']`

