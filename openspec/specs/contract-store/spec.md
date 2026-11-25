# contract-store Specification

## Purpose
Defines what the contract store builds, publishes and checks: the spec artifact and its version, the vendored
metaschema, the constraint manifest, the naming manifest and the rules that derive it, the conformance corpus rules, the
requirement index, the traceability record JSON Schema, and the binding templates. A requirement in this capability
applies to the contract store. It does not apply to a binding.

## Requirements

### Requirement: STO-001 The shared spec artifact uses Semantic Versioning for its own compatibility

The shared spec artifact SHALL carry a version that follows
[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). The version MUST NOT have a pre-release label. The
artifact is the prose contract, the naming manifest, and the conformance corpus together. The artifact is the public
API of the version. Each change to the artifact is a break, an addition or a fix, and Semantic Versioning 2.0.0 gives
the version increment for each kind.

#### Scenario: STO-001.01 Renamed canonical type is a break

- **WHEN** a canonical type is renamed in the naming manifest
- **THEN** the change is a break

#### Scenario: STO-001.02 Corpus fixture fix is a fix

- **WHEN** a conformance fixture is fixed without changing any required behavior
- **THEN** the change is a fix

#### Scenario: STO-001.03 Stricter parse rule or changed error category is a break

- **WHEN** the contract makes a parse rule stricter, or changes the error category of a situation
- **THEN** the change is a break

#### Scenario: STO-001.04 Addition to the contract is an addition

- **WHEN** the spec artifact adds a corpus case, an optional capability, or newly specified behavior, and changes no
  existing contract
- **THEN** the change is an addition

#### Scenario: STO-001.05 Prose clarification is a fix

- **WHEN** the prose of a requirement becomes clearer, and no required behavior changes
- **THEN** the change is a fix

#### Scenario: STO-001.06 Pre-release label fails the version check

- **WHEN** `VERSION` holds `1.0.0-rc.1+oscal.1.2.3`
- **THEN** the contract store checks fail

### Requirement: STO-002 The OSCAL release is recorded as Semantic Versioning build metadata

The spec artifact version SHALL carry the OSCAL release it describes as Semantic Versioning build metadata. Version
precedence ignores build metadata. The OSCAL release therefore records provenance without acting as a compatibility
signal. A new OSCAL release SHALL always update this build metadata. The kind of the change, as [STO-001] defines it,
depends on how the new OSCAL release changes the contract. A backward-compatible OSCAL release is an addition. A new
OSCAL major version is a break.

#### Scenario: STO-002.01 OSCAL release appears as build metadata

- **WHEN** the spec artifact describes OSCAL release 1.2.3
- **THEN** the version carries `+oscal.1.2.3` as build metadata

#### Scenario: STO-002.02 Compatible OSCAL release is an addition

- **WHEN** the spec moves to a backward-compatible OSCAL release that adds optional fields
- **THEN** the change is an addition, and the build metadata updates to the new OSCAL release

#### Scenario: STO-002.03 New OSCAL major version is a break

- **WHEN** the spec moves to a new OSCAL major version with breaking changes
- **THEN** the change is a break, and the build metadata updates to the new OSCAL release

#### Scenario: STO-002.04 Build metadata does not change precedence

- **WHEN** two versions are `2.4.1+oscal.1.2.3` and `2.4.1+oscal.1.2.4`
- **THEN** the two versions have the same precedence

### Requirement: STO-003 Dependencies run from bindings to the contract store, never back

A binding MAY pin a spec artifact of the contract store. The contract store SHALL NOT hold content whose correctness
depends on the state of a binding. It includes:

1. The known defects, expected failures, or conformance results of a binding.
2. The versions that a binding supports.
3. A link to an individual issue or pull request in a binding repository.

The contract store MAY link the repository and issue tracker of each known implementation. An OpenSpec change MAY name a
binding issue.

#### Scenario: STO-003.01 A corpus case carries no binding-specific data

- **WHEN** `npm run corpus:check` reads a case that has a `known-defects` field, or a corpus that has a `defect-twins`
  field
- **THEN** the check fails

#### Scenario: STO-003.02 Contract contract store content links no individual binding issue

- **WHEN** a tracked file outside `openspec/changes/` contains a link to an individual issue or pull request in a
  binding repository
- **THEN** the contract store checks fail

#### Scenario: STO-003.03 A listed implementation links only its repository and tracker

- **WHEN** the contract store lists a known implementation with a link to its repository and a link to its issue tracker
- **THEN** the contract store checks pass

### Requirement: STO-004 The version is the latest release or one step above it

The contract store checks SHALL compare the version in `VERSION` with the latest release. The latest release is the
release tag of [VER-005] on the main branch with the highest precedence, for all OSCAL releases. The checks MUST fail
unless the version is one of these:

1. The version of the latest release, with the same build metadata.
2. The next patch, minor or major version after the latest release.

The checks MUST fail when they cannot find the latest release.

#### Scenario: STO-004.01 One step above the latest release passes

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.8.1+oscal.1.2.3`, `0.9.0+oscal.1.2.3`
  or `1.0.0+oscal.1.2.3`
- **THEN** the version meets this requirement

#### Scenario: STO-004.02 The latest release passes

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.8.0+oscal.1.2.3`
- **THEN** the version meets this requirement

#### Scenario: STO-004.03 Two steps above the latest release fail

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.10.0+oscal.1.2.3` or
  `0.9.1+oscal.1.2.3`
- **THEN** the contract store checks fail and name the latest release

#### Scenario: STO-004.04 A version below the latest release fails

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.7.0+oscal.1.2.3`
- **THEN** the contract store checks fail and name the latest release

#### Scenario: STO-004.05 The latest version with other build metadata fails

