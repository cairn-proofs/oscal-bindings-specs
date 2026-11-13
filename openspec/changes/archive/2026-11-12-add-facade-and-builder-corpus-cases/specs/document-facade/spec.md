## MODIFIED Requirements

### Requirement: FAC-001 A uniform facade wraps any document type

The implementation SHALL provide a facade that wraps any of the eight document wrappers, or the top-level document
value. The facade exposes uniform access to the wrapper, the body, the metadata block, the OSCAL version, and the
body-level unique identifier.

#### Scenario: FAC-001.01 Facade wraps a parsed document

- **WHEN** the caller wraps a parsed Catalog document in the facade
- **THEN** the facade exposes the wrapper and the Catalog body
