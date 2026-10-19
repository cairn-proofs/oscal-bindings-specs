## RENAMED Requirements

- FROM: `### Requirement: MDL-001 Canonical type names derive from the schema `$id`, not from generator ordinals`
- TO: `### Requirement: MDL-001 Canonical type names derive from OSCAL name scopes, not from generator ordinals`

- FROM: `### Requirement: MDL-005 A fixed override map resolves cross-type name collisions`
- TO: `### Requirement: MDL-005 Definitions that share a local name across modules get module-prefixed names`

- FROM: `### Requirement: MDL-006 A fixed variant-rename map names split-constraint variants`
- TO: `### Requirement: MDL-006 Union branches are named from the union and the property that only the branch has`

## MODIFIED Requirements

### Requirement: MDL-001 Canonical type names derive from OSCAL name scopes, not from generator ordinals

The canonical name of each type SHALL derive from the place in the complete OSCAL schema that defines the type. It
SHALL also derive from the name scope that OSCAL gives that place. It MUST NOT derive from the order in which a code
generator walks the schema. An implementation MUST NOT key names on generator-assigned ordinals such as `Model1`,
`Type3`, or `Status1`.

The local name of a place in the schema is one of these:

1. For a definition with key `<namespace>:<local-name>`, the local name is `<local-name>`.
2. For an object that a property holds directly, the local name is the property key.
3. For the item of a list property, the local name is the singular name of one item. The property key of a list is the
   plural name of the list, for example `origins`. The naming manifest records the singular name, for example
   `origin`, in its override data. The schema does not hold the singular name.
4. For a union branch, the local name is the local name of the union.

The canonical name of a definition is the PascalCase form of its local name, for example `parameter` becomes
`Parameter`. The rules for the other kinds of type are in [MDL-002], [MDL-005], [MDL-006], [MDL-010], [MDL-011], and
[MDL-012]. The root schema, which is the union of the document wrappers, has the canonical name `OscalDocument`. The
naming manifest can replace a rule-derived name with an override name. A replacement name has the same status as a
rule-derived name.

#### Scenario: MDL-001.01 Local name maps to PascalCase

- **WHEN** the schema defines a type with key `oscal-complete-oscal-control-common:parameter`
- **THEN** the canonical type name is `Parameter`

#### Scenario: MDL-001.02 Schema reorder does not change names

- **WHEN** a later OSCAL release reorders the top-level document definitions
- **THEN** every canonical type name stays the same, because names derive from the definition identity and not from
  position

#### Scenario: MDL-001.03 List items use the singular local name

- **WHEN** the list property `origins` of the `poam-item` definition holds inline objects, and the override data
  records the singular name `origin`
- **THEN** the canonical name of the item type is `PoamItemOrigin`

### Requirement: MDL-003 Scalar root wrappers collapse to plain aliased types

A schema definition that wraps a single scalar value SHALL become a plain typed value with its constraints attached, not
a wrapper object. An example is a constrained string such as a UUID. Two kinds of root wrapper types are the documented
exception and MUST stay as root-model wrappers. They are the top-level document union and each type of the
single-or-many kind that [MDL-012] defines.

#### Scenario: MDL-003.01 Scalar wrapper becomes a constrained value

- **WHEN** a definition wraps a single constrained string value
- **THEN** the binding exposes a constrained string type, not an object with one field

#### Scenario: MDL-003.02 Preserved wrappers stay wrappers

- **WHEN** the definition is the top-level document union or a type of the single-or-many kind
- **THEN** it remains a root-model wrapper and is not collapsed

### Requirement: MDL-005 Definitions that share a local name across modules get module-prefixed names

Several OSCAL definitions share a local name across different modules, and have different structures. For example,
`control-implementation` is a definition in both the Component Definition module and the System Security Plan module.
These definitions are different types, so the derivation MUST keep them distinct and MUST NOT merge them.

Two or more definitions can share a local name. The canonical name of each such definition SHALL be the PascalCase
module name followed by the PascalCase local name. The module name is the part of the namespace after
`oscal-complete-oscal-`. Examples are `ComponentDefinitionControlImplementation` and `SspControlImplementation`. This
rule applies to every definition in the clash, unless the naming manifest pins a name for that definition. A pinned
name has precedence, as the naming-manifest capability defines.

#### Scenario: MDL-005.01 Colliding short names get namespace-qualified names

