## ADDED Requirements

### Requirement: VER-006 Dependencies run from bindings to the store, never back

A binding MAY depend on the store by pinning a spec artifact. The store SHALL NOT hold content whose correctness depends
on the state of a binding. Such content includes:

1. The known defects, expected failures, or conformance results of a binding.
2. The versions that a binding supports.
3. A link to an individual issue or pull request in a binding repository.

The store MAY link the repository and the issue tracker of each known implementation. An OpenSpec change MAY name a
binding issue.

#### Scenario: VER-006.01 A corpus case carries no binding-specific data

- **WHEN** `npm run corpus:check` reads a case that has a `known-defects` field, or a corpus that has a `defect-twins`
  field
- **THEN** the check fails

#### Scenario: VER-006.02 Store content links no individual binding issue

- **WHEN** a tracked file outside `openspec/changes/` contains a link to an individual issue or pull request in a
  binding repository
- **THEN** the store checks fail

#### Scenario: VER-006.03 A listed implementation links only its repository and tracker

- **WHEN** the store lists a known implementation with a link to its repository and a link to its issue tracker
- **THEN** the store checks pass

### Requirement: VER-007 Each binding keeps its own expected conformance failures

A binding that fails a corpus case SHALL record the expected failure in its own repository. A change to that record
MUST NOT need a change or a release of the store. The corpus states the same expected result for every binding.

#### Scenario: VER-007.01 A binding fix needs no store change

- **WHEN** a binding fixes a defect that a corpus case exercises
- **THEN** the binding removes its own expected-failure entry, and the store does not change
