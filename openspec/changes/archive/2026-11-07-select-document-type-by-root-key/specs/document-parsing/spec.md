## ADDED Requirements

### Requirement: PRS-013 The root key selects the document type of the parse failures

The root key of a document type is the body field of its wrapper ([MDL-002]). A parse error of the parse operation of
[PRS-001], or of an operation that the contract defines through it, SHALL meet these conditions:

1. For an object whose root keys name exactly one document type, each structured entry is a failure of that type.
2. For an input that is not an object or has no root key, the error states that the input names no OSCAL document
   type. It carries no failure of any document type.

#### Scenario: PRS-013.01 One fault gives one entry

- **WHEN** the caller parses a catalog in which one resource link carries `media_type` in place of `media-type`
- **THEN** the parse error carries exactly one structured entry, and the entry identifies that resource link

#### Scenario: PRS-013.02 An object with no root key

- **WHEN** the caller parses an object whose only key is `not-an-oscal-document`
- **THEN** the parse error states that the input names no OSCAL document type, and it carries no failure of any
  document type