- **WHEN** two definitions in different modules both have local name `control-implementation`
- **THEN** one becomes `ComponentDefinitionControlImplementation` and the other becomes `SspControlImplementation`

#### Scenario: MDL-005.02 Override map is the single source of truth

- **WHEN** two bindings generate their types from the same naming manifest
- **THEN** both use the module-prefixed names that the manifest records, so the qualified names match across every
  language binding

#### Scenario: MDL-005.03 A definition that clashes only with an inline type keeps its local name

- **WHEN** the `ssp` module defines `status`, and an inline object under `system-component` has local name `status`
- **THEN** the definition is named `Status` and the inline type is named `SystemComponentStatus`, because the inline
  type carries the canonical name of its parent

### Requirement: MDL-006 Union branches are named from the union and the property that only the branch has

OSCAL sometimes expresses a type as a choice between alternatives. The complete schema expresses the choice as a union
with one branch per alternative. Examples are the profile `merge` modes and the catalog `group` forms. Each branch
SHALL have a property that no other branch of the same union has. That property is the distinguishing property of the
branch. It is either a property that the branch requires, or a property that only the branch defines.

The canonical name of a branch SHALL be the canonical name of the union, then `With`, then the PascalCase name of the
distinguishing property. Examples are `CatalogGroupWithGroups` and `CatalogGroupWithControls`. The naming manifest can
replace a branch name with an override name. The canonical name of a union is its name under the rules for its place
in the schema, for example `Merge` for the `profile:merge` definition.

#### Scenario: MDL-006.01 Numbered variant gets a meaningful name

- **WHEN** the profile `merge` union has three branches that require `flat`, `as-is`, and `custom`
- **THEN** the branches are named `MergeWithFlat`, `MergeWithAsIs`, and `MergeWithCustom`, and no name carries an
  ordinal

#### Scenario: MDL-006.02 Branch named from its distinguishing property

- **WHEN** one branch of the `catalog:group` union defines `groups`, the other branch defines `controls`, and the
  naming manifest has no override for the branches
- **THEN** the branches are named `CatalogGroupWithGroups` and `CatalogGroupWithControls`

### Requirement: MDL-007 Derivation guards abort on ambiguity, count mismatch, or uncovered collision

The derivation SHALL fail loudly rather than emit wrong or colliding types. These guards are required:

1. An ambiguous wrapper MUST abort the derivation and name the offending wrapper. A wrapper is ambiguous when it does
   not have exactly one body field after the `$schema` directive field is excluded.
2. A mismatch between the count of derived document wrappers and the count of top-level document types in the schema
   MUST abort the derivation.
3. Any duplicate canonical type name that remains after renaming, and that the override map does not cover, MUST abort
   the derivation. The report MUST list all uncovered collisions at once, not only the first.
4. A list item without a singular local name MUST abort the derivation and name the list.
5. A union branch without exactly one distinguishing property MUST abort the derivation and name the branch.
6. Two places that [MDL-013] merges, and that are not structurally identical, MUST abort the derivation and name both
   places.

Guards 4, 5, and 6 report every failure at once, not only the first.

#### Scenario: MDL-007.01 Ambiguous wrapper aborts

- **WHEN** a wrapper has two body fields after the `$schema` directive field is excluded
- **THEN** the derivation stops and names that wrapper

#### Scenario: MDL-007.02 Wrapper count mismatch aborts

- **WHEN** the number of derived wrappers does not equal the number of top-level document types in the schema
- **THEN** the derivation stops

#### Scenario: MDL-007.03 Uncovered collisions are all reported

- **WHEN** two distinct definitions still resolve to the same canonical name and no override covers them
- **THEN** the derivation stops and reports every uncovered collision, not just the first one found

#### Scenario: MDL-007.04 Missing singular name aborts

- **WHEN** a list property holds inline items, and the override data has no singular local name for the items
- **THEN** the derivation stops and names the list property

#### Scenario: MDL-007.05 Branch without a distinguishing property aborts

- **WHEN** every property of a union branch also occurs in another branch of the same union
- **THEN** the derivation stops and names the branch

#### Scenario: MDL-007.06 Merge of different structures aborts

- **WHEN** the override data lists two places as an explicit merge, and the two places have different fields
- **THEN** the derivation stops and names both places

### Requirement: MDL-009 The naming manifest is the shared source of truth across languages

The derivation outputs described above SHALL be recorded in a machine-readable naming manifest that every language
binding consumes. Those outputs are:

