# Spec Delta

## ADDED Requirements

### Requirement: PRS-023 A JSON string has no lone surrogate escape

A parse operation of [PRS-001], or an operation that the contract defines through it, SHALL report
a parse error when a JSON input holds a string with a lone surrogate escape. A lone surrogate escape
is one of these:

1. An escape of a high surrogate (U+D800 to U+DBFF) that no escape of a low surrogate follows
   immediately.
2. An escape of a low surrogate (U+DC00 to U+DFFF) that no escape of a high surrogate precedes
   immediately.

The validity check of [ERR-002] returns false for such an input.

#### Scenario: PRS-023.01 A lone high surrogate escape

- **WHEN** a JSON input is a conformant document, except that one string value is the
  escape `\ud800` and nothing else
- **THEN** the operation reports a parse error and does not return a document value

#### Scenario: PRS-023.02 A lone low surrogate escape

- **WHEN** a JSON input is a conformant document, except that one string value is the
  escape `\udc00` and nothing else
- **THEN** the operation reports a parse error and does not return a document value

#### Scenario: PRS-023.03 A surrogate pair

- **WHEN** a JSON input is a conformant document in which one string value is the escape `\ud83d`
  and then the escape `\ude00`
- **THEN** the operation returns the document value, and that string is the one character U+1F600

#### Scenario: PRS-023.04 The validity check of a lone surrogate escape

- **WHEN** the caller runs the validity check on a JSON input that is a conformant document, except
  that one string value is the escape `\ud800` and nothing else
- **THEN** it returns false and does not surface an error
