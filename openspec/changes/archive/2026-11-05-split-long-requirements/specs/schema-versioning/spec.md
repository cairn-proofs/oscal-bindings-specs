## MODIFIED Requirements

### Requirement: VER-003 The shared spec artifact uses Semantic Versioning for its own compatibility

The shared spec artifact SHALL carry a Semantic Version. The artifact is the prose contract, the naming manifest, and
the conformance corpus together. The major, minor, and patch components describe the compatibility of the contract
itself, independent of OSCAL's numbering:

1. A major increment marks a breaking change to the contract a binding implements.
2. A minor increment marks a backward-compatible addition.
3. A patch increment marks a fix that does not change the contract.

#### Scenario: VER-003.01 Contract break is a major increment

- **WHEN** a canonical type is renamed in the naming manifest
- **THEN** the spec artifact's major version increments

#### Scenario: VER-003.02 Corpus fixture fix is a patch increment

- **WHEN** a conformance fixture is fixed without changing any required behavior
- **THEN** the spec artifact's patch version increments

#### Scenario: VER-003.03 Stricter parse rule or changed error category is a major increment

- **WHEN** the contract makes a parse rule stricter, or changes the error category of a situation
- **THEN** the spec artifact's major version increments

#### Scenario: VER-003.04 Addition is a minor increment

- **WHEN** the spec artifact adds a corpus case, an optional capability, or newly specified behavior, and changes no
  existing contract
- **THEN** the spec artifact's minor version increments

#### Scenario: VER-003.05 Prose clarification is a patch increment

- **WHEN** the prose of a requirement becomes clearer, and no required behavior changes
- **THEN** the spec artifact's patch version increments

### Requirement: VER-004 The OSCAL release is recorded as Semantic Versioning build metadata

The spec artifact version SHALL carry the OSCAL release it describes as Semantic Versioning build metadata. Version
precedence ignores build metadata. The OSCAL release therefore records provenance without acting as a compatibility
signal. A new OSCAL release SHALL always update this build metadata. It SHALL drive a version increment only to the
degree it changes the contract. A backward-compatible OSCAL release is a minor increment. A new OSCAL major version is
a major increment.

#### Scenario: VER-004.01 OSCAL release appears as build metadata

- **WHEN** the spec artifact describes OSCAL release 1.2.3
- **THEN** the version carries `+oscal.1.2.3` as build metadata

#### Scenario: VER-004.02 Compatible OSCAL bump is a minor increment

- **WHEN** the spec moves to a backward-compatible OSCAL release that adds optional fields
- **THEN** the minor version increments and the build metadata updates to the new OSCAL release

#### Scenario: VER-004.03 New OSCAL major version is a major increment

- **WHEN** the spec moves to a new OSCAL major version with breaking changes
- **THEN** the major version increments and the build metadata updates to the new OSCAL release

#### Scenario: VER-004.04 Build metadata does not change precedence

- **WHEN** two versions are `2.4.1+oscal.1.2.3` and `2.4.1+oscal.1.2.4`
- **THEN** the two versions have the same precedence
