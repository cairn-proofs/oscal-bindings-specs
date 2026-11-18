# constraint-validation Specification

## Purpose

Defines the constraints of the OSCAL metaschema that decide whether a document or an element is
valid. Covers the vendored metaschema, the constraint manifest that the store generates from it,
the rule for each constraint kind, and how the store checks the manifest.

## Requirements

### Requirement: CNS-001 The store vendors the metaschema of each vendored OSCAL release

For each vendored OSCAL release, `metaschema/<release>/` SHALL hold these files:

1. The `oscal_*_metaschema_RESOLVED.xml` modules that the release of `usnistgov/OSCAL` publishes
   as assets.
2. `metaschema-datatypes.xsd` of `usnistgov/metaschema`, at the commit that `SOURCE.md` records.

Each file SHALL have the bytes of its source, and `SHA256SUMS` SHALL list its digest. The store
checks SHALL fail on a digest that does not match. The spec artifact SHALL hold the directory.

#### Scenario: CNS-001.01 A changed module fails the store checks

- **WHEN** a file in `metaschema/1.2.3/` differs from the digest that `SHA256SUMS` lists for it
- **THEN** the store checks fail

#### Scenario: CNS-001.02 The spec artifact holds the metaschema

- **WHEN** a consumer reads the spec artifact
- **THEN** it holds `metaschema/1.2.3/` with each module, `metaschema-datatypes.xsd` and its
  `SHA256SUMS`

### Requirement: CNS-002 A constraint that cannot work as written is defective

A constraint is an `allowed-values`, `matches`, `has-cardinality`, `is-unique`, `index`,
`index-has-key` or `expect` element of a module. The store SHALL treat an ERROR or CRITICAL
constraint as defective when:

1. Its target selects nothing in any document that conforms to the schema.
2. It fails for a node that a filter of its target excludes.
3. It fails for each node that it selects in each document that the schema and other
   constraints allow.
4. It gives a Metapath error for a target node.

#### Scenario: CNS-002.01 A target that selects nothing

- **WHEN** a constraint targets a child `type` of `action`, and `type` is a flag of `action`
- **THEN** the constraint is defective

#### Scenario: CNS-002.02 A failure for an excluded node

- **WHEN** a `has-cardinality` constraint on assessment parts has a minimum of 1 and a target
  that starts with a filter on `@name='objective'`, and an assessment part has another name
- **THEN** the constraint fails for that part, and the constraint is defective

#### Scenario: CNS-002.03 A has-cardinality constraint that no document meets

- **WHEN** a `has-cardinality` constraint on local objectives has a minimum of 1, and no other
  constraint allows its target
- **THEN** the constraint fails for each local objective, and the constraint is defective

### Requirement: CNS-003 The exclusion list names each defective constraint with its issue

The store SHALL list each defective constraint of [CNS-002] in the list `excluded` of the
exclusion list `manifest/<release>/constraint-exclusions.json`, and no other constraint. Each item
SHALL identify one constraint by its `id`, or, for a constraint without an `id`, by its module,
its declaring definition and its kind. Each item SHALL hold the URL of an issue of
`usnistgov/OSCAL` that reports the defect. The store checks SHALL fail when an item identifies no
constraint, or more than one.

#### Scenario: CNS-003.01 An item that identifies no constraint

- **WHEN** an item of the list `excluded` holds a constraint `id` that no vendored module holds
- **THEN** the store checks fail

#### Scenario: CNS-003.02 Each item holds its issue

- **WHEN** a consumer reads an item of the list `excluded`
- **THEN** the item holds the URL of an issue of `usnistgov/OSCAL`

### Requirement: CNS-004 The store publishes a constraint manifest for each release

The store SHALL publish the constraint manifest `manifest/<release>/constraints.json`. The store
SHALL generate it from the vendored metaschema, the naming manifest and the exclusion list of
[CNS-003]. The store checks SHALL fail when the file differs from the result of the generation.
The manifest SHALL hold its format version in the member `format`. It SHALL conform to the JSON
Schema `manifest/constraints.schema.json`. The spec artifact SHALL hold both files.

#### Scenario: CNS-004.01 An edit by hand fails the store checks

- **WHEN** a person edits `manifest/1.2.3/constraints.json` by hand
- **THEN** the file differs from the result of the generation, and the store checks fail

#### Scenario: CNS-004.02 The manifest conforms to its JSON Schema

- **WHEN** the store checks read the manifest
- **THEN** the manifest conforms to `manifest/constraints.schema.json`, or the store checks fail

