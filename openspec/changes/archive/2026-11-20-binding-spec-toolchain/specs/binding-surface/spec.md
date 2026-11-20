# Spec Delta

## ADDED Requirements

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

### Requirement: SRF-009 The spec artifact holds the binding templates

The spec artifact SHALL hold `templates/binding/`, with:

1. The template config: an OpenSpec `config.yaml` for a binding.
2. An empty identifier ledger.
3. The binding checker: one file that runs with Node.js 22 or later and git, and no installed package.
4. A POSIX shell git pre-commit hook. It verifies the pinned archive by its hash, and runs the checker of that
   archive and `openspec validate --all --strict` on the staged files.
5. A traceability record with no operation.

#### Scenario: SRF-009.01 Spec artifact holds the templates

- **WHEN** the store builds the spec artifact
- **THEN** the archive holds `templates/binding/` with the config, the ledger, the binding checker, the hook and the
  record

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
