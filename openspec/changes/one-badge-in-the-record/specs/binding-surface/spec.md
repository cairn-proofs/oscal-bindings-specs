# Spec Delta

## MODIFIED Requirements

### Requirement: SRF-006 The contract store publishes a requirement index

The contract store SHALL publish `openspec/requirements.json`, generated from the main specs. It holds a format version and
one entry for each requirement, in identifier order. Each entry holds the identifier, the capability, the title, and
`corpus`. The value of `corpus` is true when a scenario of the requirement lists a corpus case in
`openspec/coverage.json`. The contract store checks MUST fail when the committed index differs from the generator output. The
spec artifact SHALL hold the index.

#### Scenario: SRF-006.01 Index entry of a requirement

- **WHEN** the main specs hold [PRS-001] in the document-parsing capability
- **THEN** the index has an entry with the identifier `PRS-001`, the capability `document-parsing`, and the title
  `Parse an OSCAL document from text or bytes`

#### Scenario: SRF-006.02 Stale index fails the contract store checks

- **WHEN** a pull request adds a requirement to the main specs and does not regenerate the index
- **THEN** the contract store checks fail

#### Scenario: SRF-006.03 Retired requirement has no entry

- **WHEN** the ledger retires a requirement identifier
- **THEN** the index has no entry for that identifier

#### Scenario: SRF-006.04 Spec artifact holds the index

- **WHEN** the contract store builds the spec artifact
- **THEN** the archive holds `openspec/requirements.json`

#### Scenario: SRF-006.05 Requirement with a corpus case

- **WHEN** a scenario of [PRS-001] lists a corpus case in `openspec/coverage.json`
- **THEN** the index entry of `PRS-001` has `corpus` true

#### Scenario: SRF-006.06 Requirement with no corpus case

- **WHEN** no scenario of a requirement lists a corpus case
- **THEN** the index entry of the requirement has `corpus` false

## REMOVED Requirements

### Requirement: SRF-008 The contract store publishes a README sticker for bindings

**Reason**: The sticker is one badge that reads the traceability record. [SRF-015] replaces this requirement.

**Migration**: A binding replaces both badges with the badge in `docs/sticker.md`, and removes `spec-pin.json`.

### Requirement: SRF-009 A binding shows the sticker only when it meets the sticker conditions

**Reason**: The conditions no longer name a workflow or a pin file. [SRF-016] replaces this requirement.

**Migration**: A binding keeps the pin in its record, and states its corpus result in the record.

## ADDED Requirements

### Requirement: SRF-020 The traceability record holds the pin, the badge and an optional corpus result

The traceability record SHALL have `format` 2, `pin`, `operations` and `badge`. The member `pin` holds `version`,
`archive` and `sha256`. The record MAY have `corpus`, which holds `cases` and `failed`. The JSON Schema of [SRF-007]
SHALL define these members.

#### Scenario: SRF-020.01 Record without a pin is invalid

- **WHEN** a record has no `pin` member
- **THEN** the record does not conform to the JSON Schema

#### Scenario: SRF-020.02 Record without a corpus result is valid

- **WHEN** a record has `format`, `pin`, `operations` and `badge`, and has no `corpus` member
- **THEN** the record conforms to the JSON Schema

### Requirement: SRF-015 The contract store publishes one README sticker for bindings

The contract store SHALL publish `docs/sticker.md`. The file holds the Markdown of one badge for the README of a binding. The
badge shows the `badge` member of the traceability record in the repository of the binding. The spec artifact SHALL
hold the file.

#### Scenario: SRF-015.01 Spec artifact holds the sticker file

- **WHEN** the contract store builds the spec artifact
- **THEN** the archive holds `docs/sticker.md`

#### Scenario: SRF-015.02 Sticker file holds one badge that reads the record

- **WHEN** a reader opens `docs/sticker.md`
- **THEN** the file holds the Markdown of one badge, and its URL reads `$.badge` from the record

### Requirement: SRF-016 A binding shows the sticker only when it meets the sticker conditions

A binding that shows the sticker of [SRF-015] MUST meet all of these conditions:

1. The `pin.version` member of its record is the spec artifact version that the binding pins, as [VER-005] defines.
2. The record passes the binding checker.
3. If the record has `corpus`, `corpus.failed` lists each case that the binding fails in the pinned corpus. This
   includes each expected conformance failure ([VER-007]).

#### Scenario: SRF-016.01 Record holds the pinned version

- **WHEN** a binding pins the spec artifact version `0.8.0+oscal.1.2.3`
- **THEN** the `pin.version` member of its record is `0.8.0+oscal.1.2.3`

#### Scenario: SRF-016.02 Record with another version

