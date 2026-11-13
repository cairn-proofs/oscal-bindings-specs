# Spec Delta

## MODIFIED Requirements

### Requirement: PRS-006 Schema validation failures carry structured error detail

When parsing fails because the document does not conform to the schema, the parse error SHALL carry structured detail
about the failures. The detail SHALL cover each failure, unless the parse error identifies a limit of [PRS-010].
A caller can then report which locations failed and why. The detail format is language-specific, but each entry MUST
identify the failing location.

#### Scenario: PRS-006.01 Validation failure lists failing locations

- **WHEN** a document fails schema validation at two locations
- **THEN** the parse error carries one structured entry per failing location

### Requirement: PRS-012 A parse error carries each entry or 100 entries or more

A parse error that carries structured entries of [PRS-006] can carry entries for only some of the failures. It SHALL
then meet each of these conditions:

1. It carries 100 entries or more.
2. It identifies a limit of [PRS-010].
3. It states that the list of entries is incomplete.

A parse error that identifies no limit SHALL NOT state that the list is incomplete. A parse error over a limit of
[PRS-010] can also carry no structured entries.

#### Scenario: PRS-012.01 Document with 101 failing locations

- **WHEN** a document fails schema validation at 101 locations, and each failure gives one structured entry or more
- **THEN** the parse error carries 100 structured entries or more

#### Scenario: PRS-012.02 Short list from a limit

- **WHEN** a binding documents a limit on validation time, the limit stops a parse after 10 entries, and the failures
  of the document give 200 entries
- **THEN** the parse error identifies the limit and carries no structured entries, or carries 100 entries or more and
  states that the list is incomplete

#### Scenario: PRS-012.03 Byte limit on an invalid document

- **WHEN** a binding documents a limit on the bytes of a JSON input, and an invalid document with 200 failing locations
  is larger than the limit
- **THEN** parsing reports a parse error that identifies the limit and carries no structured entries
