# model-derivation Specification

## Purpose

Defines how an implementation turns the OSCAL JSON Schema into canonical, language-neutral type names and type kinds.
Every language binding then derives the same names from the same schema, and the collision overrides never diverge.

## Requirements

### Requirement: MDL-001 Canonical type names derive from OSCAL name scopes, not from generator ordinals

The canonical name of each type SHALL derive from the place in the complete OSCAL schema that defines the type, and
from the name scope that OSCAL gives that place. It MUST NOT derive from the order in which a code generator walks the
schema. An implementation MUST NOT key names on generator-assigned ordinals such as `Model1`, `Type3`, or `Status1`.

#### Scenario: MDL-001.02 Schema reorder does not change names

- **WHEN** a later OSCAL release reorders the top-level document definitions
- **THEN** every canonical type name stays the same, because names derive from the definition identity and not from
  position

### Requirement: MDL-014 Each place in the schema has a local name

The local name of a place in the complete schema SHALL be one of these:

1. For a definition with key `<namespace>:<local-name>`: `<local-name>`.
2. For an object that a property holds directly: the property key.
3. For the item of a list property: the singular name of one item, for example `origin` for the list `origins`. The
   override data of the naming manifest records it, because the schema does not hold it.
4. For a union branch: the local name of the union.

#### Scenario: MDL-014.01 Local name of a definition

- **WHEN** the schema defines the key `oscal-complete-oscal-metadata:hash`
- **THEN** the local name of the definition is `hash`

#### Scenario: MDL-014.02 Local name of a list item

- **WHEN** the list property `methods` of the `observation` definition holds items, and the override data records the
  singular name `method` for them
- **THEN** the local name of the item is `method`, not `methods`

### Requirement: MDL-015 A definition is named from its local name

The canonical name of a definition SHALL be the PascalCase form of its local name, as [MDL-014] defines.

#### Scenario: MDL-015.01 Local name maps to PascalCase

- **WHEN** the schema defines a type with key `oscal-complete-oscal-control-common:parameter`
- **THEN** the canonical type name is `Parameter`

### Requirement: MDL-016 The root schema is named OscalDocument

The root schema is the union of the document wrappers. Its canonical name SHALL be `OscalDocument`.

#### Scenario: MDL-016.01 Root schema name

- **WHEN** the derivation names the root schema
- **THEN** the canonical name is `OscalDocument`

### Requirement: MDL-017 An override name has the status of a rule-derived name

The naming manifest can replace a rule-derived name with an override name. A replacement name SHALL have the same
status as a rule-derived name.

#### Scenario: MDL-017.01 Override name replaces a rule-derived name

- **WHEN** the override data names the inline object `risk-log` of the `risk` definition `RiskLog`
- **THEN** the canonical name of the inline object is `RiskLog`

### Requirement: MDL-002 Document wrapper names derive from each wrapper's single body field

OSCAL defines one wrapper type for each document type. Each wrapper holds exactly one body field, for example `catalog`
or `system-security-plan`, and the `$schema` directive field. The implementation SHALL name each wrapper
`<PascalCaseBodyField>Document`. It SHALL read the body field from the wrapper itself, with the `$schema` directive
field excluded.

#### Scenario: MDL-002.01 Wrapper named from its body field

- **WHEN** a wrapper type holds a single body field `system-security-plan` plus the `$schema` directive field
- **THEN** the wrapper's canonical name is `SystemSecurityPlanDocument`

#### Scenario: MDL-002.02 Schema directive field is excluded from derivation

- **WHEN** the derivation inspects a wrapper's fields to find its body field
- **THEN** the `$schema` directive field is not treated as the body field

#### Scenario: MDL-002.03 The eight wrapper names

- **WHEN** the derivation names the document wrappers of the complete schema
- **THEN** the names are `CatalogDocument`, `ProfileDocument`, `ComponentDefinitionDocument`,
  `SystemSecurityPlanDocument`, `AssessmentPlanDocument`, `AssessmentResultsDocument`,
  `PlanOfActionAndMilestonesDocument`, and `MappingCollectionDocument`

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

OSCAL definitions in different modules can share a local name and have different structures. The derivation MUST
keep such definitions distinct and MUST NOT merge them. When two or more definitions share a local name, the canonical
name of each SHALL be the PascalCase module name, then the PascalCase local name. The module name is the part of the
namespace after `oscal-complete-oscal-`. A name that the naming manifest pins for a definition has precedence over
this rule.

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

The complete schema expresses a choice between alternatives as a union with one branch for each alternative. Each
branch SHALL have a distinguishing property that no other branch of the union has. The branch requires that property,
or only the branch defines it. The canonical name of a branch SHALL be the canonical name of the union, then `With`,
then the PascalCase name of the distinguishing property. The canonical name of the union comes from the rules for its
place in the schema.

#### Scenario: MDL-006.01 Numbered variant gets a meaningful name

- **WHEN** the profile `merge` union has three branches that require `flat`, `as-is`, and `custom`
- **THEN** the branches are named `MergeWithFlat`, `MergeWithAsIs`, and `MergeWithCustom`, and no name carries an
  ordinal

