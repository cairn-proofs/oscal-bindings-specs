# Proposal

## Why

A nested union can report failures from branches that the input does not select. This produces
multiple structured parse-error entries for one fault and conflicts with the branch-selection
rule for document roots in [PRS-013].

## What Changes

1. Require structured parse-error entries to describe the selected branch of a nested union.
2. Set a maximum of one failure for the corpus case with an invalid `how-many` value.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-parsing`: Define the selected nested-union branch for structured parse-error
   entries.

## Impact

1. The corpus case `parse/closed-enum-out-of-set` gains a maximum of one failure.
2. Binding implementations can use the new requirement to avoid entries from unselected nested
   union branches.
3. This change addresses [issue #36].

[PRS-013]: ../../specs/document-parsing/spec.md
[issue #36]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/36
