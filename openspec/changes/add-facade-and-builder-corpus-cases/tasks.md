# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs`. A change in a binding
repository is out of scope (design.md, Non-Goals 3). The change edits three specs, the ledger, the
corpus checker, and the corpus index and README. It does not change `VERSION` (design.md, D9), the
requirement index, the manifest, the JSON Schemas, or the `categories` list.

## Task Dependency Graph

```
 1 (branch, plan, sync) ---> 2 (facade) ---> 3 (builders)
```

Group 1 holds the planning artifacts and the manual sync in one commit, because the change does not
validate until the main specs match its deltas (design.md, D1). Group 2 and group 3 cite the synced
scenarios. Group 3 comes after group 2, because both edit the `input` and the `input-form` checks of
`scripts/check-corpus.ts`.

## 1. Branch, planning artifacts, and manual sync

- [x] 1.1 Create the feature branch from [#44] with `gh issue develop 44 --base main`, with the
      user's approval, and check it out. Verify `git branch --show-current` is not `main`, and
      `openspec list` shows only this change.
- [x] 1.2 Edit `openspec/specs/` by hand to match the three deltas of this change. Replace each
      requirement block with its MODIFIED block, and keep each other line. Do not run `openspec
      archive` for the sync (design.md, D1). Verify these:
      1. `openspec validate add-facade-and-builder-corpus-cases --strict` passes.
      2. `openspec show document-facade --type spec` lists [FAC-001.01] and no [FAC-001.02].
      3. `openspec show backmatter-builders --type spec` lists [BMB-001.01] to [BMB-001.04], and the
         heading of [BMB-001.03] keeps its words.
      4. The descriptions of [FAC-001], [BMB-001], and [ERR-013] each have 500 characters or fewer,
         with whitespace normalized.
- [x] 1.3 In `openspec/spec-ids.yaml`, add a `retired` entry for [FAC-001.02] with no
      `replaced_by`. The reason states that the type of the facade argument is a matter of the
      language of each binding, so the contract has no rule for it. Do not change a `next` number.
      Verify `npm run spec-ids` passes.
- [x] 1.4 Verify `git grep -n 'FAC-001\.02'` finds the identifier only in `openspec/spec-ids.yaml` and
      `openspec/changes/`. Copy the repository to a scratch directory, run `openspec archive
      add-facade-and-builder-corpus-cases --yes` there, and verify it prints "Specs already in sync;
      no files changed". Remove the scratch directory.
- [x] 1.5 Verify `npm run check` passes. Commit the planning artifacts and tasks 1.2 and 1.3 as one
      commit, with `#44` and `#45` in the message.

## 2. The facade operation

- [ ] 2.1 In `scripts/check-corpus.ts`, add `facade` to `OPERATIONS`. Apply the facade checks of
      design.md, D7. Do not add a `facade` case with `expected-category` to the `used` set, and do not
      require its input to exist, as for `parse-file`. Fail `input-form` `path` on a case of another
      operation. Add the checks to the header comment of the script. Verify `npm run typecheck` and
      `npm run corpus:check` pass with the unchanged `cases.json`.
- [ ] 2.2 In `corpus/1.2.3/README.md`, add `facade` to Operations, with the three constructions and
      the five checks of design.md, D3, and the not-found result. Add the value `path` to
      `input-form`. Verify the README states each check of design.md, D3.
- [ ] 2.3 Add the nine facade cases of design.md, D8, to `corpus/1.2.3/cases.json`, after the
      `assessment-period` cases, with the `requirements` identifiers of D8. Verify `npm run
      corpus:check` passes.
- [ ] 2.4 Verify that each facade check fails a case that breaks it. On the working copy, apply these
      mutations one at a time, and restore after each:
      1. Set `expected` of `facade/catalog` to `expected/profile.json`.
      2. Set `document-type` of `facade/catalog` to `profile`.
      3. Set `expected` of `facade/catalog` to `expected/minimal-catalog.json`.
      4. Set `input` of `facade/missing-file` to `documents/valid/catalog.json`.
      5. Remove `input-form` from `facade/missing-file`.
      6. Set `expected-category` of `facade/missing-file` to `read-error`.
      7. Add `expected` to `facade/missing-file`.
      8. Set `input-form` of `parse-file/missing-file` to `path`.
      9. Set `input-form` of `facade/profile` to `text`.
      Verify `npm run corpus:check` reports a failure for each mutation, and passes after each
      restore. Verify `npm run check` passes, and commit group 2 with `#44` in the message.

## 3. The builder operations

- [ ] 3.1 In `scripts/check-corpus.ts`, add `build-hash` and `build-rlink` to `OPERATIONS`. Widen
      `arguments` in `Case` to the arguments of design.md, D4, with `key` optional, and add
      `"expected-element"?: unknown`. Get the rlink and resource validators from the item schemas of
      design.md, Context item 4. Apply the builder checks of design.md, D7. Keep each existing check of
      a `build-resource` case with `expected-uuid`. Fail an `arguments` or `expected-element` field on
      a case that is not a builder case, and an `expected-uuid` field on a case that is not a
      `build-resource` case. Update the header comment of the script. Verify `npm run typecheck` and
      `npm run corpus:check` pass with the unchanged `cases.json`.
- [ ] 3.2 In `corpus/1.2.3/README.md`, add `build-hash` and `build-rlink` to Operations, and change
      `build-resource`, as design.md, D4 to D6 state. Add the arguments of each builder to the case
      fields, and `expected-element` to the expected results. State that a builder case has no
      `input`, in the Layout list and in the case fields. State the rule of design.md, D6 for a nested
      argument. Verify the README names each field that `Case` holds.
- [ ] 3.3 Add the nine builder cases of design.md, D8, to `corpus/1.2.3/cases.json`, next to the
      `build-resource` cases, with the `requirements` identifiers of D8. Verify `npm run
      corpus:check` passes, and still reports seven error categories.
- [ ] 3.4 Verify that each builder check fails a case that breaks it. On the working copy, apply these
      mutations one at a time, and restore after each:
      1. Set `algorithm` of `expected-element` of `build-hash/default-algorithm` to `SHA-512`.
      2. Set `arguments.algorithm` of `build-hash/invalid-algorithm` to `SHA-999`.
      3. Add `"media-type": "application/pdf"` to `expected-element` of
         `build-rlink/reference-only`.
      4. Remove `hashes` from `arguments` of `build-rlink/media-type-and-hashes`.
      5. Add `"uuid": "0c6b8f1e-4a2d-4b7e-9c3f-5d6e7f8a9b0c"` to `expected-element` of
         `build-resource/generated-identifier`.
      6. Add a `key` to `arguments` of `build-resource/omitted-inputs`.
      7. Set `document-ids` of `build-resource/invalid-document-id` to
         `[{ "identifier": "ISBN 0-123" }]`.
      8. Add a `key` to `arguments` of `build-resource/invalid-document-id`.
      9. Add `expected-element` to `facade/catalog`.
      10. Add `expected-uuid` to `build-hash/default-algorithm`.
      Verify `npm run corpus:check` reports a failure for each mutation, and passes after each
      restore.
- [ ] 3.5 Verify `npm run check` passes, and commit group 3 with `#45` in the message. Verify
      `git status --short` shows no file under `corpus/`, `scripts/`, `openspec/specs/`, or
      `openspec/changes/`.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The change is archived in
the same pull request.

- Archive this change in the pull request with `openspec archive add-facade-and-builder-corpus-cases`.
  Verify it reports "Specs already in sync" and changes no spec. Verify `npm run check` passes and
  `openspec list` shows no active change.
- Open the pull request with `Closes #44` and `Closes #45`, with the user's approval. State where the
  change differs from the issues:
  1. [FAC-001.02] is retired, instead of either option of [#44] item 3 (design.md, D1).
  2. The builder arguments are inline, instead of input files (design.md, D4).
  3. Builder results are compared with an inline `expected-element`, instead of an expected file
     (design.md, D4).
- The release that carries this change is out of scope. `VERSION` stays `0.8.0+oscal.1.2.3`
  (design.md, D9).
- After the release, draft an issue in each repository of Known implementations in `README.md` to
  move the pin. The issue lists the binding changes of proposal.md, Impact item 5. Post each issue
  only after the user approves it.

[#44]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/44
[#45]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/45
