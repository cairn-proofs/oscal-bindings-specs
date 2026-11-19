# Spec Delta

## ADDED Requirements

### Requirement: SRF-008 The store publishes a README sticker for bindings
The store SHALL publish `docs/sticker.md`. The file holds the Markdown of a sticker for the README of a
binding. The sticker has two badges. The first badge shows the `version` member of the file
`spec-pin.json` in the repository of the binding. The second badge shows the status of a workflow of the
binding. The spec artifact SHALL hold the file.
#### Scenario: SRF-008.01 Spec artifact holds the sticker file
- **WHEN** the store builds the spec artifact
- **THEN** the archive holds `docs/sticker.md`
#### Scenario: SRF-008.02 Sticker file holds both badges
- **WHEN** a reader opens `docs/sticker.md`
- **THEN** the file holds the Markdown of the version badge and the Markdown of the status badge

### Requirement: SRF-009 A binding shows the sticker only when it meets the sticker conditions
A binding that shows the sticker of [SRF-008] MUST meet all of these conditions:
1. The binding keeps a file `spec-pin.json` at the root of its repository. The `version` member of the file
   is the spec artifact version that the binding pins, as [VER-005] defines.
2. The status badge names a workflow of the binding that runs the corpus of the pinned version.
3. The binding passes the corpus, except for its own expected conformance failures ([VER-007]).
#### Scenario: SRF-009.01 Pin file holds the pinned version
- **WHEN** a binding pins the spec artifact version `0.8.0+oscal.1.2.3`
- **THEN** the `version` member of its `spec-pin.json` is `0.8.0+oscal.1.2.3`
#### Scenario: SRF-009.02 Pin file with another version
- **WHEN** the `version` member of `spec-pin.json` differs from the spec artifact version that the binding
  pins
- **THEN** the binding does not meet the conditions
#### Scenario: SRF-009.03 Status badge names a workflow that does not run the corpus
- **WHEN** the workflow that the status badge names does not run the corpus
- **THEN** the binding does not meet the conditions
#### Scenario: SRF-009.04 Expected failure keeps the binding eligible
- **WHEN** a binding fails one corpus case that its own record lists as an expected conformance failure, and
  passes every other case
- **THEN** the binding meets condition 3
