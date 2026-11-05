# schema-versioning Specification

## Purpose

Defines how an OSCAL binding scopes its namespace to the OSCAL major version and records the exact vendored release.
Also defines how the shared spec artifacts carry a Semantic Version, with the OSCAL release held as build metadata.

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
This makes the strict-coverage boundary visible to a consumer: a binding supports the vendored release and earlier, as
the model-derivation capability states.

#### Scenario: VER-002.01 Active release is explicit

- **WHEN** more than one OSCAL release is vendored
- **THEN** the active release is the one named by the explicit identifier, not the newest directory present

#### Scenario: VER-002.02 Recorded release is discoverable

- **WHEN** a consumer inspects a binding
- **THEN** the exact OSCAL release the binding was generated from is readable

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

### Requirement: VER-006 Dependencies run from bindings to the store, never back

A binding MAY depend on the store by pinning a spec artifact. The store SHALL NOT hold content whose correctness depends
on the state of a binding. Such content includes:

1. The known defects, expected failures, or conformance results of a binding.
2. The versions that a binding supports.
3. A link to an individual issue or pull request in a binding repository.

The store MAY link the repository and the issue tracker of each known implementation. An OpenSpec change MAY name a
binding issue.

#### Scenario: VER-006.01 A corpus case carries no binding-specific data

- **WHEN** `npm run corpus:check` reads a case that has a `known-defects` field, or a corpus that has a `defect-twins`
  field
- **THEN** the check fails

#### Scenario: VER-006.02 Store content links no individual binding issue

- **WHEN** a tracked file outside `openspec/changes/` contains a link to an individual issue or pull request in a
  binding repository
- **THEN** the store checks fail

#### Scenario: VER-006.03 A listed implementation links only its repository and tracker

- **WHEN** the store lists a known implementation with a link to its repository and a link to its issue tracker
- **THEN** the store checks pass

### Requirement: VER-007 Each binding keeps its own expected conformance failures

A binding that fails a corpus case SHALL record the expected failure in its own repository. A change to that record
MUST NOT need a change or a release of the store. The corpus states the same expected result for every binding.

#### Scenario: VER-007.01 A binding fix needs no store change

- **WHEN** a binding fixes a defect that a corpus case exercises
- **THEN** the binding removes its own expected-failure entry, and the store does not change
