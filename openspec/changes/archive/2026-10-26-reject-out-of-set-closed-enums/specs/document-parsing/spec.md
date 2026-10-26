## ADDED Requirements

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
