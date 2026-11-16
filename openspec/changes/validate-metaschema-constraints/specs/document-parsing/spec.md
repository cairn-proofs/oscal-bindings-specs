# Spec Delta

## MODIFIED Requirements

### Requirement: PRS-006 Schema validation failures carry structured error detail

When parsing fails because the document does not conform to the schema, or does not meet the constraint manifest of
[CNS-017], the parse error SHALL carry structured detail about the failures. The detail SHALL cover each failure, unless
the parse error identifies a limit of [PRS-010]. A caller can then report which locations failed and why. The detail
format is language-specific, but each entry MUST identify the failing location. A later requirement states when
several entries identify the same location.

#### Scenario: PRS-006.01 Validation failure lists failing locations

- **WHEN** a document fails schema validation at two locations
- **THEN** the parse error carries one structured entry per failing location

## ADDED Requirements

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
  property and carries the `id` of a manifest entry that fails

#### Scenario: PRS-015.02 A document that fails the schema

- **WHEN** the caller parses a catalog that does not conform to the schema, and that also holds a
  property that a manifest entry rejects
- **THEN** each structured entry of the parse error is a schema failure

#### Scenario: PRS-015.03 The validity check of a document that fails a constraint

- **WHEN** the caller runs the validity check on a document that conforms to the schema and does
  not meet the constraint manifest
- **THEN** it returns false and does not surface an error