1. The places in the schema that define each canonical type, and the name of the type.
2. The wrapper to body field.
3. The deduplication of copied types.
4. The module-prefixed names of colliding definitions.
5. The union branch names and their distinguishing properties.
6. The enums, each marked open or closed.

The naming-manifest capability defines the format of the manifest. Casing conventions remain language-specific. For
example, one language uses PascalCase types and another uses snake_case fields. The identity of each type and the
collision resolutions MUST come from the shared manifest, not from each binding re-deriving them. Because the manifest
records the deduplicated canonical set, a binding consumes one entry per canonical type and does not re-run a structural
comparison across places.

#### Scenario: MDL-009.01 Two bindings agree on a collision name

- **WHEN** a Go binding and a Rust binding both generate from the same schema and manifest
- **THEN** both resolve the colliding `control-implementation` definitions to the same two canonical identities

#### Scenario: MDL-009.02 A binding does not re-derive names

- **WHEN** a binding generates its types from the schema and the naming manifest
- **THEN** it takes every canonical type name from the manifest, and it does not apply the naming rules itself

## ADDED Requirements

### Requirement: MDL-010 Inline types are named from the canonical name of their parent and their own local name

An inline type is an object or a union in the complete schema that is not a definition. An example is the `status`
object that the `system-component` definition holds. The canonical name of an inline type SHALL be the canonical name
of its parent type, followed by its own PascalCase local name. The parent type is the nearest definition, inline type,
or union that holds the inline type. When a union branch holds the inline type, the parent type is the union, not the
branch.

The canonical name of the parent includes any override name of the parent. An override name of a type therefore also
changes the canonical names of the inline types that it holds.

#### Scenario: MDL-010.01 Inline object named from its parent

- **WHEN** the `system-component` definition holds an inline object in its `status` property
- **THEN** the canonical name of the inline type is `SystemComponentStatus`

#### Scenario: MDL-010.02 Two inline types with the same local name stay distinct

- **WHEN** the `system-component` definition and the `finding-target` definition each hold a different inline object
  in a `status` property
- **THEN** the inline types are named `SystemComponentStatus` and `FindingTargetStatus`

#### Scenario: MDL-010.03 Nested inline type uses the canonical name of its parent

- **WHEN** the `back-matter` definition holds the list item `resource`, and that item holds an inline object in its
  `citation` property
- **THEN** the item type is named `BackMatterResource`, and the inline object is named `BackMatterResourceCitation`

#### Scenario: MDL-010.04 Inline type in a union branch uses the name of the union

- **WHEN** a branch of the inline union `TaskTiming` holds an inline object in its `on-date` property
- **THEN** the canonical name of the inline object is `TaskTimingOnDate`

#### Scenario: MDL-010.05 Override name of a parent carries down

- **WHEN** the override data names the inline object `risk-log` of the `risk` definition `RiskLog`, and that object
  holds the list item `entry`
- **THEN** the canonical name of the item type is `RiskLogEntry`

### Requirement: MDL-011 Each enum site is a named type, marked open or closed

The complete schema holds each enum inside a property, together with a base datatype. Each enum site SHALL produce a
canonical enum type. This includes closed enums. The kinds of enum are:

1. An enum in an `anyOf` with its base datatype is open. A value from the enum is valid, and any other valid value of
   the base datatype is also valid.
2. An enum in an `allOf` with its base datatype is closed. Only a value from the enum is valid.

The canonical name of an enum SHALL be the canonical name of its owner type, followed by the PascalCase local name of
the property. The owner type is the nearest definition, inline type, or union that holds the property, as [MDL-010]
defines for a parent type. A definition can also hold an enum
directly, as its own `anyOf` or `allOf` with a base datatype. That enum SHALL take the canonical name of the
definition. When the property is a list, the
local name of the property is the singular name of one item, as [MDL-001] defines. The naming manifest SHALL record
whether each enum is open or closed. The manifest does not record the enum values or member names. The values come from
the schema. Member names are language-specific.

#### Scenario: MDL-011.01 Enum named from owner and property

- **WHEN** the `hash` definition holds an enum in its `algorithm` property
- **THEN** the canonical name of the enum is `HashAlgorithm`

#### Scenario: MDL-011.02 Closed enum gets a type

- **WHEN** the `parameter-selection` definition holds the values `one` and `one-or-more` in an `allOf` with a token
  datatype, in its `how-many` property