#### Scenario: MDL-006.02 Branch named from its distinguishing property

- **WHEN** one branch of the `catalog:group` union defines `groups`, the other branch defines `controls`, and the
  naming manifest has no override for the branches
- **THEN** the branches are named `CatalogGroupWithGroups` and `CatalogGroupWithControls`

#### Scenario: MDL-006.03 Union named from its place

- **WHEN** the `profile:merge` definition is a union
- **THEN** the canonical name of the union is `Merge`, as for any definition, and each branch name starts with `Merge`

### Requirement: MDL-007 Derivation guards abort on ambiguity, count mismatch, or uncovered collision

The derivation MUST abort, and MUST NOT emit wrong or colliding types, in each of these cases:

1. A wrapper does not have exactly one body field, with the `$schema` directive field excluded. The report MUST name
   the wrapper.
2. The count of derived wrappers differs from the count of top-level document types.
3. A duplicate canonical name remains after renaming, and no override covers it. The report MUST list each uncovered
   collision at once.

#### Scenario: MDL-007.01 Ambiguous wrapper aborts

- **WHEN** a wrapper has two body fields after the `$schema` directive field is excluded
- **THEN** the derivation stops and names that wrapper

#### Scenario: MDL-007.02 Wrapper count mismatch aborts

- **WHEN** the number of derived wrappers does not equal the number of top-level document types in the schema
- **THEN** the derivation stops

#### Scenario: MDL-007.03 Uncovered collisions are all reported

- **WHEN** two distinct definitions still resolve to the same canonical name and no override covers them
- **THEN** the derivation stops and reports every uncovered collision, not just the first one found

### Requirement: MDL-008 Models reject unknown fields (strict coverage)

Every object type SHALL reject unknown input fields. A binding is generated from one vendored OSCAL release. The binding
therefore rejects a later-release document that carries a field the vendored release did not define. "Supports OSCAL
1.x" therefore means "supports the vendored release and earlier." An implementation MUST NOT silently accept and drop
unknown fields, because a later serialization would then lose them.

#### Scenario: MDL-008.01 Unknown field is rejected

- **WHEN** a document carries a field that the vendored schema release does not define
- **THEN** parsing fails rather than ignoring the unknown field

### Requirement: MDL-009 The naming manifest is the shared source of truth across languages

The derivation SHALL record these outputs in a naming manifest that each language binding reads:

1. The name of each canonical type and the places that define it.
2. The body field of each wrapper.
3. The deduplication of copied types.
4. The module-prefixed names of colliding definitions.
5. The union branch names and their distinguishing properties.
6. Whether each enum is open or closed.

Each binding MUST take the identity of each type and the collision resolutions from the manifest.

#### Scenario: MDL-009.01 Two bindings agree on a collision name

- **WHEN** a Go binding and a Rust binding both generate from the same schema and manifest
- **THEN** both resolve the colliding `control-implementation` definitions to the same two canonical identities

#### Scenario: MDL-009.02 A binding does not re-derive names

- **WHEN** a binding generates its types from the schema and the naming manifest
- **THEN** it takes every canonical type name from the manifest, and it does not apply the naming rules itself

### Requirement: MDL-010 Inline types are named from the canonical name of their parent and their own local name

An inline type is an object or a union in the complete schema that is not a definition. The canonical name of an
inline type SHALL be the canonical name of its parent type, followed by its own PascalCase local name. The parent type
is the nearest definition, inline type, or union that holds the inline type. When a union branch holds the inline
type, the parent type is the union, not the branch. The canonical name of the parent includes any override name of the
parent.

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

#### Scenario: MDL-010.06 List items use the singular local name

- **WHEN** the list property `origins` of the `poam-item` definition holds inline objects, and the override data
  records the singular name `origin`
- **THEN** the canonical name of the item type is `PoamItemOrigin`

### Requirement: MDL-011 Each enum site is a named type, marked open or closed

Each enum site SHALL produce a canonical enum type, also for a closed enum. The kinds of enum are:

1. An enum in an `anyOf` with its base datatype is open: each valid value of the base datatype is valid.
2. An enum in an `allOf` with its base datatype is closed: only a value from the enum is valid.

The naming manifest SHALL record whether each enum is open or closed. It does not record the enum values or member
names.

#### Scenario: MDL-011.02 Closed enum gets a type

- **WHEN** the `parameter-selection` definition holds the values `one` and `one-or-more` in an `allOf` with a token
  datatype, in its `how-many` property
- **THEN** the derivation produces a closed enum type named `ParameterSelectionHowMany`

#### Scenario: MDL-011.03 Open enum is marked open

- **WHEN** the `hash` definition holds the `algorithm` enum in an `anyOf` with a string datatype
- **THEN** the naming manifest marks `HashAlgorithm` as open

### Requirement: MDL-018 An enum is named from its owner type and its property

