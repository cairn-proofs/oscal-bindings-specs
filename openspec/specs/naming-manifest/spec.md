# naming-manifest Specification

## Purpose

Defines the naming manifest: the machine-readable record of every canonical OSCAL type, its kind, and the places in the
schema that define it. Also defines the hand-edited override data, how the manifest is generated and checked, and how
published names stay stable across releases. A binding is an implementation of the OSCAL bindings contract in one
programming language. A consumer is a program that reads the manifest, for example the code generator of a binding.

## Requirements

### Requirement: NAM-001 A type is identified by JSON pointers into the complete schema

The naming manifest SHALL identify each canonical type by the set of places in the schema that define it. Each place
is written as `#` followed by a JSON pointer string, as RFC 6901 defines, for example
`#/definitions/oscal-complete-oscal-metadata:hash`. The pointer string uses the `~0` and `~1` escapes of RFC 6901 and
no percent-encoding, so each consumer decodes it in the same way. Each pointer is relative to the complete OSCAL schema
of the release that the manifest describes. The constraints are:

1. Each entry has one or more pointers. An entry has more than one pointer only when the model-derivation capability
   merges those places into one type.
2. A pointer occurs in no more than one entry.
3. Each pointer resolves to a subschema of the complete schema.
4. A scalar definition has no entry, unless it holds an enum directly, as the model-derivation capability defines. A
   scalar definition wraps one scalar value, and a binding exposes it as a constrained value.

#### Scenario: NAM-001.01 Definition identified by its definition pointer

- **WHEN** the manifest records the `hash` definition
- **THEN** its entry holds the pointer `#/definitions/oscal-complete-oscal-metadata:hash`

#### Scenario: NAM-001.02 Merged type holds every place

- **WHEN** one type comes from the two branches of the `parties` union
- **THEN** its entry holds the pointer of the place in each branch, and no other entry holds either pointer

#### Scenario: NAM-001.03 Unresolvable pointer is invalid

- **WHEN** a manifest entry holds a pointer that does not resolve in the complete schema
- **THEN** the manifest is invalid

### Requirement: NAM-002 The manifest records each canonical type with its name, kind, and kind data

The naming manifest SHALL be one JSON file, `names.json`, for each OSCAL release. It SHALL record these items:

1. The version of the manifest format.
2. The OSCAL release that it describes.
3. The file name and the SHA-256 hash of the complete schema that its pointers refer to.
4. One entry for each canonical type.

Each entry SHALL record the canonical name, the kind, and the pointers of the type. The kinds and the data that each
kind adds are:

1. `object`: no added data.
2. `document`: the body field of the document wrapper.
3. `document-union`: the canonical names of the document wrappers.
4. `union`: for each branch, the canonical name of the branch type and its distinguishing property.
5. `enum`: whether the enum is open or closed.
6. `single-or-many`: the canonical name of the item type.

A union branch is also an entry of kind `object`. The manifest does not record field names, enum values, or enum member
names. A binding takes those from the schema and applies its own casing rules.

#### Scenario: NAM-002.01 Document entry records its body field

- **WHEN** the manifest records the System Security Plan document wrapper
- **THEN** the entry has kind `document`, name `SystemSecurityPlanDocument`, and body field `system-security-plan`

#### Scenario: NAM-002.02 Union entry records each branch

- **WHEN** the manifest records the `catalog:group` union
- **THEN** the entry has kind `union`, and it lists each branch name with the property that distinguishes the branch

#### Scenario: NAM-002.03 Schema hash mismatch is detected

- **WHEN** a consumer reads a manifest whose recorded schema hash differs from the hash of the schema it uses
- **THEN** the consumer rejects the manifest

### Requirement: NAM-003 Canonical names are unique PascalCase identifiers

The manifest is valid only when all of these rules are true:

1. Each canonical name matches the pattern `^[A-Z][A-Za-z0-9]*$` over the full string. A final newline or any other
   character after the last letter or digit breaks the rule.