- **WHEN** the latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.8.0+oscal.1.2.4`
- **THEN** the contract store checks fail and name the latest release

#### Scenario: STO-004.06 A release for another OSCAL release is the latest release

- **WHEN** the only release tag on the main branch is `v0.8.0+oscal.1.2.3`, and `VERSION` holds `0.9.0+oscal.1.2.4`
- **THEN** the version meets this requirement

#### Scenario: STO-004.07 No release on the main branch fails the check

- **WHEN** the clone has release tags, and no release tag is on the main branch
- **THEN** the contract store checks fail

### Requirement: STO-005 The valid corpus uses each listed key pair

The valid corpus SHALL use each key pair that the file `required-keys.json` of the release lists. A pair `a>b` is used
when a JSON document in `documents/valid/` has the key `b` in an object that is the value of the key `a`, or in an item
of an array that is the value of `a`. The corpus check MUST fail when a listed pair is not used.

#### Scenario: STO-005.01 A listed key pair that no valid document uses fails the check

- **WHEN** no JSON document in `documents/valid/` uses a pair that `required-keys.json` lists
- **THEN** the corpus check fails and names the pair

### Requirement: STO-006 The contract store vendors the metaschema of each vendored OSCAL release

For each vendored OSCAL release, `metaschema/<release>/` SHALL hold these files:

1. The `oscal_*_metaschema_RESOLVED.xml` modules that the release of `usnistgov/OSCAL` publishes
   as assets.
2. `metaschema-datatypes.xsd` of `usnistgov/metaschema`, at the commit that `SOURCE.md` records.

Each file SHALL have the bytes of its source, and `SHA256SUMS` SHALL list its digest. The contract store
checks SHALL fail on a digest that does not match. The spec artifact SHALL hold the directory.

#### Scenario: STO-006.01 A changed module fails the contract store checks

- **WHEN** a file in `metaschema/1.2.3/` differs from the digest that `SHA256SUMS` lists for it
- **THEN** the contract store checks fail

#### Scenario: STO-006.02 The spec artifact holds the metaschema

- **WHEN** a consumer reads the spec artifact
- **THEN** it holds `metaschema/1.2.3/` with each module, `metaschema-datatypes.xsd` and its
  `SHA256SUMS`

### Requirement: STO-007 A constraint that cannot work as written is defective

A constraint is an `allowed-values`, `matches`, `has-cardinality`, `is-unique`, `index`,
`index-has-key` or `expect` element. The contract store SHALL treat an ERROR or CRITICAL
constraint as defective when:

1. Its target selects nothing in any document that conforms to the schema.
2. It fails for a node that a filter of its target excludes.
3. It fails for each node that it selects in each document that the schema and other
   constraints allow.
4. It gives a Metapath error for a target node.

#### Scenario: STO-007.01 A target that selects nothing

- **WHEN** a constraint targets a child `type` of `action`, and `type` is a flag of `action`
- **THEN** the constraint is defective

#### Scenario: STO-007.02 A failure for an excluded node

- **WHEN** a `has-cardinality` constraint on assessment parts has a minimum of 1 and a target
  that starts with a filter on `@name='objective'`, and an assessment part has another name
- **THEN** the constraint fails for that part, and the constraint is defective

#### Scenario: STO-007.03 A has-cardinality constraint that no document meets

- **WHEN** a `has-cardinality` constraint on local objectives has a minimum of 1, and no other
  constraint allows its target
- **THEN** the constraint fails for each local objective, and the constraint is defective

### Requirement: STO-008 The exclusion list names each defective constraint with its issue

The contract store SHALL list each defective constraint of [STO-007] in the list `excluded` of
`manifest/<release>/constraint-exclusions.json`, and no other constraint. Each item
SHALL identify one constraint by its `id`, or, for a constraint without an `id`, by its module,
its declaring definition and its kind. Each item SHALL hold the URL of an issue of
`usnistgov/OSCAL` that reports the defect. The contract store checks SHALL fail when an item identifies no
constraint, or more than one.

#### Scenario: STO-008.01 An item that identifies no constraint

- **WHEN** an item of the list `excluded` holds a constraint `id` that no vendored module holds
- **THEN** the contract store checks fail

#### Scenario: STO-008.02 Each item holds its issue

- **WHEN** a consumer reads an item of the list `excluded`
- **THEN** the item holds the URL of an issue of `usnistgov/OSCAL`

### Requirement: STO-009 The contract store publishes a constraint manifest for each release

The contract store SHALL publish the constraint manifest `manifest/<release>/constraints.json`. The contract store
SHALL generate it from the vendored metaschema, the naming manifest and the exclusion list of
[STO-008]. The contract store checks SHALL fail when the file differs from the result of the generation.
The manifest SHALL hold its format version in the member `format`. It SHALL conform to the JSON
Schema `manifest/constraints.schema.json`. The spec artifact SHALL hold both files.

#### Scenario: STO-009.01 An edit by hand fails the contract store checks

- **WHEN** a person edits `manifest/1.2.3/constraints.json` by hand
- **THEN** the file differs from the result of the generation, and the contract store checks fail

#### Scenario: STO-009.02 The manifest conforms to its JSON Schema

- **WHEN** the contract store checks read the manifest
- **THEN** the manifest conforms to `manifest/constraints.schema.json`, or the contract store checks fail

### Requirement: STO-010 The manifest holds each constraint that can decide validity

The manifest SHALL hold one entry for each constraint whose level is ERROR or CRITICAL, unless
the list `excluded` of [STO-008] lists it. A constraint without a level has the level ERROR. It
SHALL hold no other entry. Each entry SHALL hold the kind and the level of its constraint, and the
`id` of the constraint, or null when it has none. Two entries can have the same `id`.

#### Scenario: STO-010.01 A warning is not in the manifest

- **WHEN** a constraint has the level WARNING
- **THEN** the manifest holds no entry for it

#### Scenario: STO-010.02 An excluded constraint is not in the manifest

- **WHEN** the list `excluded` lists a constraint of level ERROR
- **THEN** the manifest holds no entry for it

### Requirement: STO-011 An entry is reportable unless it cannot fail

Each entry SHALL state whether it is reportable. It is reportable unless:

1. It is an `allowed-values` entry with `allow-other` true.
2. It is an `allowed-values` entry, and the JSON Schema allows only values that it lists.
3. It is an `index-has-key` entry whose index is partial.
4. The list `cannot-fail` of the exclusion list names it as [STO-008] states, with the reason.

The generation SHALL fail for a reportable entry without an `id`.

#### Scenario: STO-011.01 An open entry is not reportable

- **WHEN** an `allowed-values` entry has `allow-other` true
- **THEN** the entry is not reportable

#### Scenario: STO-011.02 A test that the schema makes always true

- **WHEN** the schema allows no node for which the test of an `expect` entry is false, and the
  list `cannot-fail` names the entry with that reason
- **THEN** the entry is not reportable

### Requirement: STO-012 The contract store checks the queries against a reference evaluator

The contract store checks SHALL evaluate the vendored constraints with a reference evaluator that reads
the metaschema and applies [CNS-011] to [CNS-017]. They SHALL fail when the queries of an entry
select other nodes than the reference evaluator selects for its constraint. The check SHALL use
the corpus documents that conform to the schema, and generated documents of each model that
conform to it and together hold each definition, flag and choice branch of the model.

#### Scenario: STO-012.01 A query that selects too many nodes

- **WHEN** the context queries of an entry select a node of another definition with the same key
  name
- **THEN** the contract store checks fail

### Requirement: STO-013 The contract store checks the failures of the manifest against the reference evaluator

The contract store checks SHALL evaluate the manifest with an RFC 9535 implementation, as [CNS-017] states
for a document and [CNS-018] for an element, on the documents of [STO-012]. They SHALL fail when the number of failures
of an entry differs from the number that the reference evaluator of [STO-012] gives for its constraint.

#### Scenario: STO-013.01 A pattern that the generation writes wrong

- **WHEN** the I-Regexp of a `matches` entry rejects a value that the pattern of its constraint
  accepts
- **THEN** the manifest gives a failure that the reference evaluator does not give, and the contract store
  checks fail

### Requirement: STO-014 The corpus has a failing case for each reportable entry

For each reportable entry of [STO-011], the corpus SHALL hold a case with an input that conforms to
the schema and fails that entry. The case lists the `id` and the location ([CNS-024]) of each
failure, once for each failure. The contract store checks SHALL fail when such a case is missing, when the
reference evaluator of [STO-012] gives other failures (by `id` or location) than a case lists, or
when it gives a failure for an input that a case expects to be valid or for a builder case result.

#### Scenario: STO-014.01 A reportable entry without a case

- **WHEN** no corpus case expects a failure of a reportable entry
- **THEN** the contract store checks fail

#### Scenario: STO-014.02 A valid corpus document that fails an entry

- **WHEN** an input of `documents/valid/` gives a failure of an entry
- **THEN** the contract store checks fail

#### Scenario: STO-014.03 A failure at another location

- **WHEN** the reference evaluator gives a failure with the `id` that a case lists, at another
  location than the case lists
- **THEN** the contract store checks fail

### Requirement: STO-015 A type is identified by JSON pointers into the complete schema

The naming manifest SHALL identify each canonical type by the set of places in the schema that define it. Each place
is written as `#` followed by a JSON pointer string, as RFC 6901 defines. The pointer string uses the `~0` and `~1`
escapes of RFC 6901 and no percent-encoding, so each consumer decodes it in the same way. Each pointer is relative to
the complete OSCAL schema of the release that the manifest describes.

