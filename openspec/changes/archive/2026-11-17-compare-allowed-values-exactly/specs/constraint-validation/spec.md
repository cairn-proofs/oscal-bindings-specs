## ADDED Requirements

### Requirement: CNS-025 An allowed-values entry compares values character for character

An implementation SHALL compare the value of a target node of [CNS-008] with a listed value
character for character. An entry lists the value only when one of its listed values is equal to
the value in this comparison.

#### Scenario: CNS-025.01 A value that differs from a listed value only in case

- **WHEN** the only entry of the applicable set of a node is closed and lists `TEST`, and the value
  of the node is `test`
- **THEN** the node gives one failure
