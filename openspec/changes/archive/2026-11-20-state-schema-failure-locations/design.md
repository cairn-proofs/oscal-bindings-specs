# Design

## Context

See [proposal.md, Why](proposal.md#why) for the motivation (#158). These facts shape the approach:

1. [PRS-015] and [ELV-005] give each constraint failure a Normalized Path, as [CNS-024] defines it.
   No requirement gives a form to the location of a schema failure. [YML-010] already uses the
   location of the value for a scalar that matches no grammar.
2. The corpus check validates each corpus document against the vendored complete schema. It uses
   Ajv with the option `allErrors`, in `scripts/check-corpus.ts`. Ajv reports the location of each
   error as a JSON Pointer in `instancePath`. The root schema is a `oneOf` of the eight document
   types, so Ajv reports the errors of every document type at the root for each input. The script
   also builds one validator for each root key.
3. Ajv reports the errors of each branch of a union, also the branch that the object does not
   select, and it reports one error for each keyword that a value fails. [PRS-013] and [PRS-014]
   exist to remove this extra noise from the entries of a binding.
4. `expected-max-failures` and `expected-min-failures` bound the number of entries of a `parse`
   case. No field of a `validate-element` case bounds the number of failures. `expected-constraints`
   lists each constraint failure as a pair of `id` and location, and the runner compares the pairs
   as multisets.
5. The case `parse/two-failures` expects two entries. The metadata of its input has no `title` and
   no `version`, so both entries are for one object. The case cites [PRS-006.01] and [ERR-003.01].
6. `parameter` is a union with the branches `ParameterWithSelect` and `ParameterWithValues`. The
   element-type name `parameter` selects the union, and the property `select` selects a branch.
7. The corpus holds 5 `validate-element` cases that fail the schema, and none for a union.

## Goals / Non-Goals

**Goals:**

1. One location, and one entry, for each schema fault, so that two bindings that pass the corpus
   report the same entries.
2. A corpus check that derives the faults of an input, so that a wrong list fails. A list that
   names the holding object in place of the value is the case to catch.

**Non-Goals:**

1. A change to the way a binding selects a branch. [PRS-014] states it.

## Decisions

### D1. The failing node is the instance location of the failing keyword

A JSON Schema validator reports each error at an instance location. For a rejected value, the
location is the value. For `additionalProperties` and for `required`, the location is the object.
For `minItems` and for `type`, the location is the node. [PRS-021] states the same three cases and
adds the fourth, in item 4, for any other fault of one node.

The alternative is the object that holds the failing value, for each fault. It gives no rule for a
value that has no holding object, and it gives one location to the faults of one object. A second
alternative is the member itself, for an unknown member and for an absent member. An absent member
has no node in the document, so the rule would need a second form of location.

The rule for an object that holds an undefined member, and for an object that lacks a required
member, matches the current wording of [PRS-013.01]. A binding that builds its entries from a
model library can report the path of the member. It then removes the last segment.

### D2. A value is one fault, and each fault gives one entry

[PRS-021] gives the unit of a fault: one value, one undefined member, one absent member, or one
other node. A value that fails the keywords `pattern` and `format` is one fault, because
`parse/datetime-without-timezone` expects one entry. [PRS-022] states one entry for each fault of
the failures that [PRS-013] and [PRS-014] select. The input with no root key, the failures of a
branch that the object does not select, and an error over a limit give fewer entries, as those
requirements state. [PRS-022] sits below those requirements, so it cites them.

[PRS-022] also states that entries can share a location, as [PRS-015] states for constraint
failures. The case `parse/two-failures` needs this for two absent members of one object. The
scenarios [PRS-006.01] and [ERR-003.01] count entries for each fault. They do not count them for
each location, so they agree with that case. The requirement [ERR-003] cites [PRS-022] with
[PRS-015].

### D3. Placement of the new requirements

The delta adds [PRS-021] and [PRS-022] at the end of the file. At the sync, they go directly after
[PRS-014] and above [PRS-015]. [PRS-022] then cites [PRS-010], [PRS-012], [PRS-013] and [PRS-014]
above it. [PRS-006] cites no later requirement. It says that later requirements state the
location, as it already says for the entries that share a location.

[ELV-006] is a new requirement and [ELV-001] does not change. [ELV-001] cannot cite a requirement
below it, and it needs no text about the location, because [ELV-006] states it. [ELV-006] cites
[PRS-021], [PRS-014], [ELV-004] and [CNS-024] and copies none of them. The element-type name states
the type of the element, so an element needs no rule like [PRS-013].

### D4. `expected-locations` is a list of strings

The field is a list of Normalized Paths. A schema failure has no `id`, so an item is a string, not
the object of `expected-constraints`. The runner compares the list with the locations of the
schema failures of the parse error or the result, as multisets and with each repeat. The
exceptions are the same as for `expected-constraints`: a parse error that identifies a limit of
[PRS-010], and a result that identifies a limit of [ELV-004].

The field is mutually exclusive with `expected-constraints`. A parse error or a result for a
document or an element that fails the schema carries no constraint failure ([PRS-015], [ELV-005]).

The corpus check requires the field in these cases:

1. A `parse` case with `expected-max-failures`, except a case whose input names no document type.
   [PRS-013] gives that case no failure entry.
2. A `validate-element` case with `expected-valid` false and no `expected-constraints`.

The check also requires that the number of items is not less than `expected-min-failures` and
not more than `expected-max-failures`, for a case that has them. The bounds stay in the cases
without change.

### D5. The corpus check derives the faults from the errors of Ajv

The check derives the faults of each input, and requires that the multiset of their Normalized
Paths equals `expected-locations`. The derivation has these steps:

1. Validate the input with the validator of its root key. This removes the errors of the root
   `oneOf`. For an element, wrap the element in an array and validate it against the schema of the
   element type, so that the locations start with `$[0]`.
2. Drop each error that belongs to a union branch that the object does not select. The selected
   branch is the branch whose distinguishing property the object holds. `names.json` gives these
   properties in `variants`, as [NAM-020] states.
3. Drop each error with the keyword `anyOf`, `oneOf` or `if`. These errors only summarize others.
4. Count one fault for each `required` error and for each `additionalProperties` error, and one
   fault for each other node that has an error.
5. Convert each `instancePath` to a Normalized Path with the escapes of RFC 9535 for a name. The
   check reuses the function that gives the location of a constraint failure, if the store has
   one. Otherwise it adds one function.

The derivation copies the selection rule of [PRS-014]. The list of a case is a second, independent
source, written by hand from [PRS-021]. A difference between the two shows a defect in one of them.
A subset check of the Ajv paths is not enough, because the root errors and the errors of an
unselected branch put the parent object of the failing value in the set of Ajv paths.

If task 1.1 shows that no derivation of this kind reproduces the hand-written lists, the work stops
and the weaker check needs a decision from the owner of the store.

### D6. One new element case covers the nested-union rule of an element

[ELV-006.04] needs an input in which an element holds the distinguishing property of a branch.
The new input `elements/parameter-select-out-of-set.json` holds a `parameter` with an `id` and a
`select` with `how-many` set to `seven`. The new case `element/parameter-select-out-of-set` expects
the one location `$[0]['select']['how-many']`. The five existing element cases that fail the schema
get `expected-locations`. Three of them also get an identifier of [ELV-006] in `requirements`. The
cases of the parse operation get the identifiers [PRS-021.01] to [PRS-021.04] and [PRS-022.01] in
`requirements`.

## Risks / Trade-offs

1. [The reports of Ajv for `required` and `additionalProperties` differ from the assumption of D1] →
   Task 1.1 runs Ajv on the cases before any other task. If the locations differ, D5 changes. The
   specs do not change.
2. [A binding that reports the path of the member fails the cases] → The binding removes the last
   segment, or it lists the cases as expected conformance failures ([VER-007]). The pin-move issue
   states the rule.
3. [The derivation of D5 holds a copy of the selection rule, so it can drift from [PRS-014]] → The
   derivation reads the branches from `names.json`, the data that [NAM-020] gives. The lists of the
   cases are independent, so a drift shows as a failing case.
4. [A location holds a member name that needs an escape in a Normalized Path] → No current case
   does. The conversion of D5 applies the escapes of RFC 9535 if a later case does.

[ELV-001]: ../../specs/element-validation/spec.md#requirement-elv-001-validate-a-standalone-element-against-a-named-type
[ELV-004]: ../../specs/element-validation/spec.md#requirement-elv-004-a-binding-can-limit-the-resources-that-element-validation-uses
[ELV-005]: ../../specs/element-validation/spec.md#requirement-elv-005-element-validation-applies-the-constraints-that-the-element-can-decide
[ELV-006]: specs/element-validation/spec.md#requirement-elv-006-the-location-of-a-schema-failure-of-an-element-is-the-location-of-the-failing-node
[ELV-006.04]: specs/element-validation/spec.md#requirement-elv-006-the-location-of-a-schema-failure-of-an-element-is-the-location-of-the-failing-node
[ERR-003]: ../../specs/error-model/spec.md#requirement-err-003-parse-errors-expose-structured-validation-detail
[ERR-003.01]: ../../specs/error-model/spec.md#requirement-err-003-parse-errors-expose-structured-validation-detail
[CNS-024]: ../../specs/constraint-validation/spec.md#requirement-cns-024-the-location-of-a-node-says-when-two-selections-are-the-same-node
[NAM-020]: ../../specs/naming-manifest/spec.md#requirement-nam-020-a-distinguishing-property-identifies-a-branch-only-when-an-object-holds-it
[PRS-006]: ../../specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[PRS-006.01]: ../../specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[PRS-010]: ../../specs/document-parsing/spec.md#requirement-prs-010-a-binding-can-limit-the-resources-that-a-parse-uses
[PRS-012]: ../../specs/document-parsing/spec.md#requirement-prs-012-a-parse-error-carries-each-entry-or-100-entries-or-more
[PRS-013]: ../../specs/document-parsing/spec.md#requirement-prs-013-the-root-key-selects-the-document-type-of-the-parse-failures
[PRS-013.01]: ../../specs/document-parsing/spec.md#requirement-prs-013-the-root-key-selects-the-document-type-of-the-parse-failures
[PRS-014]: ../../specs/document-parsing/spec.md#requirement-prs-014-a-distinguishing-property-selects-the-nested-union-branch-of-parse-failures
[PRS-015]: ../../specs/document-parsing/spec.md#requirement-prs-015-a-constraint-failure-is-a-parse-failure-that-names-its-constraint
[PRS-021]: specs/document-parsing/spec.md#requirement-prs-021-a-fault-of-the-schema-has-the-location-of-its-failing-node
[PRS-021.01]: specs/document-parsing/spec.md#requirement-prs-021-a-fault-of-the-schema-has-the-location-of-its-failing-node
[PRS-021.04]: specs/document-parsing/spec.md#requirement-prs-021-a-fault-of-the-schema-has-the-location-of-its-failing-node
[PRS-022]: specs/document-parsing/spec.md#requirement-prs-022-each-fault-of-the-selected-failures-gives-one-structured-entry
[PRS-022.01]: specs/document-parsing/spec.md#requirement-prs-022-each-fault-of-the-selected-failures-gives-one-structured-entry
[VER-007]: ../../specs/schema-versioning/spec.md#requirement-ver-007-each-binding-keeps-its-own-expected-conformance-failures
[YML-010]: ../../specs/yaml-documents/spec.md#requirement-yml-010-a-grammar-error-of-a-scalar-carries-the-location-of-the-scalar
