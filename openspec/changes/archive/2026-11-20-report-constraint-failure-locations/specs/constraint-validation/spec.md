# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: CNS-020 The corpus has a failing case for each reportable entry

For each reportable entry of [CNS-021], the corpus SHALL hold a case with an input that conforms to
the schema and fails that entry. The case lists the `id` and the location ([CNS-024]) of each
failure, once for each failure. The store checks SHALL fail when such a case is missing, when the
reference evaluator of [CNS-019] gives other failures (by `id` or location) than a case lists, or
when it gives a failure for an input that a case expects to be valid or for a builder case result.

#### Scenario: CNS-020.01 A reportable entry without a case

- **WHEN** no corpus case expects a failure of a reportable entry
- **THEN** the store checks fail

#### Scenario: CNS-020.02 A valid corpus document that fails an entry

- **WHEN** an input of `documents/valid/` gives a failure of an entry
- **THEN** the store checks fail

#### Scenario: CNS-020.03 A failure at another location

- **WHEN** the reference evaluator gives a failure with the `id` that a case lists, at another
  location than the case lists
- **THEN** the store checks fail
