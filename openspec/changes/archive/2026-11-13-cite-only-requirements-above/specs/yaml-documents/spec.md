# Spec Delta

## MODIFIED Requirements

### Requirement: YML-001 YAML support is optional, and a binding that offers it conforms in full

This capability is optional. A binding that exposes an operation of this capability SHALL conform to each requirement
of this capability. A binding that exposes no operation of this capability conforms to the contract without these
requirements.

#### Scenario: YML-001.01 Binding without YAML

- **WHEN** a binding exposes no operation of this capability
- **THEN** the binding can conform to the contract, and it does not run the YAML corpus cases

#### Scenario: YML-001.02 Partial YAML support

- **WHEN** a binding offers the YAML parse operation and does not offer the YAML serialize operation
- **THEN** the binding does not conform

### Requirement: YML-003 A YAML document reads as a JSON value

Reading a YAML input SHALL give one JSON value:

1. A mapping gives an object. Each key MUST be a scalar, and its text is the object key. Two keys with the same text
   in one mapping are a parse error.
2. A sequence gives an array with the same items in the same order.
3. A scalar gives a string, a number, or a boolean.

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

If no type is named, the value is the text. Other text is a parse error.

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
- **THEN** parsing reports a parse error

#### Scenario: YML-004.08 Boolean location with text that is not a JSON boolean

- **WHEN** the `as-is` property of a profile merge carries the plain scalar `yes`
- **THEN** parsing reports a parse error

#### Scenario: YML-004.09 Datetime text is kept

- **WHEN** the `last-modified` property of the metadata carries the plain scalar `2024-01-02T03:04:05.1234567Z`
- **THEN** the value is the string `"2024-01-02T03:04:05.1234567Z"`, with all seven fraction digits

#### Scenario: YML-004.10 Plus sign at a number location

- **WHEN** the `start` property of a port range carries the plain scalar `+443`
- **THEN** parsing reports a parse error, because the JSON number grammar has no plus sign
