## Purpose

Defines how an implementation turns the OSCAL JSON Schema into canonical, language-neutral type names and type kinds.
Every language binding then derives the same names from the same schema, and the collision overrides never diverge.

## ADDED Requirements

### Requirement: MDL-001 Canonical type names derive from the schema `$id`, not from generator ordinals

The canonical name of each generated object type SHALL derive from the schema definition it represents. It MUST NOT
derive from the order in which a code generator walks the schema. Consider a definition whose key has the form
`<namespace>:<local-name>`. The canonical name is the PascalCase form of `<local-name>`, unless an override in this
capability renames it. For example, `parameter` becomes `Parameter`. An implementation MUST NOT key names on
generator-assigned ordinals such as `Model1` or `Model8`.

#### Scenario: MDL-001.01 Local name maps to PascalCase

- **WHEN** the schema defines a type with key `oscal-complete-oscal-control-common:parameter`
- **THEN** the canonical type name is `Parameter`

#### Scenario: MDL-001.02 Schema reorder does not change names

- **WHEN** a later OSCAL release reorders the top-level document definitions
- **THEN** every canonical type name stays the same, because names derive from the definition identity and not from
  position

### Requirement: MDL-002 Document wrapper names derive from each wrapper's single body field

OSCAL defines one wrapper type per document type. Each wrapper holds exactly one body field (for example `catalog` or
`system-security-plan`) in addition to the `$schema` directive field. The implementation SHALL name each wrapper
`<PascalCaseBodyField>Document`, with the body field read from the wrapper itself and the `$schema` directive field
excluded. The eight wrapper names are `CatalogDocument`, `ProfileDocument`, `ComponentDefinitionDocument`,
`SystemSecurityPlanDocument`, `AssessmentPlanDocument`, `AssessmentResultsDocument`,
`PlanOfActionAndMilestonesDocument`, and `MappingCollectionDocument`.

#### Scenario: MDL-002.01 Wrapper named from its body field

- **WHEN** a wrapper type holds a single body field `system-security-plan` plus the `$schema` directive field
- **THEN** the wrapper's canonical name is `SystemSecurityPlanDocument`

#### Scenario: MDL-002.02 Schema directive field is excluded from derivation

- **WHEN** the derivation inspects a wrapper's fields to find its body field
- **THEN** the `$schema` directive field is not treated as the body field

### Requirement: MDL-003 Scalar root wrappers collapse to plain aliased types

A schema definition that wraps a single scalar value SHALL become a plain typed value with its constraints attached, not
a wrapper object. An example is a constrained string such as a UUID. Two root wrapper types are the documented exception
and MUST stay as root-model wrappers: the top-level document union and the `Mappings` type.

#### Scenario: MDL-003.01 Scalar wrapper becomes a constrained value

- **WHEN** a definition wraps a single constrained string value
- **THEN** the binding exposes a constrained string type, not an object with one field

#### Scenario: MDL-003.02 Preserved wrappers stay wrappers

- **WHEN** the definition is the top-level document union or `Mappings`
- **THEN** it remains a root-model wrapper and is not collapsed

### Requirement: MDL-004 Structurally identical types deduplicate to a single canonical type

OSCAL defines shared element types that several document types use. Examples are `metadata`, `property`, `link`, and
`hash`. Consider two schema definitions with the same local name and the same structure. The derivation SHALL produce a single
canonical type for them, not one type per namespace. "Same structure" means the same fields, the same field types, and
the same constraints. This outcome is required regardless of the input topology. It holds whether the input is the single
complete OSCAL schema or the set of per-document schemas.

The complete OSCAL schema defines each shared type once in a common namespace and references it from each document type.
Deduplication is therefore already present in that input. The per-document schemas instead inline a separate copy of each
shared type. An implementation that derives from the per-document schemas MUST still produce one canonical type for each
structurally identical set. It MUST NOT emit a per-document duplicate, such as a separate Metadata type for each document
type.

This requirement is the counterpart of the name-collision requirement, and the two MUST NOT be conflated. Same local
name with the same structure deduplicates to one type. Same local name with a different structure stays as two distinct
types that the name-collision override map renames.

#### Scenario: MDL-004.01 A shared type referenced by many document types yields one canonical type

- **WHEN** several document types use the `metadata` element type
- **THEN** the derivation produces a single `Metadata` type, not one Metadata type per document type

#### Scenario: MDL-004.02 Deduplication holds for the per-document schema input

