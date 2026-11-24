# Spec Delta

## MODIFIED Requirements

### Requirement: SRF-004 Contract identifiers in a traceability record resolve in the requirement index

Each contract requirement identifier in a traceability record MUST name a requirement in the requirement index of
[STO-053], and the entry MUST have `implemented-by` `binding`. The index is the one in the spec artifact version that
the binding pins. A scenario identifier, a retired requirement identifier, or an identifier whose entry has another
`implemented-by` does not meet this rule.

#### Scenario: SRF-004.01 Live requirement resolves

- **WHEN** a record entry holds [PRS-001], and the index of the pinned version has an entry for [PRS-001]
- **THEN** the identifier resolves

#### Scenario: SRF-004.02 Retired requirement does not resolve

- **WHEN** a record entry holds the retired identifier [MDL-004]
- **THEN** the record is invalid, because the index has no entry for that identifier

#### Scenario: SRF-004.03 Requirement that the contract store implements does not resolve

- **WHEN** a record entry holds [STO-053], and the index gives it `implemented-by` `contract-store`
- **THEN** the record is invalid

## REMOVED Requirements

### Requirement: SRF-008 The store publishes a README sticker for bindings

**Reason**: The sticker is one badge that reads the traceability record. [STO-062] replaces this requirement.

**Migration**: A binding replaces both badges with the badge in `docs/sticker.md`, and removes `spec-pin.json`.

### Requirement: SRF-009 A binding shows the sticker only when it meets the sticker conditions

**Reason**: The conditions no longer name a workflow or a pin file. [SRF-018] replaces this requirement.

**Migration**: A binding keeps the pin in its record, and states its corpus result in the record.

## ADDED Requirements

### Requirement: SRF-015 The traceability record holds the pin, the statuses, the badge and a corpus result

The traceability record SHALL have `format` 2, `pin`, `operations`, `requirements` and `badge`. The member `pin` holds
`version`, `archive` and `sha256`. The member `requirements` maps requirement identifiers to statuses. The record MAY
have `corpus`, which holds `cases`, `failed` and `expected`. The JSON Schema of [STO-054] SHALL define these members.

#### Scenario: SRF-015.01 Record without a pin is invalid

- **WHEN** a record has no `pin` member
- **THEN** the record does not conform to the JSON Schema

#### Scenario: SRF-015.02 Record without a corpus result is valid

- **WHEN** a record has `format`, `pin`, `operations`, `requirements` and `badge`, and has no `corpus` member
- **THEN** the record conforms to the JSON Schema

### Requirement: SRF-016 Each requirement that a binding implements has a status in the record

The member `requirements` SHALL hold one status for each requirement that the requirement index of the pinned version
gives `implemented-by` `binding`, and for no other requirement. A status is `implemented` or `not-implemented`. A requirement that an
operation entry cites MUST have the status `implemented`.

#### Scenario: SRF-016.01 Every binding requirement has a status

- **WHEN** the index of the pinned version gives 100 requirements `implemented-by` `binding`
- **THEN** `requirements` holds 100 statuses

#### Scenario: SRF-016.02 Requirement that the contract store implements has no status

- **WHEN** `requirements` holds a status for [STO-053], and the index gives it `implemented-by` `contract-store`
- **THEN** the record is invalid

#### Scenario: SRF-016.03 Cited requirement is implemented

- **WHEN** an operation entry cites [PRS-001], and `requirements` gives `PRS-001` the status `not-implemented`
- **THEN** the record is invalid

### Requirement: SRF-017 The badge text states the version, the implemented share and the pass share

`badge` SHALL be `<version> | <I>% implemented`. When the record has `corpus`, it SHALL continue with ` | <P>% pass`,
and, when `expected` is not empty, with ` (<N> expected failures)`. `<version>` is `pin.version`. I is the number of
statuses `implemented`, divided by the number of statuses. P is `cases` minus the lengths of `failed` and `expected`,
divided by `cases` minus the length of `expected`, and 100 when that difference is 0. Each share is rounded down to a
whole percentage.

#### Scenario: SRF-017.01 Badge with both shares

- **WHEN** a record pins `0.8.0+oscal.1.2.3`, has 90 of 100 statuses `implemented`, and `corpus` with 200 cases, 2 failed
  and 0 expected
- **THEN** `badge` is `0.8.0+oscal.1.2.3 | 90% implemented | 99% pass`

#### Scenario: SRF-017.02 Badge without a corpus result

- **WHEN** a record has no `corpus` member
- **THEN** `badge` ends after `% implemented`

#### Scenario: SRF-017.03 Expected failures leave the pass share and stay visible

- **WHEN** `corpus` has 200 cases, 0 failed and 4 expected
- **THEN** the pass part of `badge` is `100% pass (4 expected failures)`

#### Scenario: SRF-017.04 Rounding down

- **WHEN** 99 of 100 statuses are `implemented`
- **THEN** I is 99, and `badge` never shows 100% for a record that has a `not-implemented` status

### Requirement: SRF-018 A binding shows the sticker only when it meets the sticker conditions

A binding that shows the sticker of [STO-062] MUST meet all of these conditions:

1. `pin.version` of its record is the spec artifact version that the binding pins, as [VER-005] defines.
2. The record passes the binding checker.
3. If the record has `corpus`, `failed` lists each case that the binding fails in the pinned corpus and that is not an
   expected failure. `expected` lists each expected conformance failure of the binding ([VER-007]).

#### Scenario: SRF-018.01 Record holds the pinned version

- **WHEN** a binding pins the spec artifact version `0.8.0+oscal.1.2.3`
- **THEN** the `pin.version` member of its record is `0.8.0+oscal.1.2.3`

#### Scenario: SRF-018.02 Record with another version

- **WHEN** `pin.version` differs from the spec artifact version that the binding pins
- **THEN** the binding does not meet the conditions

#### Scenario: SRF-018.03 Expected failure is listed

- **WHEN** a binding fails one corpus case that its own record of expected failures lists
- **THEN** `corpus.expected` holds the identifier of that case

#### Scenario: SRF-018.04 Binding without a corpus result

- **WHEN** a binding has no `corpus` member in its record
- **THEN** the binding can show the sticker, and the badge has no pass part
