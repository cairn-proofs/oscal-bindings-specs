# Proposal

## Why

The corpus checks only the `id` of each constraint failure. A binding that reports the right `id` at
the wrong location passes every case. The contract already gives each constraint failure a location
([CNS-024], [CNS-017]), but the entry that a binding reports is not required to carry it.

One rule is also missing. [CNS-013] and [CNS-014] state how many failures the nodes with the same
key give. They do not state which nodes give them. RFC 9535 does not fix the order of the members of
an object. Two conforming bindings can therefore report the same failures at different locations for
the same document. This applies to GitHub issue #140.

## What Changes

1. Locations have a fixed order, from segment to segment. This adds [CNS-026]. The nodes with the
   same key are in the order of their locations. The first node gives no failure. Each other node
   gives one failure. This changes [CNS-013] and [CNS-014]. The number of failures does not change.
2. Each entry for a constraint failure also carries the location of the failure, as the Normalized
   Path of [CNS-024]. This changes [PRS-015] and [ELV-005]. Schema failures do not change.
3. The location of a failure in an item of a list element is the location of the item in the
   input, followed by the rest of the location. The second item of a list is at `$[0][1]`. This
   changes [CNS-023] and adds [ELV-005.04]. The reference evaluator gives no failure for a list
   element, so it also gets this rule.
4. The two evaluators of the store put the nodes with the same key in the order of item 1 before
   they give the failures. One function gives the order to both. The first is the reference
   evaluator of [CNS-019], `scripts/constraint-reference.ts`. The corpus check and the generator of
   the corpus cases use it. The second is the RFC 9535 evaluator of [CNS-022],
   `scripts/constraints-manifest.ts`. The fault runner uses it.
5. Each expected constraint failure of a corpus case gives its `id` and its location. The runner
   compares the lists of pairs in any order, with each repeat. `npm run corpus:cases` writes the
   locations of the generated cases from the reference evaluator. The other cases state their
   locations, and the corpus check compares them with the reference evaluator. This changes
   [CNS-020]. The runner of a builder case does not change.
6. The corpus holds three cases with an `index` entry whose nodes with the same key have another
   order when a binding selects them in the order of the query or sorts the text of the locations.
   In the first case, a control holds a control with the `id` of a later control. In the second
   case, the nodes are in different members of an object, and the document gives the members in an
   order that is not the order of their names. In the third case, the nodes are at the indexes 2
   and 10 of one array. No generated case can hold these inputs, so they are written by hand.
7. `scripts/coverage-faults.ts` gets faults that change locations. A fault that changes a location
   and no `id` is valid, because the runner now compares locations. The faults are:
   1. The failure is at the context node in place of the target node.
   2. The first node with a key gives the failure in place of a later node, for `is-unique` and for
      `index`.
   3. The nodes with the same key are in the order of the query in place of the order of the
      locations, for `index`. An `is-unique` entry of the store selects the nodes of one array, so
      the order of the query is the order of the locations and no input can detect this fault for
      `is-unique`.
   4. The nodes with the same key are in the order of the text of the locations in place of the
      order of the locations, for `index`.
8. **BREAKING**: A binding must report the location of each constraint failure. Each item of
   `expected-constraints` in `cases.json` changes from a string to an object with `id` and
   `location`. This is a break under [VER-003].

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `constraint-validation`: a new requirement, [CNS-026], states the order of locations. [CNS-013]
  and [CNS-014] use it for the order of the nodes with the same key. [CNS-020] states that a case
  lists the `id` and the location of each failure. [CNS-023] states the location of a failure in
  an item of a list.
- `document-parsing`: [PRS-015] states that each entry for a constraint failure carries its
  location.
- `element-validation`: [ELV-005] states that each failure of the result carries its location.

## Impact

1. `scripts/constraint-reference.ts`, `scripts/constraints-manifest.ts` and a new module for the
   comparison: the order of the nodes with the same key.
2. `scripts/check-corpus.ts`, `scripts/corpus-constraint-cases.ts` and
   `scripts/corpus-constraints.ts`: the comparison, the generation of the expected failures, and
   the failures of a list element.
3. `scripts/coverage-faults.ts`: the new faults, the rule for a valid fault, and the text of its
   report.
4. `corpus/<release>/cases.json`, `corpus/<release>/README.md`: the new shape of
   `expected-constraints`, and the new cases with their inputs.
5. `VERSION`: the release that holds this change has a version that is a break step above the
   latest release ([VER-003], [VER-008]).
6. Each binding: a pin-move issue after the release. A binding reports the location and sorts the
   nodes with the same key.

[CNS-013]: ../../specs/constraint-validation/spec.md#requirement-cns-013-an-is-unique-entry-fails-for-target-nodes-with-the-same-key
[CNS-014]: ../../specs/constraint-validation/spec.md#requirement-cns-014-an-index-holds-the-keys-of-each-index-entry-with-the-same-name
[CNS-017]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-019]: ../../specs/constraint-validation/spec.md#requirement-cns-019-the-store-checks-the-queries-against-a-reference-evaluator
[CNS-020]: ../../specs/constraint-validation/spec.md#requirement-cns-020-the-corpus-has-a-failing-case-for-each-reportable-entry
[CNS-023]: ../../specs/constraint-validation/spec.md#requirement-cns-023-the-element-queries-of-a-single-or-many-type-are-those-of-its-item-type
[CNS-024]: ../../specs/constraint-validation/spec.md#requirement-cns-024-the-location-of-a-node-says-when-two-selections-are-the-same-node
[CNS-022]: ../../specs/constraint-validation/spec.md#requirement-cns-022-the-store-checks-the-failures-of-the-manifest-against-the-reference-evaluator
[CNS-026]: specs/constraint-validation/spec.md#requirement-cns-026-locations-are-in-a-fixed-order
[PRS-015]: ../../specs/document-parsing/spec.md#requirement-prs-015-a-constraint-failure-is-a-parse-failure-that-names-its-constraint
[ELV-005]: ../../specs/element-validation/spec.md#requirement-elv-005-element-validation-applies-the-constraints-that-the-element-can-decide
[ELV-005.04]: specs/element-validation/spec.md#scenario-elv-00504-the-location-of-a-failure-in-a-list-element
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
