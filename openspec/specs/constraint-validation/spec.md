# constraint-validation Specification

## Purpose

Defines the constraints of the OSCAL metaschema that decide whether a document or an element is
valid. Covers the rule for each kind of entry of the constraint manifest, and the location of a
failure.

## Requirements

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

### Requirement: CNS-026 Locations are in a fixed order

Two locations of [CNS-024] SHALL compare segment by segment, from the start. The first pair of
segments that differ decides the order:

1. Two index segments compare as numbers.
2. Two name segments compare as the member names that they give, by Unicode code point.
3. A location that is a prefix of the other location comes first.

#### Scenario: CNS-026.01 Two index segments

- **WHEN** two locations differ at an index segment, with the values 2 and 10
- **THEN** the location with the index 2 comes first

#### Scenario: CNS-026.02 Two names

- **WHEN** two locations differ at a name segment, with the names `a` and `B`
- **THEN** the location with the name `B` comes first, because U+0042 is less than U+0061

#### Scenario: CNS-026.03 Two names outside the Basic Multilingual Plane

- **WHEN** two locations differ at a name segment, with the names U+FF5E and U+1F600
- **THEN** the location with the name U+FF5E comes first

#### Scenario: CNS-026.04 A location that is a prefix

- **WHEN** one location is `$['a']` and the other location is `$['a']['b']`
- **THEN** the location `$['a']` comes first

### Requirement: CNS-023 The element queries of a single-or-many type are those of its item type

The element of an element type of kind `single-or-many` is one item or a list of items. The
element context queries of that type SHALL be those of its item type. An implementation SHALL apply
them to each item of a list, on an array that holds only the item. The location of a failure in an
item of a list SHALL be the location of the item in the input, followed by the part of the location
in that array after `$[0]` ([CNS-024]).

#### Scenario: CNS-023.01 A list of items

- **WHEN** an element of the type `mapping-collection-mappings` is a list of two mappings
- **THEN** the implementation applies the element context queries of the type `mapping` to each of
  the two mappings

#### Scenario: CNS-023.02 A failure in the second item of a list

- **WHEN** an element of the type `mapping-collection-mappings` is a list of two mappings, and the
  second mapping holds a property with the name `bogus`
- **THEN** the failure of the entry `oscal-metadata-prop-name-values` has the location
  `$[0][1]['props'][0]['name']`

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

An `allowed-values` entry SHALL have the element context queries of [STO-060] for an element type
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

For an `is-unique` entry, the target nodes of one context node that have the same key SHALL be in
the order of their locations ([CNS-026]). The first of these nodes gives no failure, and each other
of these nodes gives one failure. A key field of an `is-unique` entry selects one value or none. A
target node without a key gives no failure.

#### Scenario: CNS-013.01 Three nodes with the same key

- **WHEN** three target nodes of one context node have the same key
- **THEN** the entry gives two failures

### Requirement: CNS-014 An index holds the keys of each index entry with the same name

The index of a name holds the keys of the target nodes of each `index` entry with that name, over
the whole document. A target node is in the index once ([CNS-024]). A node without a key is not in
it. The nodes with the same key in one index SHALL be in the order of their locations ([CNS-026]).
The first gives no failure, and each other node gives one. An `index` entry SHALL state when its
constraint also selects nodes in another document. The index of its name is then partial.

#### Scenario: CNS-014.01 Two parties with the same identifier

- **WHEN** two parties of a document have the same `uuid`
- **THEN** the index entry for party identifiers gives one failure

#### Scenario: CNS-014.02 An index with a part in another document

- **WHEN** the constraint of an `index` entry is a union of nodes in the same document and nodes
  that `doc()` selects in another document
- **THEN** the entry states it, and the index of its name is partial

#### Scenario: CNS-014.03 Two nodes in different members of an object

- **WHEN** two target nodes of an index have the same key, they are in the members `b` and `a` of an
  object, and the member `b` comes first in the document
- **THEN** the index gives one failure, at the node in the member `b`

#### Scenario: CNS-014.04 A node inside an earlier node

- **WHEN** a catalog holds two controls, and the first control holds a control with the same `id`
  as the second control
- **THEN** the index of the control identifiers gives one failure, at the second control

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
