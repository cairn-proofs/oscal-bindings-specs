# Spec Delta

## ADDED Requirements

### Requirement: PRS-014 A distinguishing property selects the nested-union branch of parse failures

A parse error of [PRS-001] SHALL meet this condition when its document root names exactly one
 document type. The condition also applies to an operation that the contract defines through a
parse operation.

1. If an object holds the distinguishing property of exactly one nested-union branch, that object
   selects the branch. Each structured entry for a failure of the object is a failure of that
   branch ([NAM-020]).

#### Scenario: PRS-014.01 Invalid closed enum in a selected parameter branch

- **WHEN** the caller parses a catalog in which a parameter selection sets `how-many` to
  `seven`
- **THEN** the parse error carries exactly one structured entry, and the entry identifies that
  parameter selection

[NAM-020]: ../naming-manifest/spec.md#requirement-nam-020-a-distinguishing-property-identifies-a-branch-only-when-an-object-holds-it
