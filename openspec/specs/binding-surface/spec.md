# binding-surface Specification

## Purpose

Defines which public operations a binding can expose, and how a binding records the requirement that covers each one.
A binding is an
implementation of the OSCAL bindings contract in one programming language. A public operation is a function, a type, or
a member of a type that the binding exports in its public API. A contract requirement is a requirement in the main
specs of the store. A binding-local requirement is a requirement in the specs of one binding.

## Requirements

### Requirement: SRF-002 A binding-local operation adds no contract behavior

A public operation is binding-local only when all of these conditions are true:

1. It composes contract operations with language-specific adaptation only.
2. It makes no decision about which OSCAL input is accepted, what output is produced, or what errors are reported.
3. It gives no alternative behavior for an operation that a contract requirement defines.

A binding-local requirement of the binding SHALL define each binding-local operation.

#### Scenario: SRF-002.01 Language adaptation is binding-local

- **WHEN** a binding offers an asynchronous function that calls the contract parse operation and returns its result
  and its errors without change
- **THEN** the function is binding-local

#### Scenario: SRF-002.02 Input decision is not binding-local

- **WHEN** a function converts XML text to JSON before it calls the contract parse operation
- **THEN** the function is not binding-local, because it decides which OSCAL input is accepted

#### Scenario: SRF-002.03 Alternative behavior is not binding-local

- **WHEN** a function parses an OSCAL document and accepts unknown fields
- **THEN** the function is not binding-local, because it gives alternative behavior for [PRS-004]

### Requirement: SRF-010 A binding-local requirement does not use a store prefix

The identifier of a binding-local requirement MUST NOT start with a prefix that the store identifier ledger,
`openspec/spec-ids.yaml`, holds. The ledger is the one in the spec artifact version that the binding pins.

#### Scenario: SRF-010.01 Store prefix

- **WHEN** a binding defines a binding-local requirement with the identifier `PRS-101`
- **THEN** the binding does not conform, because `PRS` is a prefix in the store identifier ledger

#### Scenario: SRF-010.02 Prefix of the binding

- **WHEN** a binding defines a binding-local requirement with the identifier `PYB-001`, and the store identifier
  ledger has no prefix `PYB`
- **THEN** the identifier meets this rule

### Requirement: SRF-001 A binding exposes only operations that a requirement defines

A binding SHALL NOT expose a public operation unless one of these is true:

1. A contract requirement defines the operation.
2. The operation is binding-local, as [SRF-002] defines.

This rule does not apply to a generated model type or to its members. The generated-models capability and the naming
manifest govern them.

#### Scenario: SRF-001.01 Operation that the contract defines

- **WHEN** a binding exports a function that parses an OSCAL document from bytes
- **THEN** the binding can expose the function, because a requirement of the document-parsing capability defines it

#### Scenario: SRF-001.02 Operation with no requirement

- **WHEN** a binding exports a function that parses an XML document, and no contract requirement defines XML input
- **THEN** the binding does not conform, because the function is not binding-local under [SRF-002]

#### Scenario: SRF-001.03 Generated model type

- **WHEN** a binding exports the generated type of the Catalog document and its field accessors
- **THEN** this rule does not apply to that type or to its accessors

### Requirement: SRF-003 A binding records the requirement that covers each public operation

A binding SHALL keep one traceability record. The record SHALL hold one entry for each public operation, and each
operation name occurs in one entry only. The entry of a type covers the members of the type. Each entry holds one of
these:

1. The identifiers of the contract requirements that define it.
2. The identifier of the binding-local requirement that defines it.

A generated model type and its members have no entry. The generated-models capability and the naming manifest govern
them.

#### Scenario: SRF-003.01 Contract operation is recorded

- **WHEN** a binding exports a function that parses an OSCAL document from bytes
- **THEN** the record has an entry for the function that holds the identifier [PRS-001]

#### Scenario: SRF-003.02 Binding-local operation is recorded

- **WHEN** a binding exports a binding-local operation
- **THEN** the record has an entry for the operation that holds the identifier of its binding-local requirement

#### Scenario: SRF-003.03 Members of a type are covered by the type

- **WHEN** a binding exports the document facade type, and the type has an accessor for the assessment period
- **THEN** the entry of the facade type holds [FAC-004], and the accessor has no entry of its own

#### Scenario: SRF-003.04 Public operation without an entry

- **WHEN** a binding exports a public operation that has no entry in the record
- **THEN** the binding does not conform

#### Scenario: SRF-003.05 Generated model type

- **WHEN** a binding exports the generated type of the Catalog document
- **THEN** the record has no entry for the type, and the binding conforms

### Requirement: SRF-005 A binding-local operation that the contract defines conforms or is deprecated

A contract requirement can define an operation that a binding declares binding-local. Then the binding SHALL do one of
these in its first release that pins a spec artifact version with that requirement:

1. Make the operation conform to the contract requirement, and cite that requirement in the traceability record.
2. Deprecate the operation in its public API.

Condition 3 of [SRF-002] does not apply to a deprecated operation until the binding removes it.

#### Scenario: SRF-005.01 Promoted operation conforms

- **WHEN** a binding pins a spec artifact version that defines an operation the binding declared binding-local, and the
  operation conforms to that definition
- **THEN** the record entry of the operation holds the contract requirement identifier

#### Scenario: SRF-005.02 Promoted operation that does not conform is deprecated

- **WHEN** a binding pins a spec artifact version that defines an operation the binding declared binding-local, and the
  operation does not conform to that definition
- **THEN** the binding deprecates the operation in the same release

### Requirement: SRF-004 Contract identifiers in a traceability record resolve in the requirement index

Each contract requirement identifier in a traceability record MUST name a requirement in the requirement index of
[STO-053]. The index is the one in the spec artifact version that the binding pins. A scenario identifier or a retired
requirement identifier does not meet this rule.

#### Scenario: SRF-004.01 Live requirement resolves

- **WHEN** a record entry holds [PRS-001], and the index of the pinned version has an entry for [PRS-001]
- **THEN** the identifier resolves

#### Scenario: SRF-004.02 Retired requirement does not resolve

- **WHEN** a record entry holds the retired identifier [MDL-004]
- **THEN** the record is invalid, because the index has no entry for that identifier

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
