# Spec Delta

## MODIFIED Requirements

### Requirement: SRF-011 The spec artifact holds the binding templates

The spec artifact SHALL hold `templates/binding/`: the files that a binding copies to check its specs and its record
before each commit. They include:

1. The binding checker.
2. A POSIX shell pre-commit hook that runs the binding checker and `openspec validate --all --strict`.
3. The template config: a `config.yaml` for a binding.
4. An agent guide, `AGENTS.md`.

#### Scenario: SRF-011.01 Spec artifact holds the templates

- **WHEN** the store builds the spec artifact
- **THEN** the archive holds `templates/binding/`

#### Scenario: SRF-011.02 Stale binding checker fails the store checks

- **WHEN** a pull request changes the identifier checks of the store and does not regenerate the binding checker
- **THEN** the store checks fail

#### Scenario: SRF-011.03 Binding checker needs no installed package

- **WHEN** a binding runs the binding checker with Node.js 22 or later and git, in a repository that has no
  `node_modules` directory
- **THEN** the checker runs and reports its result

#### Scenario: SRF-011.04 Archive with another hash fails the hook

- **WHEN** the archive file differs from the hash that the hook pins
- **THEN** the hook fails before it runs the binding checker, and checks no staged file

#### Scenario: SRF-011.05 Agent guide cites an unknown store identifier

- **WHEN** the agent guide cites a store identifier that is neither live nor retired in the store
- **THEN** the store checks fail and name the identifier
