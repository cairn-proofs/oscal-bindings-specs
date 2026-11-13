# Design

## Context

See [proposal.md](proposal.md#why) for the reason for this change. [PRS-013] selects a
parse-error document type from one root key. [NAM-020] states that a nested-union branch is
selected only when its distinguishing property is present.

## Goals / Non-Goals

**Goals:**

1. Define the selected branch for structured entries that describe failures in nested unions.
2. Add a corpus maximum that checks the new rule with an invalid closed enum.

**Non-Goals:**

1. Define entries for an object that has no distinguishing property or more than one
   distinguishing property.
2. Define a validator algorithm or error-message text.

## Decisions

### D1. Add [PRS-014] for an object that selects exactly one nested branch

The new requirement applies when an object holds the distinguishing property of exactly one
branch. The entry then describes a failure of that branch. This extends the observable
branch-selection result of [PRS-013] without specifying how a binding chooses a branch or
applies schema constraints.

The rule does not apply to an object that selects no branch or multiple branches. [NAM-020]
allows an object without a distinguishing property to conform to multiple branches. A rule for
those objects would need behavior that issue #36 does not request.

### D2. Use the existing closed-enum case

`parse/closed-enum-out-of-set` holds `select`, which selects the `ParameterWithSelect` branch.
Its one invalid `how-many` value checks the new rule. Keep `PRS-009.01` in the case
requirements and add `PRS-014.01`. Set `expected-min-failures` and `expected-max-failures` to
`1`.

The corpus checker already accepts an `expected-max-failures` value for an invalid document
whose root names one document type. The plan has no checker task.

## Risks / Trade-offs

1. A binding can report more than one entry for one fault → The corpus maximum detects the
   result for the selected parameter branch.

[PRS-013]: ../../specs/document-parsing/spec.md
[PRS-014]: specs/document-parsing/spec.md
[NAM-020]: ../../specs/naming-manifest/spec.md