- **WHEN** `pin.version` differs from the spec artifact version that the binding pins
- **THEN** the binding does not meet the conditions

#### Scenario: SRF-016.03 Expected failure is listed

- **WHEN** a binding fails one corpus case that its own record lists as an expected conformance failure
- **THEN** `corpus.failed` holds the identifier of that case

#### Scenario: SRF-016.04 Binding without a corpus result

- **WHEN** a binding has no `corpus` member in its record
- **THEN** the binding can show the sticker, and the badge has no pass part

### Requirement: SRF-017 The badge text states the version, the traced share and the pass share

`badge` SHALL be `<version> | <T>% traced`. When the record has `corpus`, it SHALL end with ` | <P>% pass`.
`<version>` is `pin.version`. T is the number of distinct contract identifiers in the record that the index of the
pinned version marks `corpus`, divided by the number of marked index entries. P is `corpus.cases` minus the number
in `corpus.failed`, divided by `corpus.cases`. Each is a percentage rounded down to a whole number.

#### Scenario: SRF-017.01 Badge with both shares

- **WHEN** a record pins `0.8.0+oscal.1.2.3`, cites 50 of 100 marked requirements, and has `corpus` with 2 failures
  in 200 cases
- **THEN** `badge` is `0.8.0+oscal.1.2.3 | 50% traced | 99% pass`

#### Scenario: SRF-017.02 Badge without a corpus result

- **WHEN** a record has no `corpus` member
- **THEN** `badge` ends after `% traced`

#### Scenario: SRF-017.03 Identifier that the index does not mark

- **WHEN** a record cites a requirement that has `corpus` false in the index
- **THEN** the identifier does not count in T

#### Scenario: SRF-017.04 Rounding down

- **WHEN** a record cites 99 of 100 marked requirements
- **THEN** T is 99, and the badge never shows 100% for a record that misses one requirement

### Requirement: SRF-018 The binding checker writes the derived members of the record

The binding checker SHALL accept `--write`. It rewrites `badge` from the other members of the record. With
`--failed <file>`, a JSON array of case identifiers, it also rewrites `corpus` from that array and the number of cases
in the pinned corpus. It changes no other member.

#### Scenario: SRF-018.01 Write regenerates the badge

- **WHEN** a binding adds a record entry and runs the checker with `--write`
- **THEN** `badge` holds the new traced share, and the checker then reports no failure

#### Scenario: SRF-018.02 Failed cases set the corpus result

- **WHEN** a binding runs the checker with `--write --failed` and a file that holds two case identifiers
- **THEN** `corpus.failed` holds those two identifiers, and `corpus.cases` is the number of cases in the pinned corpus

#### Scenario: SRF-018.03 Other members are unchanged

- **WHEN** a binding runs the checker with `--write`
- **THEN** `pin` and `operations` have the same value as before

### Requirement: SRF-019 The hook and the install script read the pin from the record

The pre-commit hook and the install script SHALL read `pin.archive` and `pin.sha256` from the record. They SHALL need
no other setting of the pin. When the record does not exist, the install script SHALL take `--archive` and `--sha256`,
and write a record with that pin. After it writes the template files, it SHALL run the binding checker with `--write`.

#### Scenario: SRF-019.01 Pin move edits one file

- **WHEN** a binding changes `pin` in its record and runs the install script from the new archive
- **THEN** the hook verifies the new archive, and no other file holds the old pin

#### Scenario: SRF-019.02 First install writes the record

- **WHEN** a binding with no record runs the install script with `--archive` and `--sha256`
- **THEN** the script writes a record that holds that pin

#### Scenario: SRF-019.03 Install script refreshes the badge

- **WHEN** a binding runs the install script after a pin move
- **THEN** `badge` holds the version of the new pin

### Requirement: SRF-021 The binding checker checks the derived members of the record

The binding checker SHALL fail when:

1. `badge` differs from the badge text that [SRF-017] defines.
2. `corpus.cases` differs from the number of cases in the pinned corpus.
3. `corpus.failed` holds an identifier that is not a case of the pinned corpus.

#### Scenario: SRF-021.01 Stale badge fails

- **WHEN** a record entry is added and `badge` is not regenerated
- **THEN** the binding checker fails and names `badge`

#### Scenario: SRF-021.02 Corpus count of another corpus fails

- **WHEN** `corpus.cases` is 360 and the pinned corpus has 370 cases
- **THEN** the binding checker fails and names `corpus.cases`

#### Scenario: SRF-021.03 Failed identifier that is not a case fails

- **WHEN** `corpus.failed` holds an identifier that is not a case of the pinned corpus
- **THEN** the binding checker fails and names the identifier
