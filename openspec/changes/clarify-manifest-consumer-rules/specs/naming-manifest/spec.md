## ADDED Requirements

### Requirement: NAM-020 A distinguishing property identifies a branch only when an object holds it

The `property` member of each variant of a `union` entry of [NAM-010] SHALL hold the distinguishing property of
[MDL-006] for that branch. The branch can define that property as optional. An object that holds no distinguishing
property can then conform to more than one branch.

#### Scenario: NAM-020.01 Object without an optional distinguishing property conforms to each branch

- **WHEN** the `CatalogGroup` entry records the distinguishing properties `groups` and `controls`, each branch defines
  its distinguishing property as optional, and a group object holds `title` and neither distinguishing property
- **THEN** the object conforms to both `CatalogGroupWithGroups` and `CatalogGroupWithControls`

### Requirement: NAM-021 Each manifest format holds its format version in the member `format`

Each manifest format SHALL be a JSON object that holds its format version in the top-level member `format`. A manifest
that is not a JSON object, or that has no `format` member, is invalid under [NAM-003].

#### Scenario: NAM-021.01 Manifest without a format version is invalid

- **WHEN** a consumer reads a manifest that is not a JSON object, or a manifest that has no `format` member
- **THEN** the consumer rejects the manifest

### Requirement: NAM-022 A consumer checks the format version before the other checks of the manifest

A consumer MUST read `format` before it checks the manifest against a JSON Schema of [NAM-004]. When the consumer does
not support the value, it MUST reject the manifest and state that the format version is not supported. A consumer MUST
apply the other checks of [NAM-003], [NAM-004], [NAM-012], and [NAM-013] only to a manifest whose format version it
supports.

#### Scenario: NAM-022.01 Consumer states the unsupported format version

- **WHEN** a consumer supports only format 1, and it reads a manifest that holds `format` 2
- **THEN** the consumer rejects the manifest and states that format 2 is not supported

#### Scenario: NAM-022.02 Format version is the first check

- **WHEN** a consumer supports only format 1, and it reads a manifest that holds `format` 2 and an unknown member
- **THEN** the consumer states that format 2 is not supported, and it reports no JSON Schema failure