### Requirement: CNS-005 The manifest holds each constraint that can decide validity

The manifest SHALL hold one entry for each constraint whose level is ERROR or CRITICAL, unless
the list `excluded` of [CNS-003] lists it. A constraint without a level has the level ERROR. It
SHALL hold no other entry. Each entry SHALL hold the kind and the level of its constraint, and the
`id` of the constraint, or null when it has none. Two entries can have the same `id`.

#### Scenario: CNS-005.01 A warning is not in the manifest

- **WHEN** a constraint has the level WARNING
- **THEN** the manifest holds no entry for it

#### Scenario: CNS-005.02 An excluded constraint is not in the manifest

- **WHEN** the list `excluded` lists a constraint of level ERROR
- **THEN** the manifest holds no entry for it

### Requirement: CNS-006 The manifest selects nodes with RFC 9535 queries

Each entry SHALL select nodes with queries in the syntax of RFC 9535 (JSONPath). A query of the
manifest SHALL use only the syntax and the functions of RFC 9535. Each regular expression in it
SHALL be an I-Regexp of RFC 9485. An implementation SHALL evaluate each query as RFC 9535
defines. When several queries of one entry select nodes for the same purpose, the result is the
union of their nodes, each node once.

#### Scenario: CNS-006.01 Two queries select the same node

- **WHEN** two queries of one entry select the same node for the same purpose
- **THEN** the result holds that node once

### Requirement: CNS-007 Each entry selects context nodes and target nodes

Each entry SHALL hold these queries of [CNS-006]:

1. Document context queries. They select from a document the context nodes, to which the
   constraint applies.
2. Element context queries for each element type whose element can hold a context node. They run
   on an array that holds only the element. An `allowed-values` entry can lack them for a type,
   as a later requirement states.
3. Target queries. They run on an array that holds only one context node, and select its target
   nodes.

#### Scenario: CNS-007.01 A target in another document

- **WHEN** the Metapath target of a constraint is a union of a path in the same document and a
  `doc()` path into another document
- **THEN** the target queries select only the nodes of that union in the same document

#### Scenario: CNS-007.02 Element context queries of a type

- **WHEN** an element of the type `hash` is the only input
- **THEN** the element context queries of the type `hash` select the context nodes of the
  `matches` entries for hash lengths from it

### Requirement: CNS-024 The location of a node says when two selections are the same node

A target query SHALL select only the context node or nodes in it. The input is the document, or
the array that holds only the element. The location of a node of the input is its RFC 9535
Normalized Path in the input. A query that runs on an array that holds only one node of the input
selects nodes of the input. The location of a selected node is that of the one node, followed by
the part of its Normalized Path after `$[0]`. Two selections are the same node when they have the
same location.

#### Scenario: CNS-024.01 A node that two context nodes select

- **WHEN** the target queries of an entry select one part from two context nodes, a control and a
  control enhancement in it
- **THEN** the two selections are one node

### Requirement: CNS-023 The element queries of a single-or-many type are those of its item type

The element of an element type of kind `single-or-many` is one item or a list of items. The
element context queries of that type SHALL be those of its item type. An implementation SHALL apply
them to each item of a list, on an array that holds only the item.

#### Scenario: CNS-023.01 A list of items

- **WHEN** an element of the type `mapping-collection-mappings` is a list of two mappings
- **THEN** the implementation applies the element context queries of the type `mapping` to each of
  the two mappings

### Requirement: CNS-008 An allowed-values entry checks the value against its applicable set

For an `allowed-values` entry, the value of a target node is the string at the node. The
applicable set of a node is each `allowed-values` entry whose target queries select the node from
a context node of the entry. [CNS-024] states when two selections are the same node. The node
SHALL fail when an entry of its applicable set has `allow-other` false and no entry of the set
lists the value. The node then gives one failure for each entry of the set that has `allow-other`
false.

#### Scenario: CNS-008.01 A value that another entry of the set lists

- **WHEN** a closed entry does not list the value `objective`, and an open entry that selects the
  same node lists it
- **THEN** the node gives no failure

#### Scenario: CNS-008.02 A value that no entry of the set lists

- **WHEN** a property of the OSCAL namespace on a control has a name that no entry of its
  applicable set lists, and two entries of the set are closed
- **THEN** the node gives two failures

### Requirement: CNS-025 An allowed-values entry compares values character for character

An implementation SHALL compare the value of a target node of [CNS-008] with a listed value
character for character. An entry lists the value only when one of its listed values is equal to
the value in this comparison.

