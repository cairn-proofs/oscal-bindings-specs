# Spec Delta

## MODIFIED Requirements

### Requirement: PRS-015 A constraint failure is a parse failure that names its constraint

A parse operation SHALL report a parse error for a document that conforms to the schema and fails
the constraint manifest of [CNS-017]. The parse error SHALL carry one structured entry of [PRS-006]
for each constraint failure, so several entries can identify the same location. Each of these
entries SHALL also carry the `id` of its manifest entry and its location as the Normalized Path of
[CNS-024]. A parse error for a document that fails the schema SHALL carry no constraint failure
entry.

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

#### Scenario: PRS-015.04 The location of a constraint failure

- **WHEN** the caller parses a catalog that conforms to the schema, and the first property of the
  first control in it has a name that the manifest entry `oscal-control-prop-name` rejects
- **THEN** the structured entry with the `id` `oscal-control-prop-name` carries the location
  `$['catalog']['controls'][0]['props'][0]['name']`
