## ADDED Requirements

### Requirement: PRS-010 A binding can limit the resources that a parse uses

A binding SHALL document each resource limit that it applies to a parse operation, with what the limit measures and
the operations that it applies to. A parse operation is one of these:

1. An operation of this capability.
2. An operation that the contract defines through a parse operation.

An input over a documented limit SHALL be a parse error that identifies the limit, also when the input conforms to the
schema. A binding MUST NOT reject an input for a limit that it does not document.

#### Scenario: PRS-010.01 Valid input over a documented size limit

- **WHEN** a binding documents a limit on the bytes of a JSON input, and the caller passes a valid document larger
  than the limit
- **THEN** parsing reports a parse error that identifies the limit

#### Scenario: PRS-010.02 Nesting over a documented depth limit

- **WHEN** a binding documents a limit on the nesting depth of a JSON input, and the input nests arrays deeper than the
  limit
- **THEN** parsing reports a parse error that identifies the limit

#### Scenario: PRS-010.03 Alias expansion over a documented limit

- **WHEN** aliases in a YAML input expand to more nodes than the documented limit of the binding
- **THEN** the YAML parse operation reports a parse error that identifies the limit

#### Scenario: PRS-010.04 No undocumented limit

- **WHEN** a binding documents no limit that a valid document of 50 MiB exceeds, and the caller passes that document
- **THEN** the operation returns the typed document value

### Requirement: PRS-011 A binding can limit the structured entries of a parse error

A binding can document a limit of [PRS-010] that counts the failures of a document. That limit SHALL count the
structured entries of the parse error of [PRS-006], and SHALL be 100 or more. When the failures give more entries than
the limit, the parse error SHALL carry as many entries as the limit.

#### Scenario: PRS-011.01 Failures over a documented entry limit

- **WHEN** a binding documents a limit of 100 entries, and the failures of a document give 1000 entries
- **THEN** the parse error carries 100 structured entries, states that the list is incomplete, and identifies the limit

#### Scenario: PRS-011.02 Failures within the entry limit

- **WHEN** a binding documents a limit of 100 entries, and the failures of a document give 99 entries
- **THEN** the parse error carries the 99 entries, and does not state that the list is incomplete

#### Scenario: PRS-011.03 Failures at the entry limit

- **WHEN** a binding documents a limit of 100 entries, and the failures of a document give exactly 100 entries
- **THEN** the parse error carries the 100 entries, and it can identify the limit and state that the list is
  incomplete

### Requirement: PRS-012 A parse error carries each entry or 100 entries or more

A parse error that carries structured entries of [PRS-006] SHALL meet one of these conditions:

1. It carries one entry for each failure.
2. It carries 100 entries or more, identifies a limit of [PRS-010], and states that the list of entries is incomplete.

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

## MODIFIED Requirements

### Requirement: PRS-006 Schema validation failures carry structured error detail

When parsing fails because the document does not conform to the schema, the parse error SHALL carry structured detail
about the failures. The detail SHALL cover each failure, except as [PRS-012] permits. A caller can then report
which locations failed and why. The detail format is language-specific, but each entry MUST identify the failing
location.

#### Scenario: PRS-006.01 Validation failure lists failing locations

- **WHEN** a document fails schema validation at two locations
- **THEN** the parse error carries one structured entry per failing location