- **WHEN** the derivation reads the per-document schemas, each of which inlines its own `metadata` copy
- **THEN** the derivation still produces a single `Metadata` type

#### Scenario: MDL-004.03 Same name but different structure is not deduplicated

- **WHEN** two definitions share a local name but differ in their fields or constraints
- **THEN** the derivation keeps them as two distinct types and does not merge them

### Requirement: MDL-005 A fixed override map resolves cross-type name collisions

This requirement handles the opposite case from deduplication. These definitions share a short local name but are
genuinely different types, so the derivation MUST keep them distinct rather than merge them. Several OSCAL definitions
share a short local name across different namespaces. For example, `control-implementation` appears under both the
Component Definition and the System Security Plan namespaces, with different structures. The implementation SHALL carry a
fixed override map. The map assigns a namespace-qualified name to each colliding definition, so each resolves to a distinct,
stable canonical name. The overrides are `ComponentDefinitionControlImplementation` versus
`SspControlImplementation`, `CatalogGroup` versus `ProfileGroup`, `ComponentDefinitionImplementedRequirement` versus
`SspImplementedRequirement`, `ControlCommonSelectControlById` versus `AssessmentCommonSelectControlById`,
`ComponentDefinitionStatement` versus `SspStatement`, and the inline-collision overrides `SspStatus`,
`AssessmentCommonOrigin`, and `PoamLocalDefinitions`.

#### Scenario: MDL-005.01 Colliding short names get namespace-qualified names

- **WHEN** two definitions in different namespaces both have local name `control-implementation`
- **THEN** one becomes `ComponentDefinitionControlImplementation` and the other becomes `SspControlImplementation`

#### Scenario: MDL-005.02 Override map is the single source of truth

- **WHEN** a port derives names from the schema
- **THEN** it applies the same override map, so the qualified names match across every language binding

### Requirement: MDL-006 A fixed variant-rename map names split-constraint variants

OSCAL sometimes expresses a type as several mutually exclusive constraint variants, such as the profile `merge` modes and
the catalog `group` forms. A code generator produces numbered variant names for these. The implementation SHALL rename
them to stable, meaningful names through a fixed variant-rename map. The variant renames are `MergeFlat`,
`MergeAsIs`, `MergeCustom`, `CatalogGroupWithGroups`, and `CatalogGroupWithControls`.

#### Scenario: MDL-006.01 Numbered variant gets a meaningful name

- **WHEN** the generator produces three numbered variants of the profile `merge` type
- **THEN** they become `MergeFlat`, `MergeAsIs`, and `MergeCustom`

### Requirement: MDL-007 Derivation guards abort on ambiguity, count mismatch, or uncovered collision

The derivation SHALL fail loudly rather than emit wrong or colliding types. Three guards are required:

1. An ambiguous wrapper MUST abort the derivation and name the offending wrapper. A wrapper is ambiguous when it does not
   have exactly one body field after the `$schema` directive field is excluded.
2. A mismatch between the count of derived document wrappers and the count of top-level document types in the schema MUST
   abort the derivation.
3. Any duplicate canonical type name that remains after renaming, and that the override map does not cover, MUST abort
   the derivation. The report MUST list all uncovered collisions at once, not only the first.

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
therefore rejects a later-release document that carries a field the vendored release did not define. "Supports OSCAL 1.x"
therefore means "supports the vendored release and earlier." An implementation MUST NOT silently accept and drop unknown
fields, because a later serialization would then lose them.

#### Scenario: MDL-008.01 Unknown field is rejected

- **WHEN** a document carries a field that the vendored schema release does not define
- **THEN** parsing fails rather than ignoring the unknown field

### Requirement: MDL-009 The naming manifest is the shared source of truth across languages

The derivation outputs described above SHALL be expressible as a machine-readable manifest that every language binding
consumes. Those outputs are:

1. the schema `$id` to canonical name,
2. the wrapper to body field,
3. the deduplication of structurally identical types,
4. the collision overrides,
5. the variant renames, and
6. the enums.

Casing conventions remain language-specific. For example, one language uses PascalCase types and another uses snake_case
fields. The identity of each
type and the collision resolutions MUST come from the shared manifest, not from each port re-deriving them. Because the
manifest records the deduplicated canonical set, a port consumes one entry per canonical type and does not re-run a
structural comparison across namespaces.

#### Scenario: MDL-009.01 Two ports agree on a collision name

- **WHEN** a Go binding and a Rust binding both generate from the same schema and manifest
- **THEN** both resolve the colliding `control-implementation` definitions to the same two canonical identities