2. Each canonical name is unique in the manifest.
3. Each reference to a type matches the same pattern and names an entry of the manifest. Branch types, item types, and
   the members of the document union are type references.
4. The format version is a version that the consumer supports.
5. The OSCAL release is the release of the schema that the consumer uses.

A consumer MUST reject an invalid manifest and MUST NOT generate code from it.

#### Scenario: NAM-003.01 Name with a non-identifier character is invalid

- **WHEN** a manifest entry has the name `Bad-Name` or a name that holds a space or a quote character
- **THEN** the manifest is invalid, and a consumer generates no code from it

#### Scenario: NAM-003.02 Duplicate name is invalid

- **WHEN** two manifest entries have the same name
- **THEN** the manifest is invalid

#### Scenario: NAM-003.03 Name with a final newline is invalid

- **WHEN** a manifest entry has a name that ends with a newline character after valid letters
- **THEN** the manifest is invalid, and a consumer generates no code from it

#### Scenario: NAM-003.04 Reference to a missing entry is invalid

- **WHEN** a union entry lists a branch type that is not the name of an entry
- **THEN** the manifest is invalid

#### Scenario: NAM-003.05 Unknown format version is rejected

- **WHEN** a consumer reads a manifest whose format version it does not support
- **THEN** the consumer rejects the manifest

### Requirement: NAM-004 The store publishes a JSON Schema for each manifest file

The store SHALL publish a JSON Schema for `names.json` and a JSON Schema for `overrides.json`. Each file in the store
MUST conform to its JSON Schema. The store checks MUST fail when a file does not conform. The JSON Schemas SHALL
constrain every string in the files, not only the names:

1. Names and type references match the pattern of [NAM-003].
2. Pointers use a fixed set of characters.
3. Property names and body fields match the pattern of OSCAL property keys.
4. The schema file name is a bare file name, with no directory part.
5. No object holds a member that the JSON Schema does not define.

The store checks SHALL also check the rules that a JSON Schema cannot express. Examples are uniqueness across
entries, pointers that resolve, and property names that are keys at their pointer. A consumer MUST write a string
from the manifest into generated code only as a name that matches [NAM-003] or as an escaped string literal.

#### Scenario: NAM-004.01 Nonconforming manifest fails the store checks

- **WHEN** `names.json` has an entry without a kind
- **THEN** the store checks fail and name the entry

#### Scenario: NAM-004.02 Schema file name with a path fails the store checks

- **WHEN** the schema file name in `names.json` holds a directory part, for example `../schema.json`
- **THEN** the store checks fail

#### Scenario: NAM-004.03 Distinguishing property that is not a key fails the store checks

- **WHEN** a union entry names a distinguishing property that is not a property key of the branch at its pointer
- **THEN** the store checks fail and name the entry

### Requirement: NAM-005 The override data is the only hand-edited naming input

The store SHALL hold one override file, `overrides.json`, for each OSCAL release. It is the only naming data that a
person edits. It holds these items:

1. The singular local name of each list item, keyed by the pointer of the item.
2. The canonical names that replace a rule-derived name, keyed by pointer.
3. The explicit merges. Each merge is a set of two or more pointers that produce one type.

Each pointer in the override file MUST resolve in the complete schema. Each override MUST have an effect on the
generated manifest. The generation MUST fail and name the entry when an override has an unresolvable pointer or no
effect.

#### Scenario: NAM-005.01 Override with an unknown pointer fails

- **WHEN** the override file names a pointer that does not resolve in the complete schema
- **THEN** the generation fails and names the pointer

#### Scenario: NAM-005.02 Unused override fails

- **WHEN** the override file replaces the name of a pointer with the name that the rules already give it
- **THEN** the generation fails and names the override

### Requirement: NAM-006 The manifest is generated from fixed inputs and is reproducible

