## MODIFIED Requirements

### Requirement: SRF-003 A binding records the requirement that covers each public operation

A binding SHALL keep one traceability record. The record SHALL hold one entry for each public operation, and each
operation name occurs in one entry only. The entry of a type covers the members of the type. Each entry holds one of
these:

1. The identifiers of the contract requirements that define it.
2. The identifier of the binding-local requirement that defines it.

A generated model type and its members have no entry. The model-derivation capability and the naming manifest govern
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
