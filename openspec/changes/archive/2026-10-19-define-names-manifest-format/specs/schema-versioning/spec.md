## MODIFIED Requirements

### Requirement: VER-003 The shared spec artifact uses Semantic Versioning for its own compatibility

The shared spec artifact SHALL carry a Semantic Version. The artifact is the prose contract, the naming manifest, and
the conformance corpus together. The major, minor, and patch components describe the compatibility of the contract
itself, independent of OSCAL's numbering:

1. A **major** increment marks a breaking change to the contract a binding implements. Examples are a canonical type
   rename, a stricter parse rule, or a changed error category.
2. A **minor** increment marks a backward-compatible addition, such as a new corpus case, a new optional capability, or
   newly specified behavior.
3. A **patch** increment marks a fix that does not change the contract, such as a corpus fixture correction or a prose
   clarification.

#### Scenario: VER-003.01 Contract break is a major increment

- **WHEN** a canonical type is renamed in the naming manifest
- **THEN** the spec artifact's major version increments

#### Scenario: VER-003.02 Corpus fixture fix is a patch increment

- **WHEN** a conformance fixture is fixed without changing any required behavior
- **THEN** the spec artifact's patch version increments