The manifest SHALL be the output of a generation step. The inputs of the generation are these and only these:

1. The complete schema of the release.
2. The override file of the release.
3. The manifest of the previous OSCAL release, when the store holds one.

Two runs with the same inputs SHALL produce byte-identical files. The store checks SHALL run the generation for each
OSCAL release in the store, in release order. The checks MUST fail when a result differs from the committed
`names.json` of that release. The generation can use the manifest of the previous release as input. Before it does,
it MUST check that manifest against [NAM-003], [NAM-004], and the hash of the previous schema.

#### Scenario: NAM-006.01 Hand edit of the manifest fails the check

- **WHEN** a person changes a name in `names.json` and does not change the override file
- **THEN** the store checks fail, because the generated manifest differs from the committed file

#### Scenario: NAM-006.02 Generation is reproducible

- **WHEN** the generation runs twice on the same inputs
- **THEN** the two output files are byte-identical

#### Scenario: NAM-006.03 Edit of a previous release manifest fails the check

- **WHEN** a pull request changes a name in the manifest of a previous OSCAL release
- **THEN** the store checks fail, because the regenerated manifest of that release differs from the committed file

### Requirement: NAM-007 Published names stay the same in later releases

The store can hold the manifest of a previous OSCAL release. In that case, the generation SHALL keep the name of each
type whose pointer occurs in both releases. The naming rules of the model-derivation capability SHALL name only the
types whose pointers are new. The constraints are:

1. A new type whose rule-derived name equals a kept name MUST get a different name. A new definition gets the
   module-prefixed name. Any other new type needs an override name.
2. A kept name changes only through an override name, and the change is a breaking change.
3. The generation MUST report each name of the previous manifest that it drops, because its pointer is not in the new
   schema.

#### Scenario: NAM-007.01 Existing type keeps its name

- **WHEN** the previous manifest names a definition `Status`, and the new release keeps that definition
- **THEN** the new manifest also names it `Status`

#### Scenario: NAM-007.02 New clashing definition is qualified

- **WHEN** a new release adds a definition with local name `status` in another module, and the previous manifest
  names an existing definition `Status`
- **THEN** the existing definition keeps `Status`, and the new definition gets the module-prefixed name

#### Scenario: NAM-007.03 Dropped name is reported

- **WHEN** a pointer of the previous manifest does not resolve in the new schema
- **THEN** the generation reports the name of that entry as dropped

### Requirement: NAM-008 A changed released name needs a breaking version increment

The store checks SHALL compare `names.json` with the manifest for the same OSCAL release in the latest released spec
artifact, when one exists. The latest released artifact is the release tag on the main branch with the highest Semantic
Versioning precedence among the tags for that OSCAL release. The checks MUST fail when a name of the released manifest
is changed or removed, unless the spec artifact version marks a breaking change. A version marks a breaking change when
its major component increments, or, for a version with major component 0, when its minor component increments.

The checks MUST fail when they cannot read the release tags or the history of the main branch. The checks pass
without a comparison only when they read the tags, and no release tag for that OSCAL release holds a manifest. The
checks SHALL list each changed or removed name in their output, also when the version permits the change.

#### Scenario: NAM-008.01 Rename without a breaking increment fails

- **WHEN** a pull request changes a released canonical name and keeps the major and minor components of the version
- **THEN** the store checks fail and name the changed type

#### Scenario: NAM-008.02 Added type passes without a breaking increment

- **WHEN** a pull request adds an entry for a new type and changes no released name
- **THEN** the name check passes

#### Scenario: NAM-008.03 Unreadable tags fail the check

- **WHEN** the checks run in a clone that has no release tags or only part of the history
- **THEN** the name check fails, and it does not pass as if no released manifest exists

#### Scenario: NAM-008.04 Permitted rename is listed

- **WHEN** a pull request renames a released type and increments the version as a breaking change
- **THEN** the name check passes and lists the old name and the new name
