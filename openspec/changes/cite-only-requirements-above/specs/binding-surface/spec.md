# Spec Delta

## MODIFIED Requirements

### Requirement: SRF-003 A binding records the requirement that covers each public operation

A binding SHALL keep one traceability record. The record SHALL hold one entry for each public operation, and each
operation name occurs in one entry only. The entry of a type covers the members of the type. Each entry holds one of
these:

1. The identifiers of the contract requirements that define the operation.
2. The identifier of the binding-local requirement that defines the operation.

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

### Requirement: SRF-007 The store publishes a JSON Schema for the traceability record

The store SHALL publish `openspec/traceability.schema.json`, the JSON Schema of the traceability record of [SRF-003].
The record SHALL conform to it. The spec artifact SHALL hold it. The JSON Schema SHALL constrain the record:

1. Each requirement identifier is two to five uppercase letters, a hyphen, and three digits.
2. Each entry holds contract requirement identifiers or one binding-local requirement identifier, not both.
3. No object holds a member that the JSON Schema does not define.

#### Scenario: SRF-007.01 Entry with both kinds of identifier is invalid

- **WHEN** a record entry holds a contract requirement identifier and a binding-local requirement identifier
- **THEN** the record does not conform to the JSON Schema

#### Scenario: SRF-007.02 Scenario identifier is invalid

- **WHEN** a record entry holds the scenario identifier `PRS-001.01`
- **THEN** the record does not conform to the JSON Schema

#### Scenario: SRF-007.03 Spec artifact holds the JSON Schema

- **WHEN** the store builds the spec artifact
- **THEN** the archive holds `openspec/traceability.schema.json`
