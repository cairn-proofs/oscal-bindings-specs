# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: CNS-006 The manifest selects nodes with RFC 9535 queries`
- TO: `### Requirement: CNS-006 A binding evaluates the queries of the manifest as RFC 9535 defines`
- FROM: `### Requirement: CNS-007 Each entry selects context nodes and target nodes`
- TO: `### Requirement: CNS-007 A binding runs each query of an entry on its own input`

## MODIFIED Requirements

### Requirement: CNS-006 A binding evaluates the queries of the manifest as RFC 9535 defines

A binding SHALL evaluate each query of the manifest as RFC 9535 defines. When several queries of one entry select
nodes for the same purpose, the result is the union of their nodes, each node once.

#### Scenario: CNS-006.01 Two queries select the same node

- **WHEN** two queries of one entry select the same node for the same purpose
- **THEN** the result holds that node once

### Requirement: CNS-007 A binding runs each query of an entry on its own input

A binding SHALL run the queries that [STO-060] names as follows. It runs the document context queries on the document.
It runs the element context queries on an array that holds only the element. It runs the target queries on an array
that holds only one context node, and they select the target nodes of that context node.

#### Scenario: CNS-007.01 A target in another document

- **WHEN** the Metapath target of a constraint is a union of a path in the same document and a
  `doc()` path into another document
- **THEN** the target queries select only the nodes of that union in the same document

#### Scenario: CNS-007.02 Element context queries of a type

- **WHEN** an element of the type `hash` is the only input
- **THEN** the element context queries of the type `hash` select the context nodes of the
  `matches` entries for hash lengths from it

### Requirement: CNS-009 An element decides an allowed-values entry only with its applicable set

An `allowed-values` entry SHALL have the element context queries of [STO-060] for an element type
when, and only when, the element holds the context node of each entry that can be in the
applicable set of [CNS-008] of each target node of the entry in an element of that type.

#### Scenario: CNS-009.01 A property name that a parent entry allows

- **WHEN** the entry on `property` lists only the name `marking`, and an entry declared on a
  control lists more names for the properties of the control
- **THEN** the entry on `property` has no element context queries for the type `property`, and a
  standalone property with the name `sort-id` gives no failure

### Requirement: CNS-017 A document meets the manifest when no entry fails for it

A document meets the constraint manifest when no entry gives a failure for it, with the document
context queries of [STO-060]. The requirement for the kind of an entry states when the entry
gives a failure. Each failure SHALL have a location and the `id` of its entry. The location is the
location of [CNS-024] of the target node, or of the context node for a `has-cardinality` entry.
An entry SHALL give at most one failure for one location, or for one location and one key of
[CNS-012].

#### Scenario: CNS-017.01 A document with one failure

- **WHEN** a document conforms to the schema, and one entry gives one failure for it
- **THEN** the document does not meet the constraint manifest

#### Scenario: CNS-017.02 A document with no failure

- **WHEN** a document conforms to the schema, and no entry gives a failure for it
- **THEN** the document meets the constraint manifest

#### Scenario: CNS-017.03 A target node of two context nodes

- **WHEN** a control holds a control enhancement, the enhancement holds a part with a name that
  `oscal-control-statement-part-name` does not allow, and the target queries of the entry select
  the part from both controls
- **THEN** the entry gives one failure for the part
