# Tasks

## 1. Sync the requirements

- [ ] 1.1 Sync the deltas into the main specs. Create `openspec/specs/constraint-validation/spec.md`
      from its delta. Replace [ERR-002] and [ERR-004] with their modified blocks. Add [PRS-015]
      after [PRS-014], [ELV-005] after [ELV-004], and [BMB-005] after [BMB-004]. In the same
      commit, add the prefix `CNS` for `constraint-validation` with `next` 21 to
      `openspec/spec-ids.yaml`, set `PRS` `next` to 16, `ELV` `next` to 6 and `BMB` `next` to 6,
      and run `npm run requirements:write`. Verify `npm run spec-ids` and
      `npm run requirements:check` pass, and `openspec show constraint-validation --type spec`
      lists CNS-001 to CNS-020.

## 2. Vendor the metaschema and list the defective constraints

- [ ] 2.1 Add `metaschema/1.2.3/` with the files of `src/metaschema/` at the tag `v1.2.3` of
      `usnistgov/OSCAL` and `metaschema-datatypes.xsd` of `usnistgov/metaschema`, as [CNS-001]
      states. Choose the commit of the XSD as the open question of
      [design.md](design.md#open-questions) states. Add `SOURCE.md`, `SHA256SUMS` and a
      `README.md` like the ones in `schemas/1.2.3/`. Add a `metaschema:verify` script to
      `package.json` and to `npm run check`, and add `"metaschema"` to `CONTENTS` in
      `scripts/build-archive.ts`. Verify `npm run metaschema:verify` passes and fails after a
      one-byte change to a module, and the archive of `npm run archive` holds `metaschema/1.2.3/`.
- [ ] 2.2 Write one issue for the `allowed-values` constraints on the mapping fields
      `relationship` and `category`
      ([design.md D3](design.md#d3-the-metaschema-text-is-the-authority-and-defective-constraints-stay-out)).
      Show the title and the body to the user, and file the issue in `usnistgov/OSCAL` only after
      the user approves it. Verify the issue URL resolves.
- [ ] 2.3 Write `manifest/1.2.3/constraint-exclusions.json` with the 7 items of design D3, each
      with its issue URL, and its JSON Schema `manifest/constraint-exclusions.schema.json`. Add a
      check, with a self-test case for each failure, that each item identifies exactly one
      constraint of `metaschema/1.2.3/` ([CNS-003]). Verify the check passes, and fails for an
      item with an unknown `id` and for an item that matches two constraints.

## 3. Generate and check the constraint manifest

- [ ] 3.1 Add the store tooling dependencies for XML and for RFC 9535 to `package.json` with
      exact versions, and record the reason in the PR description. Verify `npm ci` and
      `npm run typecheck` pass.
- [ ] 3.2 Add the reference evaluator to `scripts/`: a loader of the vendored modules with their
      entities, and an evaluator of the Metapath subset that the 1.2.3 constraints use, with
      `has-oscal-namespace()` as design D4 states
      ([design.md D4](design.md#d4-the-semantics-of-has-oscal-namespace-come-from-liboscal-java)).
      Add a `--self-test` mode with a case for each constraint kind, for each rule of design D7,
      and for each rule of design D4. Verify the self-test passes, and that the loader finds 340
      constraints and none inside an XML comment.
- [ ] 3.3 Add the generator and `manifest/constraints.schema.json` ([CNS-004] to [CNS-016]),
      with `constraints:write`, `constraints:check` and `constraints:self-test` scripts in
      `npm run check`. The generator follows design D2, D5, D7, D8, D9 and D11. It fails on a key
      field of an `is-unique` or `index` entry that can select several values. Verify
      `npm run constraints:write` gives 321 entries, of which 239 are reportable. Verify
      `npm run constraints:check` passes, fails after an edit by hand, and fails for a manifest
      that does not conform to its JSON Schema. Verify that each regular expression of the
      manifest is an I-Regexp, and that the `integer` pattern rejects `high`.
- [ ] 3.4 Add the query check of [CNS-019] to `constraints:check`. It compares the nodes that the
      queries of each entry select with the nodes of the reference evaluator, on each corpus
      document and on a generated document of each model that unrolls each recursive definition
      to a depth of 6, for document and element context queries. Add a self-test case with a
      query that selects a node of another definition. Verify the check passes on the generated
      manifest and the self-test case fails it.

## 4. Add the corpus cases

- [ ] 4.1 Change the OSCAL-namespace property names of `documents/valid/number-scalars.yaml` and
      `documents/valid/string-scalars.yaml`, and the value of `build-hash/algorithm-string`, as
      design D10 states. Run `npm run corpus:write`. Verify the YAML round-trip cases still pass
      `npm run corpus:check`.
- [ ] 4.2 Extend `scripts/check-corpus.ts` for [CNS-020]. Add the case field
      `expected-constraints`, a list in which an `id` can occur more than once. Check that each
      input with that field conforms to the JSON Schema, and that the reference evaluator gives
      exactly the failures that the field lists. Check that each reportable entry has a case
      whose input fails it. Check that no input that a case expects to be valid, and no element
      that a builder case expects, fails an entry. Add self-test cases for a missing case, a
      wrong identifier, a missing repeat of an identifier, and a valid input that fails.
      Describe the field and its check in `corpus/1.2.3/README.md`. Verify
      `npm run corpus:check` passes for the existing cases except the coverage check, which fails
      with one message for each reportable entry until the next task adds the cases.
- [ ] 4.3 Add a `parse` case for each of the 239 reportable entries. Each input is a valid corpus
      document with one change, has `expected-category` `parse`, and cites [PRS-015.01] and the
      scenario of the rule of its kind. Add the `parse` case for [PRS-015.02] of design D10.
      Verify `npm run corpus:check` passes.
- [ ] 4.4 Add `validate-element` cases for [ELV-005.01], [ELV-005.02] and [CNS-009.01], and
      builder cases for [BMB-005.01] and [BMB-005.02]. Verify `npm run corpus:check` passes.

## 5. Document the new files and the release

- [ ] 5.1 Add rows for `metaschema/<release>/`, `manifest/<release>/constraints.json` and
      `manifest/<release>/constraint-exclusions.json` to the table in `AGENTS.md` (never edited,
      generated, and edited by hand). Describe the metaschema and the constraint manifest in the
      store contents of `README.md` and in `manifest/1.2.3/README.md`. Verify
      `npm run binding-links:check` passes and each new link resolves.
- [ ] 5.2 Set `VERSION` to `0.9.0+oscal.1.2.3`, a breaking increment of the 0.y.z range
      ([design.md Migration Plan](design.md#migration-plan)). Verify `npm run version:check`
      passes.

## 6. Verify the integrated change

- [ ] 6.1 Run `npm run check` and `npm run archive`. Verify both pass, and the archive holds
      `metaschema/1.2.3/`, `manifest/constraints.schema.json`, `manifest/1.2.3/constraints.json`
      and `manifest/1.2.3/constraint-exclusions.json`.

## Workflow follow-up

1. Archive this change in the pull request after the required review. Verify `npm run check`
   passes and `openspec list` has no active change.
2. After the merge, tag the release and publish it. The release notes list the changed
   requirements and the 7 excluded constraints with their issues, and the upgrade notes say what
   a binding implements when it moves its pin.
3. Each binding gets its pin-move issue from `.github/workflows/pin-move-check.yml`, or by hand
   for a binding that does not call it.

[ERR-002]: specs/error-model/spec.md#requirement-err-002-a-non-raising-validity-check-is-available
[ERR-004]: specs/error-model/spec.md#requirement-err-004-inputs-that-are-not-a-valid-document-are-a-parse-error
[PRS-014]: ../../specs/document-parsing/spec.md#requirement-prs-014-a-distinguishing-property-selects-the-nested-union-branch-of-parse-failures
[PRS-015]: specs/document-parsing/spec.md#requirement-prs-015-a-constraint-failure-is-a-parse-failure-that-names-its-constraint
[PRS-015.01]: specs/document-parsing/spec.md#scenario-prs-01501-a-document-that-fails-one-constraint
[PRS-015.02]: specs/document-parsing/spec.md#scenario-prs-01502-a-document-that-fails-the-schema
[ELV-004]: ../../specs/element-validation/spec.md#requirement-elv-004-a-binding-can-limit-the-resources-that-element-validation-uses
[ELV-005]: specs/element-validation/spec.md#requirement-elv-005-element-validation-applies-the-constraints-that-the-element-can-decide
[ELV-005.01]: specs/element-validation/spec.md#scenario-elv-00501-a-hash-with-the-wrong-length
[ELV-005.02]: specs/element-validation/spec.md#scenario-elv-00502-a-reference-that-the-element-cannot-decide
[BMB-004]: ../../specs/backmatter-builders/spec.md#requirement-bmb-004-a-key-gives-the-resource-identifier
[BMB-005]: specs/backmatter-builders/spec.md#requirement-bmb-005-a-builder-input-is-invalid-when-its-element-fails-the-constraint-manifest
[BMB-005.01]: specs/backmatter-builders/spec.md#scenario-bmb-00501-a-hash-value-with-the-wrong-length
[BMB-005.02]: specs/backmatter-builders/spec.md#scenario-bmb-00502-a-resource-with-two-links-to-the-same-reference
[CNS-001]: specs/constraint-validation/spec.md#requirement-cns-001-the-store-vendors-the-metaschema-of-each-vendored-oscal-release
[CNS-003]: specs/constraint-validation/spec.md#requirement-cns-003-the-exclusion-list-names-each-defective-constraint-with-its-issue
[CNS-004]: specs/constraint-validation/spec.md#requirement-cns-004-the-store-publishes-a-constraint-manifest-for-each-release
[CNS-009.01]: specs/constraint-validation/spec.md#scenario-cns-00901-a-property-name-that-a-parent-entry-allows
[CNS-016]: specs/constraint-validation/spec.md#requirement-cns-016-an-expect-entry-fails-for-a-target-node-that-its-test-does-not-select
[CNS-019]: specs/constraint-validation/spec.md#requirement-cns-019-the-store-checks-the-queries-against-a-reference-evaluator
[CNS-020]: specs/constraint-validation/spec.md#requirement-cns-020-the-corpus-has-a-failing-case-for-each-reportable-entry
