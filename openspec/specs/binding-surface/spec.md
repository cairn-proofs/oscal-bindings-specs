# binding-surface Specification

## Purpose

Defines which public operations a binding can expose, and how a binding records the requirement that covers each one.
Also defines the requirement index and the JSON Schema that the store publishes for that record. A binding is an
implementation of the OSCAL bindings contract in one programming language. A public operation is a function, a type, or
a member of a type that the binding exports in its public API. A contract requirement is a requirement in the main
specs of the store. A binding-local requirement is a requirement in the specs of one binding.

## Requirements

### Requirement: SRF-002 A binding-local operation adds no contract behavior

A public operation is binding-local only when all of these conditions are true:

1. It composes contract operations with language-specific adaptation only.
2. It makes no decision about which OSCAL input is accepted, what output is produced, or what errors are reported.
3. It gives no alternative behavior for an operation that a contract requirement defines.

A binding-local requirement of the binding SHALL define each binding-local operation.

#### Scenario: SRF-002.01 Language adaptation is binding-local

- **WHEN** a binding offers an asynchronous function that calls the contract parse operation and returns its result
  and its errors without change
- **THEN** the function is binding-local

#### Scenario: SRF-002.02 Input decision is not binding-local

- **WHEN** a function converts XML text to JSON before it calls the contract parse operation
- **THEN** the function is not binding-local, because it decides which OSCAL input is accepted

#### Scenario: SRF-002.03 Alternative behavior is not binding-local

- **WHEN** a function parses an OSCAL document and accepts unknown fields
- **THEN** the function is not binding-local, because it gives alternative behavior for [PRS-004]

### Requirement: SRF-008 A binding-local requirement does not use a store prefix

The identifier of a binding-local requirement MUST NOT start with a prefix that the store identifier ledger,
`openspec/spec-ids.yaml`, holds. The ledger is the one in the spec artifact version that the binding pins.

#### Scenario: SRF-008.01 Store prefix

- **WHEN** a binding defines a binding-local requirement with the identifier `PRS-101`
- **THEN** the binding does not conform, because `PRS` is a prefix in the store identifier ledger

#### Scenario: SRF-008.02 Prefix of the binding

- **WHEN** a binding defines a binding-local requirement with the identifier `PYB-001`, and the store identifier
  ledger has no prefix `PYB`
- **THEN** the identifier meets this rule

### Requirement: SRF-001 A binding exposes only operations that a requirement defines

A binding SHALL NOT expose a public operation unless one of these is true:

1. A contract requirement defines the operation.
2. The operation is binding-local, as [SRF-002] defines.

This rule does not apply to a generated model type or to its members. The model-derivation capability and the naming
manifest govern them.

#### Scenario: SRF-001.01 Operation that the contract defines

- **WHEN** a binding exports a function that parses an OSCAL document from bytes
- **THEN** the binding can expose the function, because a requirement of the document-parsing capability defines it

#### Scenario: SRF-001.02 Operation with no requirement

- **WHEN** a binding exports a function that parses an XML document, and no contract requirement defines XML input
- **THEN** the binding does not conform, because the function is not binding-local under [SRF-002]

#### Scenario: SRF-001.03 Generated model type

- **WHEN** a binding exports the generated type of the Catalog document and its field accessors
- **THEN** this rule does not apply to that type or to its accessors

### Requirement: SRF-003 A binding records the requirement that covers each public operation

A binding SHALL keep one traceability record. The record SHALL hold one entry for each public operation, and each
operation name occurs in one entry only. The entry of a type covers the members of the type. Each entry holds one of
these:

1. The identifiers of the contract requirements that define the operation.
2. The identifier of the binding-local requirement that defines the operation.

#### Scenario: SRF-003.01 Contract operation is recorded

- **WHEN** a binding exports a function that parses an OSCAL document from bytes
- **THEN** the record has an entry for the function that holds the identifier [PRS-001]

#### Scenario: SRF-003.02 Binding-local operation is recorded

- **WHEN** a binding exports a binding-local operation
- **THEN** the record has an entry for the operation that holds the identifier of its binding-local requirement

#### Scenario: SRF-003.03 Members of a type are covered by the type

- **WHEN** a binding exports the document facade type, and the type has an accessor for the assessment period
- **THEN** the entry of the facade type holds [FAC-004], and the accessor has no entry of its own

#### Scenario: SRF-003.04 Public operation without an entry

- **WHEN** a binding exports a public operation that has no entry in the record
- **THEN** the binding does not conform

### Requirement: SRF-005 A binding-local operation that the contract defines conforms or is deprecated

A contract requirement can define an operation that a binding declares binding-local. Then the binding SHALL do one of
these in its first release that pins a spec artifact version with that requirement:

