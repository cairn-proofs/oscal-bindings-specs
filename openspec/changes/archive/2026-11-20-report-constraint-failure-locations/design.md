# Design

## Context

See [proposal.md, Why](proposal.md#why) for the motivation (#140). These facts shape the approach:

1. The store has two evaluators for the constraint manifest. The reference evaluator of [CNS-019]
   is `evaluate` in `scripts/constraint-reference.ts`. It reads the metaschema. The corpus check and
   the generator of the corpus cases reach it through `CorpusConstraints` in
   `scripts/corpus-constraints.ts`. The RFC 9535 evaluator of [CNS-022] is `evaluateManifest` in
   `scripts/constraints-manifest.ts`. It reads no metaschema. The fault runner and
   `scripts/constraints.ts` use it.
2. Each evaluator gives an `is-unique` failure for the second and each later node of a key, in the
   order that the target query selects them. Each gives an `index` failure for each node after the
   first node of a key, in the order that the `index` entries and their queries select the nodes.
3. A descendant query such as `$[0]..['controls'][*]` runs its selector at each node in turn. A
   node comes before its descendants, and the members of an object come in document order. A
   control inside the first control of a catalog therefore comes after the second control.
4. Each `is-unique` entry of the store has one target query, `$[0]['name'][*]` or `$[0]['name']`.
   The query selects the nodes of one array, so the order of the query is the order of the
   locations.
5. In the current corpus, the two evaluators give the same pairs of `id` and location for each
   document case. Sorting the nodes by location changes no failure location. Reversing the members
   of every object in each input changes none either. Each generated duplicate is a copy next to
   its original in one array. Hand-built catalogs do change a location. In one, a control holds a
   control with the `id` of a later control. In another, `groups` comes before `controls`, and a
   part in a group has the `id` of a part in a control. For the second catalog, the two evaluators
   give two different locations.
6. `constraintMismatch` in `scripts/check-corpus.ts` compares the `id` values only. 239 cases have
   `expected-constraints`. `npm run corpus:cases` writes 233 of them. The other six are written by
   hand: three `parse` cases, one `validate-element` case and two builder cases. The generator
   replaces the text of `cases.json` from the first generated case to the end of the file.
7. `scripts/coverage-faults.ts` runs each fault on the document cases, with the RFC 9535 evaluator.
   Rule 5 of its header says that a fault that changes only a location is not valid. The run fails
   for a fault that no case detects.
8. `scripts/coverage.ts` counts a corpus case that cites a scenario, and a self-test whose name
   starts with the identifier of the scenario. It does not count a fault.
9. Each member name that the schema of 1.2.3 allows matches `[a-z0-9-]+`, except `$schema` at the
   root. A conforming input cannot hold the names of [CNS-026.02] and [CNS-026.03].
10. For an element of kind `single-or-many` that is a list, [CNS-023] states that an implementation
    applies the queries to each item on an array that holds only the item. For a list of two
    mappings with a fault in the second, `evaluateManifest` on the array that holds the list gives
    the location `$[0][1]['props'][0]['name']`. It gives `$[0]['props'][0]['name']` on the array
    that holds only the second item. `ofElement` in `scripts/corpus-constraints.ts` gives no
    failure for the list. No corpus case has a list element.

## Goals / Non-Goals

**Goals:**

1. The same location for each constraint failure in each binding.
2. A corpus that fails a binding that reports a wrong location.

**Non-Goals:**

1. The location of a schema failure. The JSON Schema validator of each binding gives it.
2. The form of the location in the API of a binding. The entry carries the Normalized Path as a
   string. The binding can also give its own form.

## Decisions

### D1. One requirement for the order of locations

The order goes in [CNS-026]. [CNS-013] and [CNS-014] cite it. The three rules then occur once. The
sync puts CNS-026 directly below [CNS-024], so each requirement that cites it comes after it.

Alternatives: The three rules in CNS-013 and again in CNS-014 would copy a normative text. The rules
in CNS-024 would make that requirement state two ideas, the identity of a node and the order of
nodes.

### D2. Names compare as member names, by code point

A name segment compares as the member name that it gives. The text of a Normalized Path escapes
some characters, so the order of the text can differ from the order of the names. Code point order
differs from the default order of strings in JavaScript, Java and C#, which compare UTF-16 code
units. The names U+FF5E and U+1F600 have opposite orders in the two. [CNS-026.03] holds this pair.

An index segment and a name segment never meet at one position. Two locations with the same start
reach the same node, and a node is an array or an object. So the three rules give a total order.

### D3. Both evaluators order the nodes where they give the failures

A new module, `scripts/location-order.ts`, holds one comparison function for locations. Both
evaluators import it, so they cannot differ. In each evaluator, the `is-unique` case orders the
target nodes of one context node with it, before it looks for the second node of a key. The final
loop of the `index` entries orders the nodes of each key with it, before it skips the first node.
The number of failures, the entry of each failure and the `id` of each failure do not change.

The corpus check compares the reference evaluator with the expected failures of each case. The
fault runner compares the RFC 9535 evaluator with the same expected failures, before it applies a
fault. So the two evaluators give the same locations on the corpus documents. [CNS-022] still
compares only the number of failures for each entry.

### D4. The items of `expected-constraints` are objects

The field keeps its name. Each item changes from a string to an object with `id` and `location`.
The runner of a binding compares the lists of pairs as multisets. A pair can occur more than once,
because one location can have several failures ([CNS-017]).

All cases that have the field change in the same way, with the builder cases. One field has one
shape. The runner of a builder case ignores the items and checks only the builder error.

The locations come from three places:

1. `npm run corpus:cases` writes the locations of the 233 generated cases from the reference
   evaluator.
2. The six existing hand-written cases get their locations from one run of the reference evaluator.
   The author checks each location against [CNS-024] and [CNS-017].
3. The three new cases of D5 get their locations by hand from [CNS-026], not from an evaluator.
   They check the evaluators against the rule, so they must not copy it.

`constraintMismatch` in `scripts/check-corpus.ts` compares the pairs. A check that gives a wrong
location fails the corpus check.

### D5. Three hand-written cases pin the order

The three inputs go in `corpus/1.2.3/documents/invalid/`, with a `parse` case for each. The cases
go directly before the first generated case in `cases.json`, because the generator replaces the
text from that case to the end of the file. Each case lists every failure that the input gives. An
input that conforms to the schema and gives other failures is allowed.

1. A catalog with two controls. The first control holds a control with the `id` of the second
   control. The failure is at the second control, `$['catalog']['controls'][1]`. A binding that
   keeps the order of the query gives the failure at the inner control. This case needs no rule for
   the members of an object. It cites [CNS-014.04].
2. A catalog with `groups` before `controls`. A part in the first group has the `id` of a part in
   the first control. The failure is at the part in the group, because `controls` comes before
   `groups` by code point. It cites [CNS-014.03].
3. A catalog with 11 controls. The controls at the indexes 2 and 10 have the same `id`. The failure
   is at the control at the index 10. A binding that compares the text of the locations gives the
   failure at the control at the index 2. It cites [CNS-026.01].

The reference evaluator already gives the expected location for case 2, without the new order. The
case detects a binding that keeps the order of the query, and the fault runner detects the same
fault in the RFC 9535 evaluator.

By Context 9, no case can check CNS-026.02 and CNS-026.03. Self-tests with names that start with the
identifiers of CNS-026.01 to CNS-026.04 check the comparison function.

### D6. Faults for the location and for the order

`scripts/coverage-faults.ts` gets five faults. Each one changes locations. Each patches the call
site of the order, not the module of the comparison function:

1. The failure is at the context node in place of the target node.
2. The first node with a key gives the failure in place of a later node, for `is-unique`.
3. The same fault for `index`.
4. The `index` entries use the order of the query in place of the order of the locations.
5. The `index` entries use the order of the text of the locations in place of the order of the
   locations.

An `is-unique` version of fault 4 has no detecting input, as Context 4 states, so the run would fail
for it. It is not added.

Rule 5 of the header of the file changes. A fault is valid when an input that conforms to the schema
can change the list of pairs that the runner compares. The header and the two report texts of the
file no longer state that the faults are for `allowed-values` entries only.

### D7. The location of a failure in a list element is relative to the list

The location of a failure in item k of a list is the location of the item in the input, `$[0][k]`,
followed by the part of the location after `$[0]` in the array that holds only the item. This is
the rule of [CNS-024] for a node in a context node, applied to an item. [CNS-023] states it.
`evaluateManifest` already gives these locations for the array that holds the list. `ofElement` in
`scripts/corpus-constraints.ts` applies the queries to each item and gives the location of D7 for
each failure. A corpus case with a list element checks it.

Alternative: A location relative to the item, `$[0]['props'][0]['name']` for each item, gives the
same location to failures in different items, and the caller cannot tell which item failed.

## Risks / Trade-offs

1. A binding written for the old corpus fails each case that has `expected-constraints`. The change
   is a break under [VER-003]. Each binding gets a pin-move issue after the release.
2. A wrong comparison function gives a wrong location to the generated cases. The three cases of
   D5, the self-tests of CNS-026 and the faults check the order independently of the generated
   cases.

[CNS-013]: ../../specs/constraint-validation/spec.md#requirement-cns-013-an-is-unique-entry-fails-for-target-nodes-with-the-same-key
[CNS-014]: ../../specs/constraint-validation/spec.md#requirement-cns-014-an-index-holds-the-keys-of-each-index-entry-with-the-same-name
[CNS-014.03]: specs/constraint-validation/spec.md#scenario-cns-01403-two-nodes-in-different-members-of-an-object
[CNS-014.04]: specs/constraint-validation/spec.md#scenario-cns-01404-a-node-inside-an-earlier-node
[CNS-017]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-019]: ../../specs/constraint-validation/spec.md#requirement-cns-019-the-store-checks-the-queries-against-a-reference-evaluator
[CNS-022]: ../../specs/constraint-validation/spec.md#requirement-cns-022-the-store-checks-the-failures-of-the-manifest-against-the-reference-evaluator
[CNS-023]: ../../specs/constraint-validation/spec.md#requirement-cns-023-the-element-queries-of-a-single-or-many-type-are-those-of-its-item-type
[CNS-024]: ../../specs/constraint-validation/spec.md#requirement-cns-024-the-location-of-a-node-says-when-two-selections-are-the-same-node
[CNS-026]: specs/constraint-validation/spec.md#requirement-cns-026-locations-are-in-a-fixed-order
[CNS-026.01]: specs/constraint-validation/spec.md#scenario-cns-02601-two-index-segments
[CNS-026.02]: specs/constraint-validation/spec.md#scenario-cns-02602-two-names
[CNS-026.03]: specs/constraint-validation/spec.md#scenario-cns-02603-two-names-outside-the-basic-multilingual-plane
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
