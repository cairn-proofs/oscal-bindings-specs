## Purpose

Defines how an OSCAL binding scopes its namespace to the OSCAL major version and records the exact vendored release. Also
defines how the shared spec artifacts carry a Semantic Version, with the OSCAL release held as build metadata.

## ADDED Requirements

### Requirement: VER-001 Bindings are namespaced by OSCAL major version

A binding SHALL scope its namespace to the OSCAL major version, with no minor or patch component. For example, a `v1`
namespace covers the whole OSCAL 1.x line. OSCAL is backward-compatible within a major version, so one binding set
covers every producer of that major line. A new OSCAL major version, such as OSCAL 2.0, is the trigger for a second
version namespace. A routine minor or patch refresh MUST NOT create a new namespace.

#### Scenario: VER-001.01 Minor refresh keeps the namespace

- **WHEN** the binding refreshes from OSCAL 1.2.3 to a later 1.x release
- **THEN** the namespace stays the same major-version namespace

#### Scenario: VER-001.02 New major version adds a namespace

- **WHEN** OSCAL releases a new major version with breaking changes
- **THEN** a second version namespace is introduced for it

### Requirement: VER-002 A binding is generated from exactly one active OSCAL release

Each binding set SHALL be generated from exactly one vendored OSCAL release at a time. An explicit identifier selects the
active release, not a scan or a "newest wins" rule. The binding MUST record the exact release it was generated from. This
makes the strict-coverage boundary visible to a consumer: a binding supports the vendored release and earlier, as the
model-derivation capability states.

#### Scenario: VER-002.01 Active release is explicit

- **WHEN** more than one OSCAL release is vendored
- **THEN** the active release is the one named by the explicit identifier, not the newest directory present

#### Scenario: VER-002.02 Recorded release is discoverable

- **WHEN** a consumer inspects a binding
- **THEN** the exact OSCAL release the binding was generated from is readable

### Requirement: VER-003 The shared spec artifact uses Semantic Versioning for its own compatibility

The shared spec artifact SHALL carry a Semantic Version. The artifact is the prose contract, the naming manifest, and the
conformance corpus together. The major, minor, and patch components describe the compatibility of the contract itself,
independent of OSCAL's numbering:

1. A **major** increment marks a breaking change to the contract a port implements. Examples are a canonical type rename,
   a stricter parse rule, or a changed error category.
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

### Requirement: VER-004 The OSCAL release is recorded as Semantic Versioning build metadata

The spec artifact version SHALL carry the OSCAL release it describes as Semantic Versioning build metadata. An example is
`2.4.1+oscal.1.2.3`. Build metadata is ignored for version precedence. The OSCAL release therefore records provenance
without acting as a compatibility signal. A new OSCAL release SHALL always update this build metadata. It SHALL drive a
version increment only to the degree it changes the contract. A backward-compatible OSCAL release is a minor increment.
A new OSCAL major version is a major increment.

#### Scenario: VER-004.01 OSCAL release appears as build metadata

- **WHEN** the spec artifact describes OSCAL release 1.2.3
- **THEN** the version carries `+oscal.1.2.3` as build metadata

#### Scenario: VER-004.02 Compatible OSCAL bump is a minor increment

- **WHEN** the spec moves to a backward-compatible OSCAL release that adds optional fields
- **THEN** the minor version increments and the build metadata updates to the new OSCAL release

#### Scenario: VER-004.03 New OSCAL major version is a major increment

- **WHEN** the spec moves to a new OSCAL major version with breaking changes
- **THEN** the major version increments and the build metadata updates to the new OSCAL release

### Requirement: VER-005 Spec artifacts are distributed pinned and hash-verified

The spec artifact SHALL be distributed as a tagged archive. A consumer pins it by a recorded content hash, so a build
stays reproducible even if a tag moves. A human-readable two-axis label, carrying the OSCAL release and the spec
revision, MAY accompany the release for people. The pinned, hash-verified artifact version is the contract a consumer
builds against.

#### Scenario: VER-005.01 Consumer pins by content hash

- **WHEN** a language binding fetches the spec artifact for a given tag
- **THEN** it verifies the recorded content hash before use

#### Scenario: VER-005.02 Moved tag does not change the pinned content

- **WHEN** a tag is moved to a different commit
- **THEN** a consumer that pinned the content hash still resolves the original artifact or fails the hash check
