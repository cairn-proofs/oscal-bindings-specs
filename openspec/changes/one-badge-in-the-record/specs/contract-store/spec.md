# Spec Delta

## MODIFIED Requirements

### Requirement: STO-053 The contract store publishes a requirement index

The contract store SHALL publish `openspec/requirements.json`, generated from the main specs. It holds a format version
and one entry for each requirement in the main specs, in identifier order. Each entry holds the identifier, the
capability, the title, and `implemented-by`. The value of `implemented-by` is that of its capability in
`openspec/spec-ids.yaml`. The contract store checks MUST fail when the committed index differs from the generator output. The spec
artifact SHALL hold the index.

#### Scenario: STO-053.01 Index entry of a requirement

- **WHEN** the main specs hold [PRS-001] in the document-parsing capability
- **THEN** the index has an entry with the identifier `PRS-001`, the capability `document-parsing`, and the title
  `Parse an OSCAL document from text or bytes`

#### Scenario: STO-053.02 Stale index fails the contract store checks

- **WHEN** a pull request adds a requirement to the main specs and does not regenerate the index
- **THEN** the contract store checks fail

#### Scenario: STO-053.03 Retired requirement has no entry

- **WHEN** the ledger retires a requirement identifier
- **THEN** the index has no entry for that identifier

#### Scenario: STO-053.04 Spec artifact holds the index

- **WHEN** the contract store builds the spec artifact
- **THEN** the archive holds `openspec/requirements.json`

#### Scenario: STO-053.05 Entry of a requirement that a binding implements

- **WHEN** the ledger gives the document-parsing capability `implemented-by` `binding`
- **THEN** the index entry of [PRS-001] has `implemented-by` `binding`

#### Scenario: STO-053.06 Entry of a requirement that the contract store implements

- **WHEN** the ledger gives the contract-store capability `implemented-by` `contract-store`
- **THEN** the index entry of [STO-053] has `implemented-by` `contract-store`

## ADDED Requirements

### Requirement: STO-059 The ledger says who implements the requirements of each capability

Each prefix entry of `openspec/spec-ids.yaml` SHALL hold `implemented-by`. The value is `binding` when a binding
implements the requirements of the capability, and `contract-store` when the contract store implements them. The
contract store checks MUST fail when a prefix entry has no `implemented-by`, or has another value.

#### Scenario: STO-059.01 Prefix entry without the flag fails

- **WHEN** a prefix entry of the ledger has no `implemented-by`
- **THEN** the contract store checks fail and name the prefix

#### Scenario: STO-059.02 New capability needs the flag

- **WHEN** a pull request adds a capability and its prefix entry has no `implemented-by`
- **THEN** the contract store checks fail

### Requirement: STO-060 The contract store publishes one README sticker for bindings

The contract store SHALL publish `docs/sticker.md`. The file holds the Markdown of one badge for the README of a
binding. The badge shows the `badge` member of the traceability record in the repository of the binding. The spec
artifact SHALL hold the file.

#### Scenario: STO-060.01 Spec artifact holds the sticker file

- **WHEN** the contract store builds the spec artifact
- **THEN** the archive holds `docs/sticker.md`

#### Scenario: STO-060.02 Sticker file holds one badge that reads the record

- **WHEN** a reader opens `docs/sticker.md`
- **THEN** the file holds the Markdown of one badge, and its URL reads `$.badge` from the record

### Requirement: STO-061 The binding checker writes the derived members of the record

The binding checker SHALL accept `--write`. It rewrites `badge` from the other members of the record. With `--results
<file>`, a JSON object with the arrays `failed` and `expected` of case identifiers, it also rewrites `corpus`, and it
sets `cases` to the number of cases in the pinned corpus. It changes no other member.

#### Scenario: STO-061.01 Write regenerates the badge

- **WHEN** a binding changes a status in its record and runs the checker with `--write`
- **THEN** `badge` holds the new shares, and the checker then reports no failure

#### Scenario: STO-061.02 Results set the corpus member

- **WHEN** a binding runs the checker with `--write --results` and a file with two failed and one expected case
- **THEN** `corpus.failed` has two identifiers, `corpus.expected` has one, and `corpus.cases` is the number of cases in
  the pinned corpus

#### Scenario: STO-061.03 Other members are unchanged

- **WHEN** a binding runs the checker with `--write`
- **THEN** `pin`, `operations` and `requirements` have the same value as before

### Requirement: STO-062 The binding checker checks the derived members of the record

The binding checker SHALL fail when:

1. `badge` differs from the text that [SRF-017] defines.
2. `corpus.cases` differs from the number of cases in the pinned corpus.
3. `failed` or `expected` holds an identifier that is not a case of the pinned corpus, or holds one case twice.
4. `requirements` breaks [SRF-016].

#### Scenario: STO-062.01 Stale badge fails

- **WHEN** a status changes and `badge` is not regenerated
- **THEN** the binding checker fails and names `badge`

#### Scenario: STO-062.02 Corpus count of another corpus fails

- **WHEN** `corpus.cases` is 360 and the pinned corpus has 370 cases
- **THEN** the binding checker fails and names `corpus.cases`

#### Scenario: STO-062.03 Identifier that is not a case fails

- **WHEN** `corpus.failed` holds an identifier that is not a case of the pinned corpus
- **THEN** the binding checker fails and names the identifier

#### Scenario: STO-062.04 Missing status fails

- **WHEN** the index gives [PRS-001] `implemented-by` `binding`, and `requirements` has no status for it
- **THEN** the binding checker fails and names `PRS-001`

### Requirement: STO-063 The hook and the install script read the pin from the record

The pre-commit hook and the install script SHALL read `pin.archive` and `pin.sha256` from the record. They SHALL need
no other setting of the pin. When the record does not exist, the install script SHALL take `--archive` and `--sha256`,
and write a record with that pin. After it writes the template files, it SHALL run the binding checker with `--write`.

#### Scenario: STO-063.01 Pin move edits one file

- **WHEN** a binding changes `pin` in its record and runs the install script from the new archive
- **THEN** the hook verifies the new archive, and no other file holds the old pin

#### Scenario: STO-063.02 First install writes the record

- **WHEN** a binding with no record runs the install script with `--archive` and `--sha256`
- **THEN** the script writes a record that holds that pin

#### Scenario: STO-063.03 Install script refreshes the badge

- **WHEN** a binding runs the install script after a pin move
- **THEN** `badge` holds the version of the new pin
