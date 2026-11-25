# schema-versioning Specification

## Purpose

Defines how an OSCAL binding scopes its namespace to the OSCAL major version and records the exact vendored release.
Also defines how a binding pins the spec artifact, and how a binding records its expected conformance failures.

## Requirements

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

Each binding set SHALL be generated from exactly one vendored OSCAL release at a time. An explicit identifier selects
the active release, not a scan or a "newest wins" rule. The binding MUST record the exact release it was generated from.
This makes the strict-coverage boundary visible to a consumer: a binding supports the vendored release and earlier.

#### Scenario: VER-002.01 Active release is explicit

- **WHEN** more than one OSCAL release is vendored
- **THEN** the active release is the one named by the explicit identifier, not the newest directory present

#### Scenario: VER-002.02 Recorded release is discoverable

- **WHEN** a consumer inspects a binding
- **THEN** the exact OSCAL release the binding was generated from is readable

### Requirement: VER-005 Spec artifacts are distributed pinned and hash-verified

The spec artifact SHALL be distributed as a tagged archive. The tag is `v` followed by the artifact version, for
example `v0.1.0+oscal.1.2.3`. A consumer pins the archive by a recorded content hash, so a build stays reproducible
even if a tag moves. The pinned, hash-verified artifact version is the contract a consumer builds against.

#### Scenario: VER-005.01 Consumer pins by content hash

- **WHEN** a language binding fetches the spec artifact for a given tag
- **THEN** it verifies the recorded content hash before use

#### Scenario: VER-005.02 Moved tag does not change the pinned content

- **WHEN** a tag is moved to a different commit
- **THEN** a consumer that pinned the content hash still resolves the original artifact or fails the hash check

### Requirement: VER-007 Each binding keeps its own expected conformance failures

A binding that fails a corpus case SHALL record the expected failure in its own repository. A change to that record
MUST NOT need a change or a release of the contract store. The corpus states the same expected result for every binding.

#### Scenario: VER-007.01 A binding fix needs no contract store change

- **WHEN** a binding fixes a defect that a corpus case exercises
- **THEN** the binding removes its own expected-failure entry, and the contract store does not change
