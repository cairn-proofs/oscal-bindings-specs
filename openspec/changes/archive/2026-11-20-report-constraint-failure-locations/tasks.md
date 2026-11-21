# Tasks

## 1. Evaluators

- [x] 1.1 Write `scripts/location-order.ts` with one comparison function for locations, as
      [CNS-026], [D2] and [D3] state. Add self-tests to `scripts/constraints.ts`. Each name starts
      with the identifier of its scenario: `CNS-026.01:` to `CNS-026.04:`. CNS-026.02 and
      CNS-026.03 hold the names of the scenarios, because no corpus input can hold them. Verify
      `npm run constraints:self-test` and `npm run typecheck` pass.
- [x] 1.2 In `scripts/constraints-manifest.ts`, use the function in the `is-unique` case and in the
      final loop of the `index` entries, as [D3] states. Add self-tests to `scripts/constraints.ts`
      for the three inputs of [D5], with the locations of 2.4. The names start with `CNS-014.03:`,
      `CNS-014.04:` and `CNS-026.01:`. Verify `npm run constraints:self-test` passes.
- [x] 1.3 In `scripts/constraint-reference.ts`, use the same function in the `is-unique` case and in
      the final loop of the `index` entries. Add self-test cases for the three inputs of D5 to its
      `--self-test`. Verify `npm run reference:self-test` passes, and verify
      `npm run corpus:check` passes. The corpus check still compares the `id` values at this step.

- [x] 1.4 In `scripts/corpus-constraints.ts`, make `ofElement` apply the element queries of a
      single-or-many type to each item of a list, and give each location as [D7] states. Add
      self-tests with names that start with `CNS-023.02:` to `scripts/constraints.ts` and to the
      `--self-test` of `scripts/constraint-reference.ts`, for the list of two mappings of the
      scenario. Verify `npm run constraints:self-test`, `npm run reference:self-test` and
      `npm run corpus:check` pass.

## 2. Corpus

- [x] 2.1 In `scripts/check-corpus.ts`, change `constraintMismatch` and the check of the field
      `expected-constraints` as [D4] states. An item is an object with the strings `id` and
      `location`. The comparison is a multiset of pairs. Change item 17 of the header comment.
      Add self-tests: a wrong location fails, a missing repeat of a pair fails, and a repeated
      pair passes. The name of the test for a wrong location starts with `CNS-020.03:`. Verify
      `npm run corpus:self-test` passes. `npm run corpus:check` fails until 2.3.
- [x] 2.2 In `scripts/corpus-constraint-cases.ts`, write each item of `expected-constraints` as an
      object with `id` and `location` from the failure of the reference evaluator. Add `PRS-015.04`
      to the `requirements` of each generated case. Run `npm run corpus:cases`. Verify
      `npm run corpus:cases:self-test` passes. Verify `git diff --stat corpus/` lists only
      `cases.json`. Verify that the list of `id` values of each case is the same as in `HEAD`.
- [x] 2.3 Change the six hand-written cases that have `expected-constraints` to the new shape:
      `parse/nested-control-part-name`, `parse/nested-control-part-name-three-levels`,
      `parse/allowed-value-case`, `element/hash-wrong-length`, `build-hash/wrong-length` and
      `build-resource/duplicate-rlink-href`. Take each location from one run of the reference
      evaluator, and check it by hand against [CNS-024] and [CNS-017]. Add `ELV-005.03` to the
      `requirements` of `element/hash-wrong-length`. Verify `npm run corpus:check` passes.
- [x] 2.4 Add the three inputs of [D5] to `corpus/1.2.3/documents/invalid/`, and a `parse` case for
      each in `cases.json`, directly before the first case with an id that starts with
      `parse/constraint/`. Derive the failures and their locations by hand from [CNS-026], not
      from an evaluator. The case of the nested control cites `CNS-014.04`. The case of the members
      cites `CNS-014.03`. The case of the indexes 2 and 10 cites `CNS-026.01`. Verify
      `npm run corpus:check` passes. Run `npm run corpus:cases`, and verify that the three cases
      are still in `cases.json` before the generated cases.