#### Scenario: STO-015.01 Definition identified by its definition pointer

- **WHEN** the manifest records the `hash` definition
- **THEN** its entry holds the pointer `#/definitions/oscal-complete-oscal-metadata:hash`

### Requirement: STO-016 The manifest records each canonical type with its name, kind, and kind data

The naming manifest SHALL be one JSON file, `names.json`, for each OSCAL release. It SHALL record these items:

1. The version of the manifest format.
2. The OSCAL release that it describes.
3. The file name and the SHA-256 hash of the complete schema that its pointers refer to.
4. One entry for each canonical type.

Each entry SHALL record the canonical name, the kind, and the pointers of the type.

#### Scenario: STO-016.03 Schema hash mismatch is detected

- **WHEN** a consumer reads a manifest whose recorded schema hash differs from the hash of the schema it uses
- **THEN** the consumer rejects the manifest

### Requirement: STO-017 Each kind of manifest entry adds fixed data

The kind of each entry, and the data that the kind adds, SHALL be one of these:

1. `object`: no added data.
2. `document`: the body field of the document wrapper.
3. `document-union`: the canonical names of the document wrappers.
4. `union`: for each branch, the canonical name of the branch type and its distinguishing property.
5. `enum`: whether the enum is open or closed.
6. `single-or-many`: the canonical name of the item type.

A union branch is also an entry of kind `object`.

#### Scenario: STO-017.01 Document entry records its body field

- **WHEN** the manifest records the System Security Plan document wrapper
- **THEN** the entry has kind `document`, name `SystemSecurityPlanDocument`, and body field `system-security-plan`

#### Scenario: STO-017.02 Union entry records each branch

- **WHEN** the manifest records the `catalog:group` union
- **THEN** the entry has kind `union`, and it lists each branch name with the property that distinguishes the branch

#### Scenario: STO-017.03 Enum entry records whether it is open

- **WHEN** the manifest records the `HashAlgorithm` enum
- **THEN** the entry has kind `enum`, and it marks the enum as open

#### Scenario: STO-017.04 Single-or-many entry records its item type

- **WHEN** the manifest records the `MappingCollectionMappings` type
- **THEN** the entry has kind `single-or-many` and item type `Mapping`

### Requirement: STO-018 The manifest records no field names, enum values, or enum member names

An entry of [STO-017] SHALL NOT record field names, enum values, or enum member names. A binding takes them from the
schema and applies its own casing rules.

#### Scenario: STO-018.01 Enum entry holds no enum value

- **WHEN** the manifest records the `HashAlgorithm` enum
- **THEN** the entry holds no enum value and no enum member name

#### Scenario: STO-018.02 Object entry holds no field name

- **WHEN** the manifest records the `hash` definition
- **THEN** the entry holds no field name, for example no `algorithm`

### Requirement: STO-019 Canonical names are unique PascalCase identifiers

The manifest is valid only when all of these rules are true:

1. Each canonical name matches the pattern `^[A-Z][A-Za-z0-9]*$` over the full string.
2. Each canonical name is unique in the manifest.
3. Each reference to a type matches the same pattern and names an entry of the manifest. Branch types, item types, and
   the members of the document union are type references.

A consumer MUST reject an invalid manifest and MUST NOT generate code from it.

#### Scenario: STO-019.01 Name with a non-identifier character is invalid

- **WHEN** a manifest entry has the name `Bad-Name` or a name that holds a space or a quote character
- **THEN** the manifest is invalid, and a consumer generates no code from it

#### Scenario: STO-019.02 Duplicate name is invalid

- **WHEN** two manifest entries have the same name
- **THEN** the manifest is invalid

#### Scenario: STO-019.03 Name with a final newline is invalid

- **WHEN** a manifest entry has a name that ends with a newline character after valid letters
- **THEN** the manifest is invalid, and a consumer generates no code from it

#### Scenario: STO-019.04 Reference to a missing entry is invalid

- **WHEN** a union entry lists a branch type that is not the name of an entry
- **THEN** the manifest is invalid

### Requirement: STO-020 Each manifest format holds its format version in the member `format`

Each manifest format SHALL be a JSON object that holds its format version in the top-level member `format`. A manifest
that is not a JSON object, or that has no `format` member, is invalid under [STO-019].

#### Scenario: STO-020.01 Manifest without a format version is invalid

- **WHEN** a consumer reads a manifest that is not a JSON object, or a manifest that has no `format` member
- **THEN** the consumer rejects the manifest

### Requirement: STO-021 The contract store publishes a JSON Schema for each manifest file

The contract store SHALL publish a JSON Schema for `names.json` and a JSON Schema for `overrides.json`. Each file in the
contract store MUST conform to its JSON Schema. The contract store checks MUST fail when a file does not conform. The
contract store checks SHALL also check the rules that a JSON Schema cannot express, for example uniqueness across
entries, pointers that resolve, and property names that are keys at their pointer.

#### Scenario: STO-021.01 Nonconforming manifest fails the contract store checks

- **WHEN** `names.json` has an entry without a kind
- **THEN** the contract store checks fail and name the entry

#### Scenario: STO-021.03 Distinguishing property that is not a key fails the contract store checks

- **WHEN** a union entry names a distinguishing property that is not a property key of the branch at its pointer
- **THEN** the contract store checks fail and name the entry

### Requirement: STO-022 The JSON Schemas of the manifest files constrain every string

The JSON Schemas of [STO-021] SHALL constrain every string in the files, not only the names:

1. Names and type references match the pattern of [STO-019].
2. Pointers use a fixed set of characters.
3. Property names and body fields match the pattern of OSCAL property keys.
4. The schema file name is a bare file name, with no directory part.
5. No object holds a member that the JSON Schema does not define.

#### Scenario: STO-022.01 Schema file name with a path fails the contract store checks

- **WHEN** the schema file name in `names.json` holds a directory part, for example `../schema.json`
- **THEN** the contract store checks fail

#### Scenario: STO-022.02 Unknown member fails the contract store checks

- **WHEN** an entry of `names.json` holds a member that the JSON Schema does not define
- **THEN** the contract store checks fail

