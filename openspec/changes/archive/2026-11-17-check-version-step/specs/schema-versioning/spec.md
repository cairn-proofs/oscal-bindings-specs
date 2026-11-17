## MODIFIED Requirements

### Requirement: VER-003 The shared spec artifact uses Semantic Versioning for its own compatibility

The shared spec artifact SHALL carry a version that follows
[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). The version MUST NOT have a pre-release label. The
artifact is the prose contract, the naming manifest, and the conformance corpus together. The artifact is the public
API of the version. Each change to the artifact is one of these kinds:

1. A break: a change that is not backward compatible with the contract a binding implements.
2. An addition: a backward-compatible addition to the contract.
3. A fix: a change that does not change the contract.

Semantic Versioning 2.0.0 gives the version increment for each kind.

#### Scenario: VER-003.01 Contract break is a major increment

- **WHEN** a canonical type is renamed in the naming manifest
- **THEN** the change is a break

#### Scenario: VER-003.02 Corpus fixture fix is a patch increment

- **WHEN** a conformance fixture is fixed without changing any required behavior
- **THEN** the change is a fix

#### Scenario: VER-003.03 Stricter parse rule or changed error category is a major increment

- **WHEN** the contract makes a parse rule stricter, or changes the error category of a situation
- **THEN** the change is a break

#### Scenario: VER-003.04 Addition is a minor increment

- **WHEN** the spec artifact adds a corpus case, an optional capability, or newly specified behavior, and changes no
  existing contract
- **THEN** the change is an addition

#### Scenario: VER-003.05 Prose clarification is a patch increment

- **WHEN** the prose of a requirement becomes clearer, and no required behavior changes
- **THEN** the change is a fix

#### Scenario: VER-003.06 Pre-release label fails the version check

- **WHEN** `VERSION` holds `1.0.0-rc.1+oscal.1.2.3`
- **THEN** the store checks fail

### Requirement: VER-004 The OSCAL release is recorded as Semantic Versioning build metadata

The spec artifact version SHALL carry the OSCAL release it describes as Semantic Versioning build metadata. Version
precedence ignores build metadata. The OSCAL release therefore records provenance without acting as a compatibility
signal. A new OSCAL release SHALL always update this build metadata. The kind of the change, as [VER-003] defines it,
depends on how the new OSCAL release changes the contract. A backward-compatible OSCAL release is an addition. A new
OSCAL major version is a break.

#### Scenario: VER-004.01 OSCAL release appears as build metadata

- **WHEN** the spec artifact describes OSCAL release 1.2.3
- **THEN** the version carries `+oscal.1.2.3` as build metadata

#### Scenario: VER-004.02 Compatible OSCAL bump is a minor increment

- **WHEN** the spec moves to a backward-compatible OSCAL release that adds optional fields
- **THEN** the change is an addition, and the build metadata updates to the new OSCAL release

#### Scenario: VER-004.03 New OSCAL major version is a major increment

- **WHEN** the spec moves to a new OSCAL major version with breaking changes
- **THEN** the change is a break, and the build metadata updates to the new OSCAL release

#### Scenario: VER-004.04 Build metadata does not change precedence

- **WHEN** two versions are `2.4.1+oscal.1.2.3` and `2.4.1+oscal.1.2.4`
- **THEN** the two versions have the same precedence

## ADDED Requirements

### Requirement: VER-008 The version is the latest release or one step above it

The store checks SHALL compare the version in `VERSION` with the latest release. The latest release is the release
tag of [VER-005] on the main branch with the highest precedence, for all OSCAL releases. The checks MUST fail unless
the version is one of these:

1. The version of the latest release, with the same build metadata.
2. The next patch, minor or major version after the latest release.

The checks MUST fail when they cannot find the latest release.

#### Scenario: VER-008.01 One step above the latest release passes

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.8.1+oscal.1.2.3`, `0.9.0+oscal.1.2.3`
  or `1.0.0+oscal.1.2.3`
- **THEN** the version meets this requirement

#### Scenario: VER-008.02 The latest release passes

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.8.0+oscal.1.2.3`
- **THEN** the version meets this requirement

#### Scenario: VER-008.03 Two steps above the latest release fail

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.10.0+oscal.1.2.3` or
  `0.9.1+oscal.1.2.3`
- **THEN** the store checks fail and name the latest release

#### Scenario: VER-008.04 A version below the latest release fails

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.7.0+oscal.1.2.3`
- **THEN** the store checks fail and name the latest release

#### Scenario: VER-008.05 The latest version with other build metadata fails

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.8.0+oscal.1.2.4`
- **THEN** the store checks fail and name the latest release

#### Scenario: VER-008.06 A release for another OSCAL release is the latest release

- **WHEN** the only release tag on the main branch is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.9.0+oscal.1.2.4`
- **THEN** the version meets this requirement

#### Scenario: VER-008.07 No release on the main branch fails the check

- **WHEN** the clone has release tags, and no release tag is on the main branch
- **THEN** the store checks fail
