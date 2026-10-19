## MODIFIED Requirements

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