#### Scenario: CNS-025.01 A value that differs from a listed value only in case

- **WHEN** the only entry of the applicable set of a node is closed and lists `TEST`, and the value
  of the node is `test`
- **THEN** the node gives one failure

### Requirement: CNS-009 An element decides an allowed-values entry only with its applicable set

An `allowed-values` entry SHALL have the element context queries of [CNS-007] for an element type
when, and only when, the element holds the context node of each entry that can be in the
applicable set of [CNS-008] of each target node of the entry in an element of that type.

#### Scenario: CNS-009.01 A property name that a parent entry allows

- **WHEN** the entry on `property` lists only the name `marking`, and an entry declared on a
  control lists more names for the properties of the control
- **THEN** the entry on `property` has no element context queries for the type `property`, and a
  standalone property with the name `sort-id` gives no failure

### Requirement: CNS-010 A matches entry checks the full value against its pattern

A `matches` entry SHALL hold an I-Regexp pattern of RFC 9485. Each target node SHALL hold a
string that the pattern matches in full. Each other target node gives one failure. The generation
SHALL fail for a `matches` constraint whose pattern or datatype gives no pattern that it can write
as an I-Regexp.

#### Scenario: CNS-010.01 A hash value with the wrong length

- **WHEN** a hash has the algorithm `SHA-256` and a value of 63 hexadecimal digits
- **THEN** the entry `oscal-check-hash-length-SHA2-3-256` gives one failure for the value

### Requirement: CNS-011 A has-cardinality entry counts the target nodes of each context node

For a `has-cardinality` entry, the count of a context node is the number of its target nodes. A
context node with no target node has the count 0. A context node SHALL fail when its count is
below the minimum or above the maximum of the entry. An entry can omit either bound.

#### Scenario: CNS-011.01 No target node

- **WHEN** an entry has the minimum 1, and a context node has no target node
- **THEN** the context node gives one failure

### Requirement: CNS-012 A key is the list of the values of the key fields

For an `is-unique`, `index` or `index-has-key` entry, the key of a target node SHALL be the list
of the values of the key fields of the entry. A key field is a query that runs on an array that
holds only the target node. It gives null when it selects no value. When a key field has a
prefix, its value is the rest of the string after the prefix, or null when the string does not
start with the prefix. A key whose values are all null is no key. Keys compare value by value,
character for character.

#### Scenario: CNS-012.01 A key field that selects nothing

- **WHEN** an index entry has the one key field `@id`, and a part has no `id`
- **THEN** the part has no key

#### Scenario: CNS-012.02 A key field with a prefix

- **WHEN** a key field has the prefix `#`, and the value is `#a1b2`
- **THEN** the value of the key field is `a1b2`

### Requirement: CNS-013 An is-unique entry fails for target nodes with the same key

For an `is-unique` entry, the target nodes of one context node that have the same key SHALL give
one failure fewer than their number. A key field of an `is-unique` entry selects one value or
none. A target node without a key gives no failure.

#### Scenario: CNS-013.01 Three nodes with the same key

- **WHEN** three target nodes of one context node have the same key
- **THEN** the entry gives two failures

### Requirement: CNS-014 An index holds the keys of each index entry with the same name

The index of a name holds the keys of the target nodes of each `index` entry with that name, over
the whole document. A target node is in the index once ([CNS-024]). The target nodes with the same
key in one index SHALL give one failure fewer than their number. A key field of an `index` entry
selects one value or none. A target node without a key is not in the index. An `index` entry SHALL
state when its constraint also selects nodes in another document. The index of its name is then
partial.

#### Scenario: CNS-014.01 Two parties with the same identifier

- **WHEN** two parties of a document have the same `uuid`
- **THEN** the index entry for party identifiers gives one failure

#### Scenario: CNS-014.02 An index with a part in another document

- **WHEN** the constraint of an `index` entry is a union of nodes in the same document and nodes
  that `doc()` selects in another document
- **THEN** the entry states it, and the index of its name is partial

### Requirement: CNS-015 An index-has-key entry fails for a key that is not in the index

For an `index-has-key` entry, a target node SHALL fail when its key is not in the index of [CNS-014]
with the name of the entry. When a key field selects several values, each value gives one key,
and each of these keys that is not in the index gives one failure. A target node without a key
gives no failure. An entry whose index is partial gives no failure.

#### Scenario: CNS-015.01 A reference to a party that does not exist

- **WHEN** a responsible party holds two party identifiers, and the document defines a party for
  only one of them
- **THEN** the entry gives one failure

