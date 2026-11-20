# Spec Delta

## MODIFIED Requirements

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