1. Make the operation conform to the contract requirement, and cite that requirement in the traceability record.
2. Deprecate the operation in its public API.

Condition 3 of [SRF-002] does not apply to a deprecated operation until the binding removes it.

#### Scenario: SRF-005.01 Promoted operation conforms

- **WHEN** a binding pins a spec artifact version that defines an operation the binding declared binding-local, and the
  operation conforms to that definition
- **THEN** the record entry of the operation holds the contract requirement identifier

#### Scenario: SRF-005.02 Promoted operation that does not conform is deprecated

- **WHEN** a binding pins a spec artifact version that defines an operation the binding declared binding-local, and the
  operation does not conform to that definition
- **THEN** the binding deprecates the operation in the same release

### Requirement: SRF-006 The store publishes a requirement index

The store SHALL publish `openspec/requirements.json`, generated from the main specs. It holds a format version and one
entry for each requirement in the main specs, in identifier order. Each entry holds the requirement identifier, the
capability, and the title. The store checks MUST fail when the committed index differs from the generator output. The
spec artifact SHALL hold the index.

#### Scenario: SRF-006.01 Index entry of a requirement

- **WHEN** the main specs hold [PRS-001] in the document-parsing capability
- **THEN** the index has an entry with the identifier `PRS-001`, the capability `document-parsing`, and the title
  `Parse an OSCAL document from text or bytes`

#### Scenario: SRF-006.02 Stale index fails the store checks

- **WHEN** a pull request adds a requirement to the main specs and does not regenerate the index
- **THEN** the store checks fail

#### Scenario: SRF-006.03 Retired requirement has no entry

- **WHEN** the ledger retires a requirement identifier
- **THEN** the index has no entry for that identifier

#### Scenario: SRF-006.04 Spec artifact holds the index

- **WHEN** the store builds the spec artifact
- **THEN** the archive holds `openspec/requirements.json`

### Requirement: SRF-004 Contract identifiers in a traceability record resolve in the requirement index

Each contract requirement identifier in a traceability record MUST name a requirement in the requirement index of
[SRF-006]. The index is the one in the spec artifact version that the binding pins. A scenario identifier or a retired
requirement identifier does not meet this rule.

#### Scenario: SRF-004.01 Live requirement resolves

- **WHEN** a record entry holds [PRS-001], and the index of the pinned version has an entry for [PRS-001]
- **THEN** the identifier resolves

#### Scenario: SRF-004.02 Retired requirement does not resolve

- **WHEN** a record entry holds the retired identifier [MDL-004]
- **THEN** the record is invalid, because the index has no entry for that identifier

### Requirement: SRF-007 The store publishes a JSON Schema for the traceability record

The store SHALL publish `openspec/traceability.schema.json`, the JSON Schema of the traceability record of [SRF-003].
The record SHALL conform to it. The spec artifact SHALL hold it. The JSON Schema SHALL constrain the record:

1. Each requirement identifier is two to five uppercase letters, a hyphen, and three digits.
2. Each entry holds contract requirement identifiers or one binding-local requirement identifier, not both.
3. No object holds a member that the JSON Schema does not define.

#### Scenario: SRF-007.01 Entry with both kinds of identifier is invalid

- **WHEN** a record entry holds a contract requirement identifier and a binding-local requirement identifier
- **THEN** the record does not conform to the JSON Schema

#### Scenario: SRF-007.02 Scenario identifier is invalid

- **WHEN** a record entry holds the scenario identifier `PRS-001.01`
- **THEN** the record does not conform to the JSON Schema

#### Scenario: SRF-007.03 Spec artifact holds the JSON Schema

- **WHEN** the store builds the spec artifact
- **THEN** the archive holds `openspec/traceability.schema.json`

### Requirement: SRF-009 The spec artifact holds the binding templates

The spec artifact SHALL hold `templates/binding/`, with:

1. The template config: a `config.yaml` for a binding.
2. An empty identifier ledger.
3. The binding checker: one file that needs only Node.js 22 or later and git.
4. A POSIX shell pre-commit hook. It checks the archive hash, then runs the checker and
   `openspec validate --all --strict` on the staged files.
5. An empty traceability record.
6. An agent guide, `AGENTS.md`, that cites only live or retired store identifiers.

#### Scenario: SRF-009.01 Spec artifact holds the templates

- **WHEN** the store builds the spec artifact
- **THEN** the archive holds `templates/binding/` with the config, the ledger, the binding checker, the hook, the
  record and the agent guide

#### Scenario: SRF-009.02 Stale binding checker fails the store checks

