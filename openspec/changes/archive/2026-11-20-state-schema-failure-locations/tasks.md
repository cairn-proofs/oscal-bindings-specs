# Tasks

## 1. Corpus check

- [x] 1.1 Write a script in the scratchpad directory, not in `scripts/`. For each of the 24 `parse`
      cases that have `expected-max-failures` (not `parse/unknown-root`) and the 5 `validate-element`
      cases that fail the schema, and for the input of the new case of 2.3, apply the derivation of
      [D5]. Print the derived Normalized Paths. Verify by hand that each derived list is the list
      that [PRS-021] and [PRS-022] give for the input. Verify that `required`, `additionalProperties`,
      `enum` and `minItems` errors have the `instancePath` that [D1] assumes. If no derivation
      reproduces a list, stop and ask the owner of the store, as [D5] states.
- [x] 1.2 In `scripts/check-corpus.ts`, add the field `expected-locations` to the case type. Apply
      the rules of [D4]: the field is a list of valid Normalized Paths, and it is not present with
      `expected-constraints`. Its number of items agrees with `expected-min-failures` and
      `expected-max-failures`. The check fails when a case that [D4] lists has no field. Apply the
      derivation of [D5], and require that its multiset of locations equals the list. Add the rules
      to the header comment. Verify `npm run typecheck` passes. `npm run corpus:check` fails until
      2.1 to 2.3.
- [x] 1.3 Add self-tests to `scripts/check-corpus.ts`. Each name starts with the identifier of its
      scenario: `PRS-021.01:` for a valid list, `PRS-021.04:` for a value that fails two keywords,
      `PRS-022.01:` for a repeated location, and `ELV-006.03:` for an element location that starts
      with `$[0]`. Add one test for each failure: a path that is not a Normalized Path, the holding
      object in place of the value, a list that holds `$`, a count above `expected-max-failures`, a
      list with `expected-constraints`, and a missing list in a case that needs it. Verify
      `npm run corpus:self-test` passes.

## 2. Corpus data

- [x] 2.1 Add `expected-locations` to each of the 24 `parse` cases that have `expected-max-failures`,
      except `parse/unknown-root`. Write each location by hand from [PRS-021]. Do not copy it from
      the output of the derivation. Add `PRS-021.01` to the `requirements` of
      `parse/datetime-lowercase-zone`, `PRS-021.02` to `parse/unknown-field-top`, `PRS-021.03` to
      `parse/missing-required-field`, `PRS-021.04` to `parse/datetime-without-timezone`, and
      `PRS-022.01` to `parse/two-failures`. Verify `npm run corpus:check` reports no error for a
      `parse` case.
- [x] 2.2 Add `expected-locations` to the five `validate-element` cases that fail the schema. Add
      `ELV-006.01` to `element/parameter-selection-out-of-set`, `ELV-006.02` to
      `element/observation-missing-collected`, and `ELV-006.03` to
      `element/back-matter-empty-resources`. Verify `npm run corpus:check` reports no error for
      these cases.
- [x] 2.3 Add `elements/parameter-select-out-of-set.json`, a `parameter` with an `id` and a
      `select` with `how-many` set to `seven`. Add the case `element/parameter-select-out-of-set`
      with `element-type` `parameter`, `expected-valid` false, the location
      `$[0]['select']['how-many']`, and `ELV-006.04` in `requirements`. Verify
      `npm run corpus:check` passes.
- [x] 2.4 In `corpus/1.2.3/README.md`, describe `expected-locations`: the form of a location for a
      document and for an element, the comparison as multisets, the exception for a limit, and the
      cases that need the field. Add the field to the descriptions of the `parse` and
      `validate-element` operations. Link PRS-021, PRS-022, ELV-006 and CNS-024 as the other
      identifiers of the file are linked. Verify the links resolve in the main specs after 3.1.

## 3. Sync and generated files

- [x] 3.1 Sync the deltas into `openspec/specs/`. Put PRS-021 and PRS-022 directly after PRS-014 in
      `document-parsing`. In `openspec/spec-ids.yaml`, set `next` of `PRS` to 23 and `next` of
      `ELV` to 7. Verify `npm run spec-ids` passes.
- [x] 3.2 Run `npm run requirements:write` and `npm run coverage:write`. Verify
      `npm run requirements:check` and `npm run coverage:check` pass. Verify
      `openspec/coverage.json` lists a corpus case or a self-test for each new scenario: PRS-021.01
      to PRS-021.04, PRS-022.01 and ELV-006.01 to ELV-006.04. Do not add a `by-design` entry for a
      scenario that a case tests.

## 4. Archive and integration

- [x] 4.1 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 4.2 Run `npm run check`. If `npm run templates:check` fails, run `npm run templates:write`
      and run `npm run check` again. Verify `npm run check` passes.

## Workflow follow-up

1. Close #158 with the pull request.
2. The next release holds this change. The version of the release is a break step above the latest
   release ([VER-003], [VER-008]). `VERSION` already holds that version, so it does not change.
   After the release, each binding gets a pin-move issue.

[D1]: design.md#d1-the-failing-node-is-the-instance-location-of-the-failing-keyword
[D4]: design.md#d4-expected-locations-is-a-list-of-strings
[D5]: design.md#d5-the-corpus-check-derives-the-faults-from-the-errors-of-ajv
[PRS-021]: specs/document-parsing/spec.md#requirement-prs-021-a-fault-of-the-schema-has-the-location-of-its-failing-node
[PRS-022]: specs/document-parsing/spec.md#requirement-prs-022-each-fault-of-the-selected-failures-gives-one-structured-entry
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
