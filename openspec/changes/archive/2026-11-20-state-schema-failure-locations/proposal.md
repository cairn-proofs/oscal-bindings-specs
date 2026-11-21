# Proposal

## Why

[PRS-006] requires that each structured entry of a parse error identifies the failing location. It
does not say which node is the failing node. Two scenarios name the location of an entry in words
that allow two readings. [PRS-013.01] says that the entry "identifies that resource link". [PRS-014.01]
says that the entry "identifies that parameter selection". The location can be the value that
fails, or the object that holds it. The corpus counts the entries of a case and never compares a
location. Two bindings can pass the corpus and report different locations for the same fault. A
caller cannot rely on the location of an entry across bindings. This applies to GitHub issue #158.

[ELV-001] has the same gap. Each failure of an element "identifies a location", and no rule gives
the form of the location. [ELV-005] gives each constraint failure of an element a Normalized Path.
Without this change, one result carries a defined location for a constraint failure and an
undefined location for a schema failure.

The rule for the number of entries is also unclear. [PRS-006.01] and [ERR-003.01] say one entry for
each failing location. The corpus case `parse/two-failures` cites both and expects two entries for
two absent members of one object. Those two entries have one location. No requirement states the
unit of a failure, so a value that fails two keywords of the schema has no defined count.

## What Changes

1. Two new requirements in `document-parsing`. [PRS-021] states the failing node of each fault of
   the schema and so its location, as the Normalized Path of [CNS-024]. [PRS-022] states that each
   fault of the failures that [PRS-013] and [PRS-014] select gives one structured entry, and that
   entries can share a location.
2. [PRS-006] changes by one sentence, to point to the later requirements. The scenarios
   [PRS-006.01] and [ERR-003.01] count entries for each fault, not for each location. [ERR-003]
   cites [PRS-022] with [PRS-015] for the entries that share a location.
3. [PRS-013.01] and [PRS-014.01] state the location of their entry as a Normalized Path.
   [PRS-014.01] changes from the parameter selection to the value `how-many` in it.
4. A new requirement, [ELV-006], gives each schema failure of an element the same rules. The input
   is the array that holds only the element. The nested-union rule of [PRS-014] also applies to
   the failures of an element.
5. The corpus gets a field, `expected-locations`. It lists the location of each schema failure of
   a `parse` case or a `validate-element` case. The runner compares the list with the locations of
   the failures as multisets, as it does for `expected-constraints`. The field is required for each
   case that expects schema failure entries.
6. The corpus check derives the faults of each input from the errors of a JSON Schema validator,
   and requires that their locations equal the list of the case. A list that names the object in
   place of the value therefore fails.
7. The corpus gets one new element case. It holds a `parameter` element with an invalid `select`.
   It is the case for the nested-union rule of an element.
8. **BREAKING**: A binding must report the location of each schema failure, and one entry for each
   fault, as [PRS-021], [PRS-022] and [ELV-006] state. A binding that reports another location
   fails the cases that list locations. This is a break under [VER-003].

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `document-parsing`: new requirements [PRS-021] and [PRS-022] state the location and the number of
  the entries for schema faults. The requirement [PRS-006] points to them. The scenarios
  [PRS-006.01], [PRS-013.01] and [PRS-014.01] change.
- `error-model`: the requirement [ERR-003] cites [PRS-022]. Its scenario [ERR-003.01] counts the
  entries for each fault.
- `element-validation`: a new requirement, [ELV-006], states the location and the number of the
  failures for the schema faults of an element, and applies the nested-union rule to an element.

## Impact

1. `scripts/check-corpus.ts`: the new field, the derivation of the faults, and their self-tests.
2. `corpus/<release>/cases.json`, `corpus/<release>/README.md`: the field in the cases that expect
   schema failures, and the description of the field.
3. `corpus/<release>/elements/`: one new input for the new element case.
4. `openspec/requirements.json` and `openspec/coverage.json`: regenerated after the sync.
5. `VERSION`: no change. The version 0.10.0 on `main` is a break step above the latest release,
   v0.9.0, and no tag holds it ([VER-003], [VER-008]).
6. Each binding: a pin-move issue after the release. A binding reports the location of the failing
   node, and one entry for each fault, for each schema failure of a parse error and of an element.

[CNS-024]: ../../specs/constraint-validation/spec.md#requirement-cns-024-the-location-of-a-node-says-when-two-selections-are-the-same-node
[ELV-001]: ../../specs/element-validation/spec.md#requirement-elv-001-validate-a-standalone-element-against-a-named-type
[ELV-005]: ../../specs/element-validation/spec.md#requirement-elv-005-element-validation-applies-the-constraints-that-the-element-can-decide
[ELV-006]: specs/element-validation/spec.md#requirement-elv-006-the-location-of-a-schema-failure-of-an-element-is-the-location-of-the-failing-node
[ERR-003]: ../../specs/error-model/spec.md#requirement-err-003-parse-errors-expose-structured-validation-detail
[ERR-003.01]: ../../specs/error-model/spec.md#requirement-err-003-parse-errors-expose-structured-validation-detail
[PRS-006]: ../../specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[PRS-006.01]: ../../specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[PRS-013]: ../../specs/document-parsing/spec.md#requirement-prs-013-the-root-key-selects-the-document-type-of-the-parse-failures
[PRS-013.01]: ../../specs/document-parsing/spec.md#requirement-prs-013-the-root-key-selects-the-document-type-of-the-parse-failures
[PRS-014]: ../../specs/document-parsing/spec.md#requirement-prs-014-a-distinguishing-property-selects-the-nested-union-branch-of-parse-failures
[PRS-014.01]: ../../specs/document-parsing/spec.md#requirement-prs-014-a-distinguishing-property-selects-the-nested-union-branch-of-parse-failures
[PRS-015]: ../../specs/document-parsing/spec.md#requirement-prs-015-a-constraint-failure-is-a-parse-failure-that-names-its-constraint
[PRS-021]: specs/document-parsing/spec.md#requirement-prs-021-a-fault-of-the-schema-has-the-location-of-its-failing-node
[PRS-022]: specs/document-parsing/spec.md#requirement-prs-022-each-fault-of-the-selected-failures-gives-one-structured-entry
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
