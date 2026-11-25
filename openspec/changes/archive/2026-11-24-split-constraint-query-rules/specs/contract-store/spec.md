# Spec Delta

## ADDED Requirements

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
