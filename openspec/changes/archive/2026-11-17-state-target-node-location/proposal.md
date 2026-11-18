# Proposal

## Why

A target query of [CNS-007] runs on an array that holds only one context node. RFC 9535 defines a node as a value and
its location in the query argument. So two selections of one node from two context nodes are two different RFC 9535
nodes (#126). [CNS-008], [CNS-014] and [CNS-017] count or group nodes, and the specs do not state when two selections
are the same node. The evaluator in `scripts/constraints-manifest.ts` already uses one rule for this, but the specs
do not give that rule to the bindings.

## What Changes

1. [CNS-007] states that a target query runs on each context node of its entry, and selects only the context node
   or nodes in it.
2. [CNS-007] defines the location of a node, and states that two selections are the same node when they have the
   same location. The location of a node of the input is its RFC 9535 Normalized Path in the input. The input is the
   document, or the array that holds only the element. A query on an array that holds only one node of the input
   selects nodes of the input. The location of a node that it selects is the location of that one node, followed by
   the part of the Normalized Path of the selected node that comes after `$[0]`. The requirement does not set the
   format in which an implementation reports a location.
3. [CNS-023] states that the queries of an item run on an array that holds only the item. Item `i` of a list is the
   node `$[0][i]` of the input. With item 2, two items of a list do not share a location.
4. [CNS-008] and [CNS-014] refer to the rule of [CNS-007] for the same node. [CNS-014] states that a target node of
   an entry is in the index once, also when several context nodes of the entry select it.
5. [CNS-017] states that the location of a failure is the location of [CNS-007].
6. `npm run constraints:check` fails for a target query that can select the array that holds the context node. So
   the manifest keeps item 1 after a change to the generator.

The change adds no scenario. The corpus cases of [CNS-017.03] already check the main case: one part that the target
queries select from two controls gives one failure.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `constraint-validation`: [CNS-007], [CNS-023], [CNS-008], [CNS-014] and [CNS-017] change as What Changes states.

## Impact

1. `scripts/constraints.ts`: the check of item 6 of What Changes in `checkManifest()`, and a self-test for it. The
   constraint manifest meets item 1 today, so the check passes.
2. `scripts/constraints-manifest.ts`: no change. For a document and for an element that is not a list, the evaluator
   already gives each target node the location of item 2 of What Changes. The evaluator does not run the queries on
   the items of a list. #76 tracks that check.
3. [PRS-006] and [PRS-015]: no change. They use the location of [CNS-017], and the format of a location stays
   language-specific.
4. #76: a scenario for item 3 of What Changes belongs with the check that #76 adds for [CNS-023].
5. Bindings: a binding that counts two selections of one node as two nodes gives too many failures. Such a binding
   does not meet the contract after this change. It also does not meet [CNS-017.03] today.
6. `VERSION`: no change. The change is a fix, and `VERSION` is already one minor step above the latest release.

[CNS-007]: ../../specs/constraint-validation/spec.md#requirement-cns-007-each-entry-selects-context-nodes-and-target-nodes
[CNS-008]: ../../specs/constraint-validation/spec.md#requirement-cns-008-an-allowed-values-entry-checks-the-value-against-its-applicable-set
[CNS-014]: ../../specs/constraint-validation/spec.md#requirement-cns-014-an-index-holds-the-keys-of-each-index-entry-with-the-same-name
[CNS-017]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-017.03]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-023]: ../../specs/constraint-validation/spec.md#requirement-cns-023-the-element-queries-of-a-single-or-many-type-are-those-of-its-item-type
[PRS-006]: ../../specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[PRS-015]: ../../specs/document-parsing/spec.md#requirement-prs-015-a-constraint-failure-is-a-parse-failure-that-names-its-constraint