### Requirement: STO-023 The override data is the only hand-edited naming input

The contract store SHALL hold one override file, `overrides.json`, for each OSCAL release. It is the only naming data
that a person edits. It holds these items:

1. The singular local name of each list item, keyed by the pointer of the item.
2. The canonical names that replace a rule-derived name, keyed by pointer.
3. The explicit merges. Each merge is a set of two or more pointers that produce one type.

#### Scenario: STO-023.03 A name change is an override edit

- **WHEN** a person changes the canonical name of a type
- **THEN** the person edits `overrides.json`, and the generation writes the new name to `names.json`

### Requirement: STO-024 Each override resolves and has an effect

Each pointer in the override file of [STO-023] MUST resolve in the complete schema. Each override MUST have an effect
on the generated manifest. The generation MUST fail and name the entry when an override has an unresolvable pointer or
no effect.

#### Scenario: STO-024.01 Override with an unknown pointer fails

- **WHEN** the override file names a pointer that does not resolve in the complete schema
- **THEN** the generation fails and names the pointer

#### Scenario: STO-024.02 Unused override fails

- **WHEN** the override file replaces the name of a pointer with the name that the rules already give it
- **THEN** the generation fails and names the override

#### Scenario: STO-024.03 Explicit merge with an unknown pointer fails

- **WHEN** an explicit merge of the override file lists a pointer that does not resolve in the complete schema
- **THEN** the generation fails and names the pointer

### Requirement: STO-025 The manifest is generated from fixed inputs and is reproducible

The manifest SHALL be the output of a generation step with only these inputs:

1. The complete schema of the release.
2. The override file of the release.
3. The manifest of the previous OSCAL release, when the contract store holds one.

Two runs with the same inputs SHALL produce byte-identical files. The contract store checks SHALL run the generation for
each OSCAL release, in release order. The checks MUST fail when a result differs from the committed
`names.json` of that release.

#### Scenario: STO-025.01 Hand edit of the manifest fails the check

- **WHEN** a person changes a name in `names.json` and does not change the override file
- **THEN** the contract store checks fail, because the generated manifest differs from the committed file

#### Scenario: STO-025.02 Generation is reproducible

- **WHEN** the generation runs twice on the same inputs
- **THEN** the two output files are byte-identical

#### Scenario: STO-025.03 Edit of a previous release manifest fails the check

- **WHEN** a pull request changes a name in the manifest of a previous OSCAL release
- **THEN** the contract store checks fail, because the regenerated manifest of that release differs from the committed
  file

### Requirement: STO-026 The generation checks the manifest of the previous release before use

Before the generation of [STO-025] uses the manifest of the previous OSCAL release, it MUST check that manifest against
[STO-019], [GEN-001], [STO-021], [STO-022], and the hash of the previous schema.

#### Scenario: STO-026.01 Previous manifest with a wrong schema hash

- **WHEN** the schema hash that the previous manifest records differs from the hash of the previous schema
- **THEN** the check of the previous manifest fails

### Requirement: STO-027 Published names stay the same in later releases

When the contract store holds the manifest of a previous OSCAL release, the generation SHALL keep the name of each type
whose pointer occurs in both releases. The derivation rules of this capability SHALL name only the types with new
pointers.

1. A new type whose rule-derived name equals a kept name MUST get another name: the module-prefixed name for a
   definition, or an override name for another type.
2. A kept name changes only through an override name, and the change is a breaking change.

#### Scenario: STO-027.01 Existing type keeps its name

- **WHEN** the previous manifest names a definition `Status`, and the new release keeps that definition
- **THEN** the new manifest also names it `Status`

#### Scenario: STO-027.02 New clashing definition is qualified

- **WHEN** a new release adds a definition with local name `status` in another module, and the previous manifest
  names an existing definition `Status`
- **THEN** the existing definition keeps `Status`, and the new definition gets the module-prefixed name

### Requirement: STO-028 The generation reports each dropped name

The generation of [STO-027] MUST report each name of the previous manifest that it drops, because its pointer is not
in the new schema.

#### Scenario: STO-028.01 Dropped name is reported

- **WHEN** a pointer of the previous manifest does not resolve in the new schema
- **THEN** the generation reports the name of that entry as dropped

#### Scenario: STO-028.02 Each dropped name is reported

- **WHEN** the pointers of two entries of the previous manifest do not resolve in the new schema
- **THEN** the generation reports the names of both entries as dropped

### Requirement: STO-029 A changed released name needs a breaking version increment

The contract store checks SHALL compare `names.json` with the manifest for the same OSCAL release in the latest released
spec artifact, when one exists. The checks MUST fail when a name of the released manifest is changed or removed, unless
the version marks a breaking change: an increment of the major component, or of the minor component when the major
component is 0. The checks SHALL list each changed or removed name, also when the version permits the change.

#### Scenario: STO-029.01 Rename without a breaking increment fails

- **WHEN** a pull request changes a released canonical name and keeps the major and minor components of the version
- **THEN** the contract store checks fail and name the changed type

#### Scenario: STO-029.02 Added type passes without a breaking increment

- **WHEN** a pull request adds an entry for a new type and changes no released name
- **THEN** the name check passes

#### Scenario: STO-029.04 Permitted rename is listed

- **WHEN** a pull request renames a released type and increments the version as a breaking change
- **THEN** the name check passes and lists the old name and the new name

### Requirement: STO-030 The latest released artifact is the release tag with the highest precedence

The latest released spec artifact of [STO-029] SHALL be the release tag on the main branch with the highest Semantic
Versioning precedence among the tags for that OSCAL release.

#### Scenario: STO-030.01 Highest precedence tag is the latest release

- **WHEN** the main branch has the release tags `v0.5.0+oscal.1.2.3` and `v0.6.0+oscal.1.2.3`
- **THEN** the name check compares with the manifest of `v0.6.0+oscal.1.2.3`

### Requirement: STO-031 The name check fails when it cannot read the release tags

The checks of [STO-029] MUST fail when they cannot read the release tags or the history of the main branch. The checks
pass without a comparison only when they read the tags, and no release tag for that OSCAL release holds a manifest.

#### Scenario: STO-031.01 Unreadable tags fail the check

- **WHEN** the checks run in a clone that has no release tags or only part of the history
- **THEN** the name check fails, and it does not pass as if no released manifest exists

#### Scenario: STO-031.02 No released manifest

- **WHEN** the checks read the release tags, and no release tag for the OSCAL release holds a manifest
- **THEN** the name check passes without a comparison

### Requirement: STO-032 Canonical type names derive from OSCAL name scopes, not from generator ordinals

The canonical name of each type SHALL derive from the place in the complete OSCAL schema that defines the type, and
from the name scope that OSCAL gives that place. It MUST NOT derive from the order in which a code generator walks the
schema. An implementation MUST NOT key names on generator-assigned ordinals such as `Model1`, `Type3`, or `Status1`.

#### Scenario: STO-032.02 Schema reorder does not change names

- **WHEN** a later OSCAL release reorders the top-level document definitions
- **THEN** every canonical type name stays the same, because names derive from the definition identity and not from
  position

