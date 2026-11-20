# Spec Delta

## ADDED Requirements

### Requirement: PRS-020 A JSON object has no two members with the same key

A parse operation of [PRS-001], or an operation that the contract defines through it, SHALL report a parse error when
one object in a JSON input has two members with the same key. Two keys are the same when their text is the same after
the JSON escapes in them are decoded. The operation MUST NOT keep one of the members and drop the other. The validity
check of [ERR-002] returns false for such an input.

#### Scenario: PRS-020.01 Two members with the same key

- **WHEN** a JSON input holds an object with two members that both have the key `name`
- **THEN** the operation reports a parse error and does not return a document value

#### Scenario: PRS-020.02 Keys that differ only in an escape

- **WHEN** a JSON input holds an object with the key `name` and, in the same object, the key `\u006eame`
- **THEN** the operation reports a parse error and does not return a document value

#### Scenario: PRS-020.03 The validity check of a duplicate key

- **WHEN** the caller runs the validity check on a JSON input in which one object has two members with the same key,
  and the input is otherwise a conformant document
- **THEN** it returns false and does not surface an error
