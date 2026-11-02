## MODIFIED Requirements

### Requirement: SRF-001 A binding exposes only operations that a requirement defines

A binding SHALL NOT expose a public operation unless one of these is true:

1. A contract requirement defines the operation.
2. The operation is binding-local, as [SRF-002] defines.

This rule does not apply to a generated model type or to its members. The model-derivation capability and the naming
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