### Requirement: STO-033 Each place in the schema has a local name

The local name of a place in the complete schema SHALL be one of these:

1. For a definition with key `<namespace>:<local-name>`: `<local-name>`.
2. For an object that a property holds directly: the property key.
3. For the item of a list property: the singular name of one item, for example `origin` for the list `origins`. The
   override data of the naming manifest records it, because the schema does not hold it.
4. For a union branch: the local name of the union.

#### Scenario: STO-033.01 Local name of a definition

- **WHEN** the schema defines the key `oscal-complete-oscal-metadata:hash`
- **THEN** the local name of the definition is `hash`

#### Scenario: STO-033.02 Local name of a list item

- **WHEN** the list property `methods` of the `observation` definition holds items, and the override data records the
  singular name `method` for them
- **THEN** the local name of the item is `method`, not `methods`

### Requirement: STO-034 A definition is named from its local name

The canonical name of a definition SHALL be the PascalCase form of its local name, as [STO-033] defines.

#### Scenario: STO-034.01 Local name maps to PascalCase

- **WHEN** the schema defines a type with key `oscal-complete-oscal-control-common:parameter`
- **THEN** the canonical type name is `Parameter`

### Requirement: STO-035 The root schema is named OscalDocument

The root schema is the union of the document wrappers. Its canonical name SHALL be `OscalDocument`.

#### Scenario: STO-035.01 Root schema name

- **WHEN** the derivation names the root schema
- **THEN** the canonical name is `OscalDocument`

### Requirement: STO-036 An override name has the status of a rule-derived name

The naming manifest can replace a rule-derived name with an override name. A replacement name SHALL have the same
status as a rule-derived name.

#### Scenario: STO-036.01 Override name replaces a rule-derived name

- **WHEN** the override data names the inline object `risk-log` of the `risk` definition `RiskLog`
- **THEN** the canonical name of the inline object is `RiskLog`

### Requirement: STO-037 Document wrapper names derive from each wrapper's single body field

OSCAL defines one wrapper type for each document type. Each wrapper holds exactly one body field, for example `catalog`
or `system-security-plan`, and the `$schema` directive field. The implementation SHALL name each wrapper
`<PascalCaseBodyField>Document`. It SHALL read the body field from the wrapper itself, with the `$schema` directive
field excluded.

#### Scenario: STO-037.01 Wrapper named from its body field

- **WHEN** a wrapper type holds a single body field `system-security-plan` plus the `$schema` directive field
- **THEN** the wrapper's canonical name is `SystemSecurityPlanDocument`

#### Scenario: STO-037.02 Schema directive field is excluded from derivation

- **WHEN** the derivation inspects a wrapper's fields to find its body field
- **THEN** the `$schema` directive field is not treated as the body field

#### Scenario: STO-037.03 The eight wrapper names

- **WHEN** the derivation names the document wrappers of the complete schema
- **THEN** the names are `CatalogDocument`, `ProfileDocument`, `ComponentDefinitionDocument`,
  `SystemSecurityPlanDocument`, `AssessmentPlanDocument`, `AssessmentResultsDocument`,
  `PlanOfActionAndMilestonesDocument`, and `MappingCollectionDocument`

### Requirement: STO-038 Definitions that share a local name across modules get module-prefixed names

OSCAL definitions in different modules can share a local name and have different structures. The derivation MUST
keep such definitions distinct and MUST NOT merge them. When two or more definitions share a local name, the canonical
name of each SHALL be the PascalCase module name, then the PascalCase local name. The module name is the part of the
namespace after `oscal-complete-oscal-`. A name that the naming manifest pins for a definition has precedence over
this rule.

#### Scenario: STO-038.01 Colliding short names get namespace-qualified names

- **WHEN** two definitions in different modules both have local name `control-implementation`
- **THEN** one becomes `ComponentDefinitionControlImplementation` and the other becomes `SspControlImplementation`

#### Scenario: STO-038.02 Override map is the single source of truth

- **WHEN** two bindings generate their types from the same naming manifest
- **THEN** both use the module-prefixed names that the manifest records, so the qualified names match across every
  language binding

#### Scenario: STO-038.03 A definition that clashes only with an inline type keeps its local name

- **WHEN** the `ssp` module defines `status`, and an inline object under `system-component` has local name `status`
- **THEN** the definition is named `Status` and the inline type is named `SystemComponentStatus`, because the inline
  type carries the canonical name of its parent

### Requirement: STO-039 Union branches are named from the union and the property that only the branch has

The complete schema expresses a choice between alternatives as a union with one branch for each alternative. Each
branch SHALL have a distinguishing property that no other branch of the union has. The branch requires that property,
or only the branch defines it. The canonical name of a branch SHALL be the canonical name of the union, then `With`,
then the PascalCase name of the distinguishing property. The canonical name of the union comes from the rules for its
place in the schema.

#### Scenario: STO-039.01 Numbered variant gets a meaningful name

- **WHEN** the profile `merge` union has three branches that require `flat`, `as-is`, and `custom`
- **THEN** the branches are named `MergeWithFlat`, `MergeWithAsIs`, and `MergeWithCustom`, and no name carries an
  ordinal

#### Scenario: STO-039.02 Branch named from its distinguishing property

- **WHEN** one branch of the `catalog:group` union defines `groups`, the other branch defines `controls`, and the
  naming manifest has no override for the branches
- **THEN** the branches are named `CatalogGroupWithGroups` and `CatalogGroupWithControls`

#### Scenario: STO-039.03 Union named from its place

- **WHEN** the `profile:merge` definition is a union
- **THEN** the canonical name of the union is `Merge`, as for any definition, and each branch name starts with `Merge`

### Requirement: STO-040 A distinguishing property identifies a branch only when an object holds it

The `property` member of each variant of a `union` entry of [STO-017] SHALL hold the distinguishing property of
[STO-039] for that branch, also when the branch defines that property as optional.

#### Scenario: STO-040.01 Variant records its distinguishing property when the branch defines it as optional

- **WHEN** the `CatalogGroup` entry records the distinguishing properties `groups` and `controls`, and each branch
  defines its distinguishing property as optional
- **THEN** the `property` member of the two variants is `groups` and `controls`

### Requirement: STO-041 Derivation guards abort on ambiguity, count mismatch, or uncovered collision

The derivation MUST abort, and MUST NOT emit wrong or colliding types, in each of these cases:

1. A wrapper does not have exactly one body field, with the `$schema` directive field excluded. The report MUST name
   the wrapper.
2. The count of derived wrappers differs from the count of top-level document types.
3. A duplicate canonical name remains after renaming, and no override covers it. The report MUST list each uncovered
   collision at once.

#### Scenario: STO-041.01 Ambiguous wrapper aborts

- **WHEN** a wrapper has two body fields after the `$schema` directive field is excluded
- **THEN** the derivation stops and names that wrapper

#### Scenario: STO-041.02 Wrapper count mismatch aborts

- **WHEN** the number of derived wrappers does not equal the number of top-level document types in the schema
- **THEN** the derivation stops