- [x] 2.5 In `corpus/1.2.3/README.md`, change the description of `expected-constraints` to the new
      shape, with the comparison of D4 and the form of a location for a document and for an element
      that is one item, and for item k of a list element, `$[0][k]` followed by the rest. Link
      CNS-024 and CNS-026 as the other identifiers of the file are linked. Verify the links resolve
      in the main specs after 4.1.

- [x] 2.6 Add `elements/mapping-collection-mappings-list.json`, a list of two mappings in which the
      second holds a property with the name `bogus`, and the case
      `element/mapping-collection-mappings-list` with `element-type`
      `mapping-collection-mappings`, `expected-valid` `false`, and the scenarios `ELV-005.04` and
      `CNS-023.02` in `requirements`. Derive the failures and their locations by
      hand from [CNS-023] and [CNS-024]. If the corpus check rejects the element type, change the
      check so that it accepts a single-or-many type. Verify `npm run corpus:check` passes.

## 3. Faults

- [x] 3.1 In `scripts/coverage-faults.ts`, change rule 5 of the header as [D6] states. Change the
      header and the two report texts that state that the faults are for `allowed-values` entries
      only. Add the five faults of D6 with the `breaks` values CNS-017, CNS-013, CNS-014, CNS-026
      and CNS-026. Each patch text occurs once in `scripts/constraints-manifest.ts`. Add self-test
      cases for the new rule 5, and change each existing self-test that gives `expected` as
      strings. Verify `npm run coverage:faults:self-test` passes. Verify
      `npm run coverage:faults` passes and its report lists a case that detects each of the five
      faults.

## 4. Sync, archive and integration

- [x] 4.1 Sync the deltas into `openspec/specs/`. Put CNS-026 directly below CNS-024 in
      `constraint-validation`. In `openspec/spec-ids.yaml`, set `next` of `CNS` to 27. Run
      `npm run requirements:write` and `npm run coverage:write`. Verify `npm run spec-ids`,
      `npm run requirements:check` and `npm run coverage:check` pass. Verify
      `openspec/coverage.json` lists a corpus case or a self-test for each new scenario:
      CNS-014.03, CNS-014.04, CNS-020.03, CNS-023.02, CNS-026.01 to CNS-026.04, PRS-015.04,
      ELV-005.03 and ELV-005.04.
- [x] 4.2 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 4.3 Run `npm run check`. If `npm run templates:check` fails, run `npm run templates:write` and
      run `npm run check` again. Verify `npm run check` passes.

## Workflow follow-up

1. Close #140 with the pull request.
2. The next release holds this change. The version of the release is a break step above the latest
   release ([VER-003], [VER-008]). If `VERSION` already holds that version, it does not change.
   After the release, each binding gets a pin-move issue.

[D2]: design.md#d2-names-compare-as-member-names-by-code-point
[D3]: design.md#d3-both-evaluators-order-the-nodes-where-they-give-the-failures
[D4]: design.md#d4-the-items-of-expected-constraints-are-objects
[D5]: design.md#d5-three-hand-written-cases-pin-the-order
[D6]: design.md#d6-faults-for-the-location-and-for-the-order
[D7]: design.md#d7-the-location-of-a-failure-in-a-list-element-is-relative-to-the-list
[CNS-017]: ../../specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-023]: ../../specs/constraint-validation/spec.md#requirement-cns-023-the-element-queries-of-a-single-or-many-type-are-those-of-its-item-type
[CNS-024]: ../../specs/constraint-validation/spec.md#requirement-cns-024-the-location-of-a-node-says-when-two-selections-are-the-same-node
[CNS-026]: specs/constraint-validation/spec.md#requirement-cns-026-locations-are-in-a-fixed-order
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
