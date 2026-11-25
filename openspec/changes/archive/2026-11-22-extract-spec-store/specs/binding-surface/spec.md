# Spec Delta

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: SRF-006 The store publishes a requirement index

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-053] instead of [SRF-006].

### Requirement: SRF-007 The store publishes a JSON Schema for the traceability record

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-054] instead of [SRF-007].

### Requirement: SRF-011 The spec artifact holds the binding templates

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-055] instead of [SRF-011].

### Requirement: SRF-012 The binding checker applies the identifier rules to the specs of a binding

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-056] instead of [SRF-012].

### Requirement: SRF-013 The binding checker checks the traceability record

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-057] instead of [SRF-013].

### Requirement: SRF-014 The template config follows the store config

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-058] instead of [SRF-014].
