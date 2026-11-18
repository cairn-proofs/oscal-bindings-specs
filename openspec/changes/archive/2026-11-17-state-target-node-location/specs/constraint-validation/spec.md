## MODIFIED Requirements

### Requirement: CNS-007 Each entry selects context nodes and target nodes

Each entry SHALL hold these queries of [CNS-006]:

1. Document context queries. They select from a document the context nodes, to which the
   constraint applies.
2. Element context queries for each element type whose element can hold a context node. They run
   on an array that holds only the element. An `allowed-values` entry can lack them for a type,
   as a later requirement states.
3. Target queries. A target query runs on each context node of the entry, in an array that holds
   only that context node. It selects the target nodes of that context node. It SHALL select only
   the context node or nodes in it.

The input is the document, or the array that holds only the element. The location of a node of the
input is its RFC 9535 Normalized Path in the input. A query that runs on an array that holds only
one node of the input selects nodes of the input. The location of a node that it selects is the
location of that one node, followed by the part of the Normalized Path of the selected node in the
array that comes after `$[0]`. Two selections are the same node when they have the same location.
This requirement does not set the format in which an implementation reports a location.

#### Scenario: CNS-007.01 A target in another document

- **WHEN** the Metapath target of a constraint is a union of a path in the same document and a
  `doc()` path into another document
- **THEN** the target queries select only the nodes of that union in the same document

#### Scenario: CNS-007.02 Element context queries of a type

- **WHEN** an element of the type `hash` is the only input
- **THEN** the element context queries of the type `hash` select the context nodes of the
  `matches` entries for hash lengths from it

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
a context node of the entry. [CNS-007] states when two selections are the same node. The node
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

### Requirement: CNS-014 An index holds the keys of each index entry with the same name

The index of a name holds the keys of the target nodes of each `index` entry with that name, over
the whole document. A target node of an entry is in the index once, also when several context nodes
of the entry select it ([CNS-007]). The target nodes with the same key in one index SHALL give one
failure fewer than their number. A key field of an `index` entry selects one value or none. A
target node without a key is not in the index. An `index` entry SHALL state when its constraint
also selects nodes in another document. The index of its name is then partial.

#### Scenario: CNS-014.01 Two parties with the same identifier

- **WHEN** two parties of a document have the same `uuid`
- **THEN** the index entry for party identifiers gives one failure

#### Scenario: CNS-014.02 An index with a part in another document

- **WHEN** the constraint of an `index` entry is a union of nodes in the same document and nodes
  that `doc()` selects in another document
- **THEN** the entry states it, and the index of its name is partial

### Requirement: CNS-017 A document meets the manifest when no entry fails for it

A document meets the constraint manifest when no entry gives a failure for it, with the document
context queries of [CNS-007]. The requirement for the kind of an entry states when the entry
gives a failure. Each failure SHALL have a location and the `id` of its entry. The location is the
location of [CNS-007] of the target node, or of the context node for a `has-cardinality` entry.
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
