# yaml-documents Specification

## Purpose

Defines how an implementation reads an OSCAL document from YAML and writes an OSCAL document to YAML. Covers the
accepted YAML input, the type of each YAML scalar, and the YAML parse and serialize operations. Also states that YAML
support is optional for a binding.

## Requirements

### Requirement: YML-001 YAML support is optional, and a binding that offers it conforms in full

This capability is optional. A binding that exposes an operation of this capability SHALL offer these operations:

1. The YAML parse operation of [YML-005].
2. The YAML parse-from-file operation of [YML-006].
3. The YAML serialize operation of [YML-008].

That binding SHALL conform to each requirement of this capability. A binding that exposes no operation of this
capability conforms to the contract without these requirements.

#### Scenario: YML-001.01 Binding without YAML

- **WHEN** a binding exposes no operation of this capability
- **THEN** the binding can conform to the contract, and it does not run the YAML corpus cases

#### Scenario: YML-001.02 Partial YAML support

- **WHEN** a binding offers the YAML parse operation and does not offer the YAML serialize operation
- **THEN** the binding does not conform

### Requirement: YML-002 A YAML input is one YAML 1.2 document in UTF-8

A YAML input SHALL be a [YAML 1.2](https://yaml.org/spec/1.2.2/) stream in UTF-8 that holds exactly one document. A YAML
parse operation MUST report a parse error for each of these inputs:

1. Input that is not well-formed YAML 1.2.
2. A stream that holds no document or more than one document.
3. Bytes that are not valid UTF-8, as [PRS-001.03] defines for JSON input.

#### Scenario: YML-002.01 Syntax error

- **WHEN** the input has a flow sequence with no closing bracket
- **THEN** parsing reports a parse error

#### Scenario: YML-002.02 Two documents

- **WHEN** the input holds two documents that a `---` line separates
- **THEN** parsing reports a parse error

#### Scenario: YML-002.03 No document

- **WHEN** the input holds only a comment
- **THEN** parsing reports a parse error

#### Scenario: YML-002.04 Invalid encoding

- **WHEN** the caller passes bytes in UTF-16 with a byte order mark
- **THEN** parsing reports a parse error, as [PRS-001.03] requires for JSON input

### Requirement: YML-003 A YAML document reads as a JSON value

Reading a YAML input SHALL give one JSON value:

1. A mapping gives an object. Each key MUST be a scalar, and its text is the object key. Two keys with the same text
   in one mapping are a parse error.
2. A sequence gives an array with the same items in the same order.
3. A scalar gives a string, a number, or a boolean, as [YML-004] defines.
4. An alias gives a value as [YML-009] defines.

The text of a scalar is its content after YAML 1.2 processes quotes, escapes, line folding, and chomping.

#### Scenario: YML-003.01 Nested structure

- **WHEN** a YAML input holds a mapping with a sequence of mappings
- **THEN** the JSON value holds an object with an array of objects, with the same keys and the same item order

#### Scenario: YML-003.02 Key that is not a scalar

- **WHEN** a mapping in the input has a sequence as a key
- **THEN** parsing reports a parse error

#### Scenario: YML-003.03 Keys with the same text

- **WHEN** a mapping in the input holds the plain key `title` and the quoted key `"title"`
- **THEN** parsing reports a parse error

### Requirement: YML-004 The schema decides the type of each scalar

A scalar SHALL take the first type in this list that matches two conditions. A `type` keyword of the vendored schema
names the type at the location of the scalar, and the text of the scalar matches the grammar of the type.

1. A string. Each text matches.
2. A number or an integer: the number grammar of [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259#section-6).
3. A boolean: `true` or `false`.

If no type is named, the value is the text. Other text is a parse error, as [YML-010] defines.

#### Scenario: YML-004.01 Number form at a string location

- **WHEN** the `version` property of the metadata carries the plain scalar `1.0`
- **THEN** the value is the string `"1.0"`

#### Scenario: YML-004.02 Trailing zero at a string location

- **WHEN** the `value` property of a property carries the plain scalar `1.10`
- **THEN** the value is the string `"1.10"`

#### Scenario: YML-004.03 Boolean form at a string location

- **WHEN** the `title` property of the metadata carries the plain scalar `yes`
- **THEN** the value is the string `"yes"`

#### Scenario: YML-004.04 Null forms at a string location

- **WHEN** three `remarks` properties carry the plain scalar `null`, the plain scalar `~`, and an empty scalar
- **THEN** the values are the strings `"null"`, `"~"`, and `""`

#### Scenario: YML-004.05 Scalar tag at a string location

- **WHEN** the `value` property of a property carries the scalar `!!int 7`
- **THEN** the value is the string `"7"`

#### Scenario: YML-004.06 Quoted scalar at a number location

- **WHEN** the `start` property of a port range carries the quoted scalar `"443"`
- **THEN** the value is the number 443

#### Scenario: YML-004.07 Hexadecimal form at a number location

- **WHEN** the `start` property of a port range carries the plain scalar `0x1BB`
- **THEN** parsing reports a parse error, as [YML-010] defines

#### Scenario: YML-004.08 Boolean location with text that is not a JSON boolean

- **WHEN** the `as-is` property of a profile merge carries the plain scalar `yes`
- **THEN** parsing reports a parse error

#### Scenario: YML-004.09 Datetime text is kept

- **WHEN** the `last-modified` property of the metadata carries the plain scalar `2024-01-02T03:04:05.1234567Z`
- **THEN** the value is the string `"2024-01-02T03:04:05.1234567Z"`, with all seven fraction digits

#### Scenario: YML-004.10 Plus sign at a number location

- **WHEN** the `start` property of a port range carries the plain scalar `+443`
- **THEN** parsing reports a parse error, because the JSON number grammar has no plus sign

### Requirement: YML-005 Parse an OSCAL document from YAML text or bytes

The implementation SHALL provide a YAML parse operation that accepts YAML text or raw bytes, as [PRS-001] defines for
JSON input. The result SHALL be the result of the JSON parse operation for the JSON text of the input.
[PRS-010] defines the result over a documented limit. The JSON text holds the value that [YML-003] reads, with each
number written as the text of its scalar. The result includes the typed document value and each parse error of the
document-parsing capability.

#### Scenario: YML-005.01 Parse from bytes

- **WHEN** the caller passes a valid OSCAL YAML document as raw bytes
- **THEN** the operation returns the typed document value

#### Scenario: YML-005.02 Same result as the JSON parse operation

- **WHEN** a YAML input reads as the same JSON value as a JSON document
- **THEN** the YAML parse operation and the JSON parse operation return equivalent typed document values

#### Scenario: YML-005.03 Unknown field is rejected

- **WHEN** a YAML input carries a field that the vendored schema does not define
- **THEN** parsing reports a parse error, as [PRS-004] requires

#### Scenario: YML-005.04 Number text is the JSON number token

- **WHEN** the `start` property of a port range carries the plain scalar `443.0`
- **THEN** the result is the result of the JSON parse operation for a document with `"start": 443.0`

#### Scenario: YML-005.05 YAML input over a documented limit on YAML bytes

- **WHEN** a binding documents a limit on YAML input bytes, a YAML input exceeds the limit, and the JSON text of the
  input does not
- **THEN** the YAML parse operation reports a parse error, as [PRS-010] requires

### Requirement: YML-006 Parse an OSCAL document from a YAML file path

The implementation SHALL provide a YAML parse-from-file operation. The operation reads the file at a path and parses its
content as [YML-005] defines. A missing file MUST report the not-found condition of [PRS-002].

#### Scenario: YML-006.01 Parse an existing file

- **WHEN** the caller passes a path to a valid OSCAL YAML file
- **THEN** the operation returns the typed document value

#### Scenario: YML-006.02 Missing file reports not-found

- **WHEN** the caller passes a path that does not exist
- **THEN** the operation reports the not-found condition of [PRS-002]

### Requirement: YML-007 A typed YAML parser behaves as a typed JSON parser

A binding that offers YAML can also offer typed YAML parse operations. A binding that offers one SHALL offer one for
each of the eight document types. Each typed YAML parse operation SHALL parse its input as [YML-005] defines, and SHALL
then behave as [PRS-003] defines for its document type.

#### Scenario: YML-007.01 Typed YAML parser rejects the wrong type

- **WHEN** the caller calls a typed Catalog YAML parser on a Profile YAML document
- **THEN** the operation reports the type mismatch of [PRS-003.02]

#### Scenario: YML-007.02 Typed YAML parsers come as a set

- **WHEN** a binding offers a typed Catalog YAML parser
- **THEN** the binding also offers a typed YAML parser for each of the other seven document types

### Requirement: YML-008 Serialize an OSCAL document to YAML

The implementation SHALL provide a YAML serialize operation. Its output SHALL be a YAML input that [YML-002] accepts.
The JSON value that [YML-003] reads from the output MUST be equivalent to the document, as [SER-004] defines.
[SER-001], [SER-002], and [SER-005] apply to the output, and [SER-003] does not apply. The binding chooses these
properties of the output:

1. The YAML style.
2. The quoting.
3. The indentation.
4. The key order.

#### Scenario: YML-008.01 Parse then serialize yields an equivalent document

- **WHEN** a valid OSCAL YAML document is parsed and then serialized to YAML
- **THEN** the JSON value of the output has the same canonical form as the JSON value of the input

#### Scenario: YML-008.02 Number form of a string is kept

- **WHEN** a document whose metadata `version` is the string `"1.0"` is serialized to YAML and parsed again
- **THEN** the `version` is the string `"1.0"`

#### Scenario: YML-008.03 Output holds no null

- **WHEN** a document with absent optional fields is serialized to YAML
- **THEN** the output holds none of those fields

### Requirement: YML-009 Aliases, tags, and merge keys add no meaning

These YAML features SHALL NOT change the JSON value that [YML-003] reads:

1. An alias gives the value of its anchored node, read at the location of the alias. An alias inside its own anchored
   node is a parse error.
2. The tag of a node MUST NOT change its value.
3. The key `<<` is an ordinary key.

#### Scenario: YML-009.01 Alias is read at its own location

- **WHEN** the anchored scalar `&n 443` is the `start` of a port range, and the alias `*n` is the `value` of a property
- **THEN** the `start` is the number 443, and the property `value` is the string `"443"`

#### Scenario: YML-009.02 Alias inside its own anchored node

- **WHEN** a mapping anchored as `&a` holds the alias `*a`
- **THEN** parsing reports a parse error

#### Scenario: YML-009.03 Tag on a sequence

- **WHEN** a sequence of single-key mappings carries the tag `!!omap`
- **THEN** the value is an array of objects

#### Scenario: YML-009.04 Merge key

- **WHEN** the metadata holds the key `<<` with an alias to another mapping
- **THEN** `<<` is a field that the vendored schema does not define, and parsing reports a parse error

### Requirement: YML-010 A grammar error of a scalar carries the location of the scalar

A scalar whose text matches no grammar of [YML-004] SHALL be a schema-conformance failure at the location of the
scalar. The parse error SHALL carry one structured entry for that location, as [PRS-006] requires.

#### Scenario: YML-010.01 Grammar error names its location

- **WHEN** the `start` property of the first port range carries the plain scalar `0x1BB`
- **THEN** the parse error carries a structured entry that identifies the location of that `start` property