#### Scenario: STO-041.03 Uncovered collisions are all reported

- **WHEN** two distinct definitions still resolve to the same canonical name and no override covers them
- **THEN** the derivation stops and reports every uncovered collision, not just the first one found

### Requirement: STO-042 The naming manifest is the shared source of truth across languages

The derivation SHALL record these outputs in a naming manifest that each language binding reads:

1. The name of each canonical type and the places that define it.
2. The body field of each wrapper.
3. The deduplication of copied types.
4. The module-prefixed names of colliding definitions.
5. The union branch names and their distinguishing properties.
6. Whether each enum is open or closed.

Each binding MUST take the identity of each type and the collision resolutions from the manifest.

#### Scenario: STO-042.01 Two bindings agree on a collision name

- **WHEN** a Go binding and a Rust binding both generate from the same schema and manifest
- **THEN** both resolve the colliding `control-implementation` definitions to the same two canonical identities

#### Scenario: STO-042.02 A binding does not re-derive names

- **WHEN** a binding generates its types from the schema and the naming manifest
- **THEN** it takes every canonical type name from the manifest, and it does not apply the naming rules itself

### Requirement: STO-043 Inline types are named from the canonical name of their parent and their own local name

An inline type is an object or a union in the complete schema that is not a definition. The canonical name of an
inline type SHALL be the canonical name of its parent type, followed by its own PascalCase local name. The parent type
is the nearest definition, inline type, or union that holds the inline type. When a union branch holds the inline
type, the parent type is the union, not the branch. The canonical name of the parent includes any override name of the
parent.

#### Scenario: STO-043.01 Inline object named from its parent

- **WHEN** the `system-component` definition holds an inline object in its `status` property
- **THEN** the canonical name of the inline type is `SystemComponentStatus`

#### Scenario: STO-043.02 Two inline types with the same local name stay distinct

- **WHEN** the `system-component` definition and the `finding-target` definition each hold a different inline object
  in a `status` property
- **THEN** the inline types are named `SystemComponentStatus` and `FindingTargetStatus`

#### Scenario: STO-043.03 Nested inline type uses the canonical name of its parent

- **WHEN** the `back-matter` definition holds the list item `resource`, and that item holds an inline object in its
  `citation` property
- **THEN** the item type is named `BackMatterResource`, and the inline object is named `BackMatterResourceCitation`

#### Scenario: STO-043.04 Inline type in a union branch uses the name of the union

- **WHEN** a branch of the inline union `TaskTiming` holds an inline object in its `on-date` property
- **THEN** the canonical name of the inline object is `TaskTimingOnDate`

#### Scenario: STO-043.05 Override name of a parent carries down

- **WHEN** the override data names the inline object `risk-log` of the `risk` definition `RiskLog`, and that object
  holds the list item `entry`
- **THEN** the canonical name of the item type is `RiskLogEntry`

#### Scenario: STO-043.06 List items use the singular local name

- **WHEN** the list property `origins` of the `poam-item` definition holds inline objects, and the override data
  records the singular name `origin`
- **THEN** the canonical name of the item type is `PoamItemOrigin`

### Requirement: STO-044 Each enum site is a named type, marked open or closed

Each enum site SHALL produce a canonical enum type, also for a closed enum. The kinds of enum are:

1. An enum in an `anyOf` with its base datatype is open: each valid value of the base datatype is valid.
2. An enum in an `allOf` with its base datatype is closed: only a value from the enum is valid.

The naming manifest SHALL record whether each enum is open or closed. It does not record the enum values or member
names.

#### Scenario: STO-044.02 Closed enum gets a type

- **WHEN** the `parameter-selection` definition holds the values `one` and `one-or-more` in an `allOf` with a token
  datatype, in its `how-many` property
- **THEN** the derivation produces a closed enum type named `ParameterSelectionHowMany`

#### Scenario: STO-044.03 Open enum is marked open

- **WHEN** the `hash` definition holds the `algorithm` enum in an `anyOf` with a string datatype
- **THEN** the naming manifest marks `HashAlgorithm` as open

### Requirement: STO-045 An enum is named from its owner type and its property

The canonical name of an enum SHALL be the canonical name of its owner type, then the PascalCase local
name of its property. The owner type is the nearest definition, inline type, or union that holds the property, as
[STO-043] defines for a parent type. For a list property, the local name is the singular name of an item, as
[STO-033] defines. An enum that a definition holds directly, as its own `anyOf` or `allOf` with a base datatype, SHALL
take the canonical name of the definition.

#### Scenario: STO-045.01 Enum named from owner and property

- **WHEN** the `hash` definition holds an enum in its `algorithm` property
- **THEN** the canonical name of the enum is `HashAlgorithm`

#### Scenario: STO-045.02 Enum held directly by a definition

- **WHEN** the `assessment-common:risk-status` definition is an `anyOf` of a token datatype and an enum
- **THEN** the derivation produces an open enum type named `RiskStatus`

#### Scenario: STO-045.03 Enums of an inline owner share its canonical name

- **WHEN** the inline `status` object of the `finding-target` definition holds an enum in its `state` property and an
  enum in its `reason` property
- **THEN** the enums are named `FindingTargetStatusState` and `FindingTargetStatusReason`

#### Scenario: STO-045.04 Enums with the same owner local name stay distinct

- **WHEN** the `ssp:status` definition, the inline `status` object of `system-component`, and the inline `status`
  object of `finding-target` each hold an enum in a `state` property
- **THEN** the enums are named `StatusState`, `SystemComponentStatusState`, and `FindingTargetStatusState`

#### Scenario: STO-045.05 Enum in a list property uses the singular name

- **WHEN** the `observation` definition holds an enum in the items of its list property `methods`, and the override
  data records the singular name `method`
- **THEN** the canonical name of the enum is `ObservationMethod`

### Requirement: STO-046 A property that holds one item or a list of items is a single-or-many type

The complete schema expresses some properties as a union of one item and a list of one or more of the same item. Such
a property SHALL produce a type of the single-or-many kind, not a union with named branches. The canonical name of the
type SHALL be the canonical name of the nearest definition, inline type, or union that holds the property, followed by
the PascalCase property key. The naming manifest SHALL record the canonical name of the item type.

#### Scenario: STO-046.01 One-or-list property is a single-or-many type

- **WHEN** the `mappings` property of the `mapping-collection` definition accepts one `mapping` or a list of
  `mapping` items
- **THEN** the derivation produces a single-or-many type named `MappingCollectionMappings` with item type `Mapping`

### Requirement: STO-047 Scalar root wrappers collapse to plain aliased types

A schema definition that wraps a single scalar value SHALL become a plain typed value with its constraints attached, not
a wrapper object. An example is a constrained string such as a UUID. Two kinds of root wrapper types are the documented
exception and MUST stay as root-model wrappers. They are the top-level document union and each type of the
single-or-many kind that [STO-046] defines.

#### Scenario: STO-047.01 Scalar wrapper becomes a constrained value

- **WHEN** a definition wraps a single constrained string value
- **THEN** the binding exposes a constrained string type, not an object with one field

#### Scenario: STO-047.02 Preserved wrappers stay wrappers

