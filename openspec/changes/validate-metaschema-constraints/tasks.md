# Tasks

## 1. Sync the requirements

- [ ] 1.1 Sync the deltas into the main specs. Create `openspec/specs/constraint-validation/spec.md`
      from its delta. Replace [PRS-006], [ERR-002], [ERR-003] and [ERR-004] with their modified
      blocks. Add [PRS-015]
      after [PRS-014], [ELV-005] after [ELV-004], and [BMB-005] after [BMB-004]. In the same
      commit, add the prefix `CNS` for `constraint-validation` with `next` 23 to
      `openspec/spec-ids.yaml`, set `PRS` `next` to 16, `ELV` `next` to 6 and `BMB` `next` to 6,
      and run `npm run requirements:write`. Verify `npm run spec-ids` and
      `npm run requirements:check` pass, and `openspec show constraint-validation --type spec`
      lists CNS-001 to CNS-022.

## 2. Vendor the metaschema and list the defective constraints

- [ ] 2.1 Add `metaschema/1.2.3/` with the modules of `src/metaschema/` at the tag `v1.2.3` of
      `usnistgov/OSCAL`, the files of `src/metaschema/shared-constraints/` that the modules include,
      and `metaschema-datatypes.xsd` of `usnistgov/metaschema`, as [CNS-001] states. Choose the commit of the XSD as the open question of
      [design.md](design.md#open-questions) states. Add `SOURCE.md`, `SHA256SUMS` and a
      `README.md` like the ones in `schemas/1.2.3/`. Add a `metaschema:verify` script to
      `package.json` and to `npm run check`, and add `"metaschema"` to `CONTENTS` in
      `scripts/build-archive.ts`. Add `/metaschema/` to `.github/CODEOWNERS`. Extend the released
      schema check of `scripts/check-releases.ts` to `metaschema/<release>/`, with a self-test case.
      Verify `npm run metaschema:verify` passes and fails after a one-byte change to a module, and
      the archive of `npm run archive` holds `metaschema/1.2.3/`.
- [ ] 2.2 Write one issue for the `allowed-values` constraints on the mapping fields
      `relationship` and `category`
      ([design.md D3](design.md#d3-the-metaschema-text-is-the-authority-and-defective-constraints-stay-out)).
      Show the title and the body to the user, and file the issue in `usnistgov/OSCAL` only after
      the user approves it. Verify the issue URL resolves.
- [ ] 2.3 Write `manifest/1.2.3/constraint-exclusions.json` and its JSON Schema
      `manifest/constraint-exclusions.schema.json`. The list `excluded` holds the 7 items of design
      D3, each with its issue URL. The list `cannot-fail` holds `oscal-profile-req-merge-combine`
      with its reason ([CNS-021]). Add a check, with a self-test case for each failure, that each
      item of both lists identifies exactly one constraint of `metaschema/1.2.3/` ([CNS-003]), and
      add the check to `npm run check`. Verify the check passes, and fails for an item with an
      unknown `id` and for an item that matches two constraints.

## 3. Generate and check the constraint manifest

- [ ] 3.1 Add the store tooling dependencies for XML and for RFC 9535 to `package.json` with
      exact versions, and record the reason in the PR description. Verify `npm ci` and
      `npm run typecheck` pass.
- [ ] 3.2 Add the reference evaluator to `scripts/`: a loader of the vendored modules with their
      entities, and an evaluator of the Metapath subset that the 1.2.3 constraints use, with
      `has-oscal-namespace()` as design D4 states
      ([design.md D4](design.md#d4-the-semantics-of-has-oscal-namespace-come-from-liboscal-java)).
      Add a `--self-test` mode with a case for each constraint kind, for each rule of design D7,
      and for each rule of design D4. Record the liboscal-java commit of design D4 in
      `metaschema/1.2.3/SOURCE.md`. Verify the self-test passes, and that the loader finds 340
      constraints and none inside an XML comment.
- [ ] 3.3 Add the generator and `manifest/constraints.schema.json` ([CNS-004] to [CNS-016]),
      with `constraints:write`, `constraints:check` and `constraints:self-test` scripts in
      `npm run check`. The generator follows design D2, D5, D7, D8, D9 and D11. It fails on a key
      field of an `is-unique` or `index` entry that can select several values, on a reportable
      entry without an `id`, on a key-field pattern that is not a literal prefix and `(.*)`, and on
      a `matches` pattern that it cannot write as an I-Regexp. Verify
      `npm run constraints:write` gives 321 entries, of which 239 are reportable, and that each
      entry states whether it is reportable by the rules of [CNS-021]. Verify
      `npm run constraints:check` passes, fails after an edit by hand, and fails for a manifest
      that does not conform to its JSON Schema. Verify that each regular expression of the
      manifest is an I-Regexp, and that the `integer` pattern rejects `high`.
- [ ] 3.4 Add the checks of [CNS-019] and [CNS-022] to
      `constraints:check`. The query check compares the nodes
      that the queries of each entry select with the nodes of the reference evaluator. The failure
      check evaluates the manifest with the RFC 9535 dependency, as [CNS-008] to [CNS-018] state, and
      compares the number of failures of each entry with the reference evaluator. Both checks run
      on each corpus document and on a generated document of each model that unrolls each
      recursive definition to a depth of 6, for document and element context queries. Add a self-test case with a
      query that selects a node of another definition, and one with a `matches` pattern that
      rejects a valid value. Verify both checks pass on the generated manifest and each self-test
      case fails them.

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
- [ ] 5.2 Set `VERSION` to `0.9.0+oscal.1.2.3`, a breaking increment under the `0.y.z` rule
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
[PRS-006]: specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[ERR-003]: specs/error-model/spec.md#requirement-err-003-parse-errors-expose-structured-validation-detail
[CNS-008]: specs/constraint-validation/spec.md#requirement-cns-008-an-allowed-values-entry-checks-the-value-against-its-applicable-set
[CNS-018]: specs/constraint-validation/spec.md#requirement-cns-018-an-element-meets-the-manifest-when-no-entry-that-it-can-decide-fails
[CNS-022]: specs/constraint-validation/spec.md#requirement-cns-022-the-store-checks-the-failures-of-the-manifest-against-the-reference-evaluator
[CNS-021]: specs/constraint-validation/spec.md#requirement-cns-021-an-entry-is-reportable-unless-it-cannot-fail