The canonical name of an enum SHALL be the canonical name of its owner type, then the PascalCase local
name of its property. The owner type is the nearest definition, inline type, or union that holds the property, as
[MDL-010] defines for a parent type. For a list property, the local name is the singular name of an item, as
[MDL-014] defines. An enum that a definition holds directly, as its own `anyOf` or `allOf` with a base datatype, SHALL
take the canonical name of the definition.

#### Scenario: MDL-018.01 Enum named from owner and property

- **WHEN** the `hash` definition holds an enum in its `algorithm` property
- **THEN** the canonical name of the enum is `HashAlgorithm`

#### Scenario: MDL-018.02 Enum held directly by a definition

- **WHEN** the `assessment-common:risk-status` definition is an `anyOf` of a token datatype and an enum
- **THEN** the derivation produces an open enum type named `RiskStatus`

#### Scenario: MDL-018.03 Enums of an inline owner share its canonical name

- **WHEN** the inline `status` object of the `finding-target` definition holds an enum in its `state` property and an
  enum in its `reason` property
- **THEN** the enums are named `FindingTargetStatusState` and `FindingTargetStatusReason`

#### Scenario: MDL-018.04 Enums with the same owner local name stay distinct

- **WHEN** the `ssp:status` definition, the inline `status` object of `system-component`, and the inline `status`
  object of `finding-target` each hold an enum in a `state` property
- **THEN** the enums are named `StatusState`, `SystemComponentStatusState`, and `FindingTargetStatusState`

#### Scenario: MDL-018.05 Enum in a list property uses the singular name

- **WHEN** the `observation` definition holds an enum in the items of its list property `methods`, and the override
  data records the singular name `method`
- **THEN** the canonical name of the enum is `ObservationMethod`

### Requirement: MDL-012 A property that holds one item or a list of items is a single-or-many type

The complete schema expresses some properties as a union of one item and a list of one or more of the same item. Such
a property SHALL produce a type of the single-or-many kind, not a union with named branches. The canonical name of the
type SHALL be the canonical name of the nearest definition, inline type, or union that holds the property, followed by
the PascalCase property key. The naming manifest SHALL record the canonical name of the item type.

#### Scenario: MDL-012.01 One-or-list property is a single-or-many type

- **WHEN** the `mappings` property of the `mapping-collection` definition accepts one `mapping` or a list of
  `mapping` items
- **THEN** the derivation produces a single-or-many type named `MappingCollectionMappings` with item type `Mapping`

### Requirement: MDL-013 Types deduplicate only for union-branch copies and explicit merges

The definition of each shared element type that several document types use, for example `metadata`, SHALL produce a
single canonical type. Two places SHALL produce one canonical type only when one of these conditions applies:

1. The JSON pointers of the two places differ only in the index of one or more union branches.
2. The naming manifest lists the two places as an explicit merge.

Equal structure alone MUST NOT merge two places.

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

### Requirement: MDL-019 Merged places are structurally identical

Two places that [MDL-013] merges MUST be structurally identical. "Structurally identical" means the same fields, the
same field types, and the same constraints.

#### Scenario: MDL-019.01 Identical places merge

- **WHEN** the override data lists two places as an explicit merge, and the two places have the same fields, field
  types, and constraints
- **THEN** the derivation produces one canonical type, and the naming manifest records both places for it

### Requirement: MDL-020 A merge is not a name collision

A merge of [MDL-013] and a name collision MUST NOT be conflated. A merge produces one type from two places. A
collision is two different types that resolve to the same name, which [MDL-005] and [MDL-007] handle.

#### Scenario: MDL-020.01 Clashing definitions are not merged

- **WHEN** two definitions in different modules have the local name `control-implementation`, and the naming manifest
  does not list them as an explicit merge
- **THEN** the derivation produces two types with module-prefixed names, and the naming manifest records no merge of
  them

### Requirement: MDL-021 Derivation guards abort on a missing singular name, an ambiguous branch, or an unequal merge

The derivation SHALL also apply these guards:

1. A list item without a singular local name of [MDL-014] MUST abort the derivation and name the list.
2. A union branch without exactly one distinguishing property of [MDL-006] MUST abort the derivation and name the
   branch.
3. Two places that [MDL-013] merges, and that are not structurally identical as [MDL-019] defines, MUST abort the
   derivation and name both places.

Each of these guards reports every failure at once.

#### Scenario: MDL-021.01 Missing singular name aborts

- **WHEN** a list property holds inline items, and the override data has no singular local name for the items
- **THEN** the derivation stops and names the list property

#### Scenario: MDL-021.02 Branch without a distinguishing property aborts

- **WHEN** every property of a union branch also occurs in another branch of the same union
- **THEN** the derivation stops and names the branch

#### Scenario: MDL-021.03 Merge of different structures aborts

- **WHEN** the override data lists two places as an explicit merge, and the two places have different fields
- **THEN** the derivation stops and names both places

#### Scenario: MDL-021.04 Each missing singular name is reported

- **WHEN** two list properties hold inline items, and the override data has no singular local name for either
- **THEN** the derivation stops and names both list properties