- **WHEN** the definition is the top-level document union or a type of the single-or-many kind
- **THEN** it remains a root-model wrapper and is not collapsed

### Requirement: STO-048 Each pointer of an entry resolves and belongs to that entry only

The pointers of [STO-015] SHALL meet these constraints:

1. Each entry has one or more pointers. An entry has more than one pointer only when the derivation rules of this
   capability merge those places into one type.
2. A pointer occurs in no more than one entry.
3. Each pointer resolves to a subschema of the complete schema.
4. A scalar definition of [STO-047] has no entry, unless it holds an enum directly, as [STO-045] defines.

#### Scenario: STO-048.01 Merged type holds every place

- **WHEN** one type comes from the two branches of the `parties` union
- **THEN** its entry holds the pointer of the place in each branch, and no other entry holds either pointer

#### Scenario: STO-048.02 Unresolvable pointer is invalid

- **WHEN** a manifest entry holds a pointer that does not resolve in the complete schema
- **THEN** the manifest is invalid

#### Scenario: STO-048.03 Scalar definition with an enum has an entry

- **WHEN** the `assessment-common:risk-status` definition holds an enum directly
- **THEN** the manifest has an entry of kind `enum` named `RiskStatus` for the definition

#### Scenario: STO-048.04 Scalar definition without an enum has no entry

- **WHEN** a definition wraps one constrained string value and holds no enum
- **THEN** no entry of the manifest holds the pointer of that definition

### Requirement: STO-049 Types deduplicate only for union-branch copies and explicit merges

The definition of each shared element type that several document types use, for example `metadata`, SHALL produce a
single canonical type. Two places SHALL produce one canonical type only when one of these conditions applies:

1. The JSON pointers of the two places differ only in the index of one or more union branches.
2. The naming manifest lists the two places as an explicit merge.

Equal structure alone MUST NOT merge two places.

#### Scenario: STO-049.01 A shared type referenced by many document types yields one canonical type

- **WHEN** several document types use the `metadata` element type
- **THEN** the derivation produces a single `Metadata` type, not one Metadata type per document type

#### Scenario: STO-049.02 Same name but different structure is not deduplicated

- **WHEN** two definitions share a local name but differ in their fields or constraints
- **THEN** the derivation keeps them as two distinct types and does not merge them

#### Scenario: STO-049.03 Copies in union branches merge

- **WHEN** the two branches of the `parties` union each hold an `external-ids` list with the same item structure
- **THEN** the derivation produces one canonical type for the item, and the naming manifest records both places for it

#### Scenario: STO-049.04 Equal enum values at unrelated places do not merge

- **WHEN** two enums at unrelated places have the same values, and the naming manifest does not list them as an
  explicit merge
- **THEN** the derivation produces two enum types

### Requirement: STO-050 Merged places are structurally identical

Two places that [STO-049] merges MUST be structurally identical. "Structurally identical" means the same fields, the
same field types, and the same constraints.

#### Scenario: STO-050.01 Identical places merge

- **WHEN** the override data lists two places as an explicit merge, and the two places have the same fields, field
  types, and constraints
- **THEN** the derivation produces one canonical type, and the naming manifest records both places for it

### Requirement: STO-051 A merge is not a name collision

A merge of [STO-049] and a name collision MUST NOT be conflated. A merge produces one type from two places. A
collision is two different types that resolve to the same name, which [STO-038] and [STO-041] handle.

#### Scenario: STO-051.01 Clashing definitions are not merged

- **WHEN** two definitions in different modules have the local name `control-implementation`, and the naming manifest
  does not list them as an explicit merge
- **THEN** the derivation produces two types with module-prefixed names, and the naming manifest records no merge of
  them

### Requirement: STO-052 Derivation guards abort on a missing singular name, an ambiguous branch, or an unequal merge

The derivation SHALL also apply these guards:

1. A list item without a singular local name of [STO-033] MUST abort the derivation and name the list.
2. A union branch without exactly one distinguishing property of [STO-039] MUST abort the derivation and name the
   branch.
3. Two places that [STO-049] merges, and that are not structurally identical as [STO-050] defines, MUST abort the
   derivation and name both places.

Each of these guards reports every failure at once.

#### Scenario: STO-052.01 Missing singular name aborts

- **WHEN** a list property holds inline items, and the override data has no singular local name for the items
- **THEN** the derivation stops and names the list property

#### Scenario: STO-052.02 Branch without a distinguishing property aborts

- **WHEN** every property of a union branch also occurs in another branch of the same union
- **THEN** the derivation stops and names the branch

#### Scenario: STO-052.03 Merge of different structures aborts

- **WHEN** the override data lists two places as an explicit merge, and the two places have different fields
- **THEN** the derivation stops and names both places

#### Scenario: STO-052.04 Each missing singular name is reported

- **WHEN** two list properties hold inline items, and the override data has no singular local name for either
- **THEN** the derivation stops and names both list properties

### Requirement: STO-053 The contract store publishes a requirement index

The contract store SHALL publish `openspec/requirements.json`, generated from the main specs. It holds a format version
and one entry for each requirement in the main specs, in identifier order. Each entry holds the requirement identifier,
the capability, and the title. The contract store checks MUST fail when the committed index differs from the generator
output. The spec artifact SHALL hold the index.

#### Scenario: STO-053.01 Index entry of a requirement

- **WHEN** the main specs hold [PRS-001] in the document-parsing capability
- **THEN** the index has an entry with the identifier `PRS-001`, the capability `document-parsing`, and the title
  `Parse an OSCAL document from text or bytes`

#### Scenario: STO-053.02 Stale index fails the contract store checks

- **WHEN** a pull request adds a requirement to the main specs and does not regenerate the index
- **THEN** the contract store checks fail

#### Scenario: STO-053.03 Retired requirement has no entry

- **WHEN** the ledger retires a requirement identifier
- **THEN** the index has no entry for that identifier

#### Scenario: STO-053.04 Spec artifact holds the index

- **WHEN** the contract store builds the spec artifact
- **THEN** the archive holds `openspec/requirements.json`

### Requirement: STO-054 The contract store publishes a JSON Schema for the traceability record

The contract store SHALL publish `openspec/traceability.schema.json`, the JSON Schema of the traceability record of
[SRF-003]. The record SHALL conform to it. The spec artifact SHALL hold it. The JSON Schema SHALL constrain the record:

1. Each requirement identifier is two to five uppercase letters, a hyphen, and three digits.
2. Each entry holds contract requirement identifiers or one binding-local identifier, not both.
3. No object holds a member that the JSON Schema does not define.

#### Scenario: STO-054.01 Entry with both kinds of identifier is invalid

- **WHEN** a record entry holds a contract requirement identifier and a binding-local requirement identifier
- **THEN** the record does not conform to the JSON Schema

#### Scenario: STO-054.02 Scenario identifier is invalid

- **WHEN** a record entry holds the scenario identifier `PRS-001.01`
- **THEN** the record does not conform to the JSON Schema

#### Scenario: STO-054.03 Spec artifact holds the JSON Schema

