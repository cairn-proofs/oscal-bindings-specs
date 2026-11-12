## MODIFIED Requirements
### Requirement: ELV-002 Element-type names are kebab-case and derived from the type names
The element-type names SHALL be the kebab-case forms of the canonical type names from the model-derivation capability.
Each type of the naming manifest SHALL have an element-type name, whatever its kind of [NAM-010]. For example, the
back-matter type has the element-type name `back-matter`, the `Parameter` union has `parameter`, and the
`HashAlgorithm` enum has `hash-algorithm`. The implementation SHALL provide an operation that returns the full sorted
list of supported element-type names.
#### Scenario: ELV-002.01 Supported types are listed
- **WHEN** the caller requests the supported element types
- **THEN** the operation returns a list that holds the element-type name of each type of the naming manifest, and no
  other name, in code-point order
#### Scenario: ELV-002.02 A canonical type name maps to its kebab-case element type
- **WHEN** a canonical type name is a multi-word PascalCase name
- **THEN** its element-type name is the kebab-case form of that name
