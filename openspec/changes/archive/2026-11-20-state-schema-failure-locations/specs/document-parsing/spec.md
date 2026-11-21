# Spec Delta

## ADDED Requirements

### Requirement: PRS-021 A fault of the schema has the location of its failing node

A fault of the schema SHALL have one failing node. The location of the fault is the Normalized Path
of [CNS-024] of that node. The faults and their failing nodes are:

1. A value that the schema rejects: the value. A value is one fault, also when it fails several
   keywords.
2. A member that the schema does not define: the object that holds it.
3. A required member that is absent: the object that lacks it.
4. Any other fault of one node, for example an array with too few items: that node.

#### Scenario: PRS-021.01 A value that the schema rejects

- **WHEN** the caller parses a catalog whose `last-modified` is `2026-01-01T00:00:00z`
- **THEN** the location of the fault is `$['catalog']['metadata']['last-modified']`

#### Scenario: PRS-021.02 A member that the schema does not define

- **WHEN** the caller parses a catalog that holds an undefined member next to a known member of the
  catalog
- **THEN** the location of the fault is `$['catalog']`

#### Scenario: PRS-021.03 A required member that is absent

- **WHEN** the caller parses a catalog whose metadata has no `title`
- **THEN** the location of the fault is `$['catalog']['metadata']`

#### Scenario: PRS-021.04 A value that fails two keywords

- **WHEN** the caller parses a catalog whose `last-modified` is `2024-01-02T03:04:05`, with no
  timezone
- **THEN** the value is one fault, and its location is `$['catalog']['metadata']['last-modified']`

### Requirement: PRS-022 Each fault of the selected failures gives one structured entry

A parse error SHALL carry one structured entry of [PRS-006] for each fault of [PRS-021] in the
failures that [PRS-013] and [PRS-014] select. The location of the entry is the location of the
fault. [PRS-010] and [PRS-012] state when the error carries fewer entries. Several entries can
have the same location.

#### Scenario: PRS-022.01 Two faults of one object

- **WHEN** the caller parses a catalog whose metadata has no `title` and no `version`
- **THEN** the parse error carries two structured entries, and the location of each entry is
  `$['catalog']['metadata']`

## MODIFIED Requirements

### Requirement: PRS-006 Schema validation failures carry structured error detail

When a document fails the schema or the constraint manifest of [CNS-017], the parse error SHALL carry structured detail about the failures. The detail SHALL cover each failure, unless
the parse error identifies a limit of [PRS-010]. A caller can then report which locations failed and why. The detail
format is language-specific, but each entry MUST identify the failing location. Later requirements state which
location an entry identifies, and when several entries identify the same location.

#### Scenario: PRS-006.01 Validation failure lists failing locations

- **WHEN** a document fails schema validation with two faults
- **THEN** the parse error carries one structured entry for each fault

### Requirement: PRS-013 The root key selects the document type of the parse failures

The root key of a document type is the body field of its wrapper ([MDL-002]). A parse error of the parse operation of
[PRS-001], or of an operation that the contract defines through it, SHALL meet these conditions:

1. For an object whose root keys name exactly one document type, each structured entry is a failure of that type.
2. For an input that is not an object or has no root key, the error states that the input names no OSCAL document
   type. It carries no failure of any document type.

#### Scenario: PRS-013.01 One fault gives one entry

- **WHEN** the caller parses a catalog in which the first resource link of the first resource of the back matter
  carries `media_type` in place of `media-type`
- **THEN** the parse error carries exactly one structured entry, and its location is
  `$['catalog']['back-matter']['resources'][0]['rlinks'][0]`

#### Scenario: PRS-013.02 An object with no root key

- **WHEN** the caller parses an object whose only key is `not-an-oscal-document`
- **THEN** the parse error states that the input names no OSCAL document type, and it carries no failure of any
  document type

### Requirement: PRS-014 A distinguishing property selects the nested-union branch of parse failures
A parse error of [PRS-001] SHALL meet this condition when its document root names exactly one
 document type. The condition also applies to an operation that the contract defines through a
parse operation.
1. If an object holds the distinguishing property of exactly one nested-union branch, that object
   selects the branch. Each structured entry for a failure of the object is a failure of that
   branch ([NAM-020]).
#### Scenario: PRS-014.01 Invalid closed enum in a selected parameter branch
- **WHEN** the caller parses a catalog in which the selection of the first parameter sets `how-many` to
  `seven`
- **THEN** the parse error carries exactly one structured entry, and its location is
  `$['catalog']['params'][0]['select']['how-many']`