- **WHEN** the contract store builds the spec artifact
- **THEN** the archive holds `openspec/traceability.schema.json`

### Requirement: STO-055 The spec artifact holds the binding templates

The spec artifact SHALL hold `templates/binding/`: the files that a binding copies to check its specs and its record
before each commit. They include:

1. The binding checker.
2. A POSIX shell pre-commit hook that runs the binding checker and `openspec validate --all --strict`.
3. The template config: a `config.yaml` for a binding.
4. An agent guide, `AGENTS.md`.

#### Scenario: STO-055.01 Spec artifact holds the templates

- **WHEN** the contract store builds the spec artifact
- **THEN** the archive holds `templates/binding/`

#### Scenario: STO-055.02 Stale binding checker fails the contract store checks

- **WHEN** a pull request changes the identifier checks of the contract store and does not regenerate the binding
  checker
- **THEN** the contract store checks fail

#### Scenario: STO-055.03 Binding checker needs no installed package

- **WHEN** a binding runs the binding checker with Node.js 22 or later and git, in a repository that has no
  `node_modules` directory
- **THEN** the checker runs and reports its result

#### Scenario: STO-055.04 Archive with another hash fails the hook

- **WHEN** the archive file differs from the hash that the hook pins
- **THEN** the hook fails before it runs the binding checker, and checks no staged file

#### Scenario: STO-055.05 Agent guide cites an unknown contract store identifier

- **WHEN** the agent guide cites a contract store identifier that is neither live nor retired in the contract store
- **THEN** the contract store checks fail and name the identifier

### Requirement: STO-056 The binding checker applies the identifier rules to the specs of a binding

The binding checker SHALL apply each identifier check of the contract store to the main specs and the identifier ledger
of a binding. It reads the contract store from the spec artifact that the binding pins. It SHALL also fail when:

1. A prefix in the ledger of the binding is a prefix of the contract store, as [SRF-010] states.
2. A citation that uses a prefix of the contract store names no live or retired identifier of the contract store.

#### Scenario: STO-056.01 Contract contract store prefix in the ledger of a binding fails

- **WHEN** the ledger of a binding holds the prefix `PRS`
- **THEN** the binding checker fails and names the prefix

#### Scenario: STO-056.02 Citation of a contract store identifier resolves

- **WHEN** a binding spec cites [PRS-001] or `[PRS-001.01]`, and the pinned spec artifact holds that identifier
- **THEN** the binding checker reports no failure for the citation

#### Scenario: STO-056.03 Citation of an unknown contract store identifier fails

- **WHEN** a binding spec cites `[PRS-999]`, and the pinned spec artifact neither holds nor retires it
- **THEN** the binding checker fails and names the citation

#### Scenario: STO-056.04 Identifier rule of the contract store applies to a binding

- **WHEN** a requirement heading in a binding spec has a number at or above `next` for its prefix in the ledger of
  the binding
- **THEN** the binding checker fails, as the contract store check fails for the same heading in the contract store

### Requirement: STO-057 The binding checker checks the traceability record

The binding checker SHALL check the traceability record of a binding against the spec artifact that the binding pins.
It SHALL fail when:

1. The record does not conform to the JSON Schema of [STO-054].
2. A contract requirement identifier does not resolve, as [SRF-004] states.
3. A binding-local requirement identifier names no requirement in the main specs of the binding, or starts with a
   prefix of the contract store, as [SRF-010] states.
4. An operation name occurs in more than one entry.

#### Scenario: STO-057.01 Record that does not conform fails

- **WHEN** a record entry holds a contract requirement identifier and a binding-local requirement identifier
- **THEN** the binding checker fails

#### Scenario: STO-057.02 Retired contract identifier fails

- **WHEN** a record entry holds the retired identifier [MDL-004]
- **THEN** the binding checker fails and names the identifier

#### Scenario: STO-057.03 Unknown binding-local identifier fails

- **WHEN** a record entry holds the binding-local identifier `PYB-009`, and the main specs of the binding have no
  requirement `PYB-009`
- **THEN** the binding checker fails and names the identifier

#### Scenario: STO-057.04 Operation name in two entries fails

- **WHEN** two record entries have the same operation name
- **THEN** the binding checker fails and names the operation

#### Scenario: STO-057.05 Valid record passes

- **WHEN** one record entry holds [PRS-001], and one entry holds the binding-local identifier `PYB-001` of a
  requirement in the main specs of the binding
- **THEN** the binding checker reports no failure for the record

### Requirement: STO-058 The template config follows the contract store config

The template config of [STO-055] SHALL hold each entry of `openspec/config.yaml` of the contract store, with each
command or file of the contract store in it replaced for a binding. It SHALL also hold the prefix rule of [SRF-010], the
citation rule of [STO-056], and a `references` entry for the contract store. The contract store checks MUST fail when:

1. The template differs from that config with these changes.
2. A text that the template replaces is not in that config.

#### Scenario: STO-058.01 Changed contract store rule fails the contract store checks until the template follows

- **WHEN** a pull request changes an entry of the contract store `openspec/config.yaml` and does not regenerate the
  template
- **THEN** the contract store checks fail

#### Scenario: STO-058.02 Stale replacement fails the contract store checks

- **WHEN** a pull request rewords a contract-store-specific sentence of the contract store `openspec/config.yaml`, and
  the template replaces the old sentence
- **THEN** the contract store checks fail and name the sentence

#### Scenario: STO-058.03 Template names the binding checker for a contract store command

- **WHEN** an entry of the contract store `openspec/config.yaml` names `npm run spec-ids`
- **THEN** the same entry in the template names the binding checker instead

### Requirement: STO-059 The manifest selects nodes with RFC 9535 queries

Each entry of the constraint manifest SHALL select nodes with queries in the syntax of RFC 9535 (JSONPath). A query SHALL
use only the syntax and the functions of RFC 9535. Each regular expression in a query SHALL be an I-Regexp of RFC 9485.

#### Scenario: STO-059.01 A pattern that is not an I-Regexp fails the contract store checks

- **WHEN** the pattern of an entry is `\d+`, which is not an I-Regexp
- **THEN** the contract store checks fail

#### Scenario: STO-059.02 Each query of the committed manifest meets RFC 9535

- **WHEN** the contract store checks the committed manifest
- **THEN** each query compiles under RFC 9535, and each pattern is an I-Regexp

### Requirement: STO-060 Each entry of the constraint manifest holds three groups of queries

Each entry SHALL hold these queries of [STO-059]:

1. Document context queries. They select from a document the context nodes, to which the constraint applies.
2. Element context queries for each element type whose element can hold a context node. An `allowed-values` entry can
   lack them for a type, as [CNS-009] states.
3. Target queries. They select the target nodes of one context node.

#### Scenario: STO-060.01 An entry without target queries fails the manifest JSON Schema

- **WHEN** an entry of the manifest has no `target` member
- **THEN** the manifest does not conform to its JSON Schema, and the contract store checks fail

#### Scenario: STO-060.02 A target in another document

- **WHEN** the Metapath target of a constraint is a union of a path in the same document and a `doc()` path into
  another document
- **THEN** the target queries select only the nodes of that union in the same document