- **WHEN** a pull request changes the identifier checks of the store and does not regenerate the binding checker
- **THEN** the store checks fail

#### Scenario: SRF-009.03 Binding checker needs no installed package

- **WHEN** a binding runs the binding checker with Node.js and git in a repository that has no `node_modules`
  directory
- **THEN** the checker runs and reports its result

#### Scenario: SRF-009.04 Archive with another hash fails the hook

- **WHEN** the archive file differs from the hash that the hook pins
- **THEN** the hook fails before it runs the checker

#### Scenario: SRF-009.05 Agent guide cites an unknown store identifier

- **WHEN** the agent guide cites a store identifier that is neither live nor retired in the store
- **THEN** the store checks fail and name the identifier

### Requirement: SRF-010 The binding checker applies the identifier rules to the specs of a binding

The binding checker SHALL apply each identifier check of the store to the main specs and the identifier ledger of a
binding. It reads the store from the spec artifact that the binding pins. It SHALL also fail when:

1. A prefix in the ledger of the binding is a prefix of the store, as [SRF-008] states.
2. A citation that uses a prefix of the store names no live or retired identifier of the store.

#### Scenario: SRF-010.01 Store prefix in the ledger of a binding fails

- **WHEN** the ledger of a binding holds the prefix `PRS`
- **THEN** the binding checker fails and names the prefix

#### Scenario: SRF-010.02 Citation of a store identifier resolves

- **WHEN** a binding spec cites [PRS-001] or `[PRS-001.01]`, and the pinned spec artifact holds that identifier
- **THEN** the binding checker reports no failure for the citation

#### Scenario: SRF-010.03 Citation of an unknown store identifier fails

- **WHEN** a binding spec cites `[PRS-999]`, and the pinned spec artifact neither holds nor retires it
- **THEN** the binding checker fails and names the citation

#### Scenario: SRF-010.04 Identifier rule of the store applies to a binding

- **WHEN** a requirement heading in a binding spec has a number at or above `next` for its prefix in the ledger of
  the binding
- **THEN** the binding checker fails, as the store check fails for the same heading in the store

### Requirement: SRF-011 The binding checker checks the traceability record

The binding checker SHALL check the traceability record of a binding against the spec artifact that the binding pins.
It SHALL fail when:

1. The record does not conform to the JSON Schema of [SRF-007].
2. A contract requirement identifier does not resolve, as [SRF-004] states.
3. A binding-local requirement identifier names no requirement in the main specs of the binding, or starts with a
   prefix of the store, as [SRF-008] states.
4. An operation name occurs in more than one entry.

#### Scenario: SRF-011.01 Record that does not conform fails

- **WHEN** a record entry holds a contract requirement identifier and a binding-local requirement identifier
- **THEN** the binding checker fails

#### Scenario: SRF-011.02 Retired contract identifier fails

- **WHEN** a record entry holds the retired identifier [MDL-004]
- **THEN** the binding checker fails and names the identifier

#### Scenario: SRF-011.03 Unknown binding-local identifier fails

- **WHEN** a record entry holds the binding-local identifier `PYB-009`, and the main specs of the binding have no
  requirement `PYB-009`
- **THEN** the binding checker fails and names the identifier

#### Scenario: SRF-011.04 Operation name in two entries fails

- **WHEN** two record entries have the same operation name
- **THEN** the binding checker fails and names the operation

#### Scenario: SRF-011.05 Valid record passes

- **WHEN** one record entry holds [PRS-001], and one entry holds the binding-local identifier `PYB-001` of a
  requirement in the main specs of the binding
- **THEN** the binding checker reports no failure for the record

### Requirement: SRF-012 The template config follows the store config

The template config of [SRF-009] SHALL hold each entry of the store `openspec/config.yaml`, with each store
command or store file in it replaced for a binding. It SHALL also hold the prefix rule of [SRF-008], the citation
rule of [SRF-010], and a `references` entry for the store. The store checks MUST fail when:

1. The template differs from the store config with these changes.
2. A store-specific text that the template replaces is not in the store config.

#### Scenario: SRF-012.01 Changed store rule fails the store checks until the template follows

- **WHEN** a pull request changes an entry of the store `openspec/config.yaml` and does not regenerate the template
- **THEN** the store checks fail

#### Scenario: SRF-012.02 Stale replacement fails the store checks

- **WHEN** a pull request rewords a store-specific sentence of the store `openspec/config.yaml`, and the template
  replaces the old sentence
- **THEN** the store checks fail and name the sentence

#### Scenario: SRF-012.03 Template names the binding checker for a store command

- **WHEN** an entry of the store `openspec/config.yaml` names `npm run spec-ids`
- **THEN** the same entry in the template names the binding checker instead