#### Scenario: CNS-015.02 A reference into a leveraged system

- **WHEN** a `provided-by` link of a component names a by-component that only the leveraged
  system security plan holds
- **THEN** the entry gives no failure, because its index is partial

### Requirement: CNS-016 An expect entry fails for a target node that its test does not select

An `expect` entry SHALL hold a test query. A target node passes when the test query, run on an
array that holds only the target node, selects one node or more. Each other target node gives one
failure.

#### Scenario: CNS-016.01 A deprecated flag

- **WHEN** a parameter has the flag `depends-on`
- **THEN** the entry `oscal-parameter-depends-on-deprecated` gives one failure for the parameter

### Requirement: CNS-017 A document meets the manifest when no entry fails for it

A document meets the constraint manifest when no entry gives a failure for it, with the document
context queries of [CNS-007]. The requirement for the kind of an entry states when the entry
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

### Requirement: CNS-018 An element meets the manifest when no entry that it can decide fails

An element of an element type meets the constraint manifest when no entry other than an `index`
or `index-has-key` entry gives a failure for it, with the element context queries of that type.
Each failure SHALL have a location and an identifier, as [CNS-017] states for a document.

#### Scenario: CNS-018.01 A reference in an element

- **WHEN** an element holds a reference to a party, and the element holds no party
- **THEN** the element meets the constraint manifest, if no other entry fails for it

#### Scenario: CNS-018.02 A hash element with the wrong length

- **WHEN** an element of the type `hash` has the algorithm `SHA-256` and a value of 63
  hexadecimal digits
- **THEN** the element does not meet the constraint manifest

### Requirement: CNS-021 An entry is reportable unless it cannot fail

Each entry SHALL state whether it is reportable. It is reportable unless:

1. It is an `allowed-values` entry with `allow-other` true.
2. It is an `allowed-values` entry, and the JSON Schema allows only values that it lists.
3. It is an `index-has-key` entry whose index is partial.
4. The list `cannot-fail` of the exclusion list names it as [CNS-003] states, with the reason.

The generation SHALL fail for a reportable entry without an `id`.

#### Scenario: CNS-021.01 An open entry is not reportable

- **WHEN** an `allowed-values` entry has `allow-other` true
- **THEN** the entry is not reportable

#### Scenario: CNS-021.02 A test that the schema makes always true

- **WHEN** the schema allows no node for which the test of an `expect` entry is false, and the
  list `cannot-fail` names the entry with that reason
- **THEN** the entry is not reportable

### Requirement: CNS-019 The store checks the queries against a reference evaluator

The store checks SHALL evaluate the vendored constraints with a reference evaluator that reads
the metaschema and applies [CNS-011] to [CNS-017]. They SHALL fail when the queries of an entry
select other nodes than the reference evaluator selects for its constraint. The check SHALL use
the corpus documents that conform to the schema, and generated documents of each model that
conform to it and together hold each definition, flag and choice branch of the model.

#### Scenario: CNS-019.01 A query that selects too many nodes

- **WHEN** the context queries of an entry select a node of another definition with the same key
  name
- **THEN** the store checks fail

### Requirement: CNS-022 The store checks the failures of the manifest against the reference evaluator

The store checks SHALL evaluate the manifest with an RFC 9535 implementation, as [CNS-017] states
for a document and [CNS-018] for an element, on the documents of [CNS-019]. They SHALL fail when the number of failures of an
entry differs from the number that the reference evaluator of [CNS-019] gives for its constraint.

#### Scenario: CNS-022.01 A pattern that the generation writes wrong

- **WHEN** the I-Regexp of a `matches` entry rejects a value that the pattern of its constraint
  accepts
- **THEN** the manifest gives a failure that the reference evaluator does not give, and the store
  checks fail

### Requirement: CNS-020 The corpus has a failing case for each reportable entry

For each reportable entry of [CNS-021], the corpus SHALL hold a case with an input that conforms
to the schema and fails that entry. The case lists the `id` of each failure of the input, once
for each failure. The store checks SHALL fail when such a case is missing, or when the reference
evaluator of [CNS-019] gives other failures than a case lists. They SHALL also fail when it gives
a failure for an input that a case expects to be valid, or for the result of a builder case.

#### Scenario: CNS-020.01 A reportable entry without a case

- **WHEN** no corpus case expects a failure of a reportable entry
- **THEN** the store checks fail

#### Scenario: CNS-020.02 A valid corpus document that fails an entry

- **WHEN** an input of `documents/valid/` gives a failure of an entry
- **THEN** the store checks fail
