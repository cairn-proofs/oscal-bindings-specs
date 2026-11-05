## MODIFIED Requirements

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