- **THEN** the derivation produces a closed enum type named `ParameterSelectionHowMany`

#### Scenario: MDL-011.03 Open enum is marked open

- **WHEN** the `hash` definition holds the `algorithm` enum in an `anyOf` with a string datatype
- **THEN** the naming manifest marks `HashAlgorithm` as open

#### Scenario: MDL-011.04 Enum held directly by a definition

- **WHEN** the `assessment-common:risk-status` definition is an `anyOf` of a token datatype and an enum
- **THEN** the derivation produces an open enum type named `RiskStatus`

#### Scenario: MDL-011.05 Enums of an inline owner share its canonical name

- **WHEN** the inline `status` object of the `finding-target` definition holds an enum in its `state` property and an
  enum in its `reason` property
- **THEN** the enums are named `FindingTargetStatusState` and `FindingTargetStatusReason`

#### Scenario: MDL-011.06 Enums with the same owner local name stay distinct

- **WHEN** the `ssp:status` definition, the inline `status` object of `system-component`, and the inline `status`
  object of `finding-target` each hold an enum in a `state` property
- **THEN** the enums are named `StatusState`, `SystemComponentStatusState`, and `FindingTargetStatusState`

### Requirement: MDL-012 A property that holds one item or a list of items is a single-or-many type

The complete schema expresses some properties as a union of one item and a list of one or more of the same item. An
example is the `mappings` property of the `mapping-collection` definition. Such a property SHALL produce a type of the
single-or-many kind, not a union with named branches. The canonical name of the type SHALL be the canonical name of
its owner type, as [MDL-011] defines, followed by the PascalCase property key. The naming manifest SHALL record the
canonical name of the item type.

#### Scenario: MDL-012.01 One-or-list property is a single-or-many type

- **WHEN** the `mappings` property of the `mapping-collection` definition accepts one `mapping` or a list of
  `mapping` items
- **THEN** the derivation produces a single-or-many type named `MappingCollectionMappings` with item type `Mapping`

### Requirement: MDL-013 Types deduplicate only for union-branch copies and explicit merges

OSCAL defines shared element types that several document types use. Examples are `metadata`, `property`, `link`, and
`hash`. The complete OSCAL schema defines each shared type once, as a definition, and references it from each place
that uses it. Each such definition SHALL produce a single canonical type.

The complete schema also copies one OSCAL type into more than one place. When the schema expands a union, it copies
the content that the branches share into each branch. Two places SHALL produce one canonical type only when one of
these conditions applies:

1. The JSON pointers of the two places differ only in the index of one or more union branches.
2. The naming manifest lists the two places as an explicit merge.

Equal structure alone MUST NOT merge two places. Two enums with the same values at unrelated places stay two types.
Two places that are merged MUST be structurally identical. "Structurally identical" means the same fields, the same
field types, and the same constraints. [MDL-007] defines the failure when they are not.

This requirement is the counterpart of the name-collision requirement, and the two MUST NOT be conflated. A merge
produces one type from two places. A collision is two different types that resolve to the same name, which [MDL-005]
and [MDL-007] handle.

#### Scenario: MDL-013.01 A shared type referenced by many document types yields one canonical type

- **WHEN** several document types use the `metadata` element type
- **THEN** the derivation produces a single `Metadata` type, not one Metadata type per document type

#### Scenario: MDL-013.02 Same name but different structure is not deduplicated

- **WHEN** two definitions share a local name but differ in their fields or constraints
- **THEN** the derivation keeps them as two distinct types and does not merge them

#### Scenario: MDL-013.03 Copies in union branches merge

- **WHEN** the two branches of the `parties` union each hold an `external-ids` list with the same item structure
- **THEN** the derivation produces one canonical type for the item, and the naming manifest records both places for it

#### Scenario: MDL-013.04 Equal enum values at unrelated places do not merge

- **WHEN** two enums at unrelated places have the same values, and the naming manifest does not list them as an
  explicit merge
- **THEN** the derivation produces two enum types

## REMOVED Requirements

### Requirement: MDL-004 Structurally identical types deduplicate to a single canonical type

**Reason**: The binding takes type identity from the naming manifest, which identifies places by JSON pointers into the
complete schema. Deduplication from the per-document schemas and deduplication by equal structure alone are not part
of the contract.

**Migration**: [MDL-013] holds the deduplication rule. A binding reads the merged places from the naming manifest.
