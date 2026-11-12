# Tasks
Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs`. A change in a binding repository is out
of scope (proposal.md, Impact item 5). The change edits a spec, the corpus, the corpus README, and the corpus checker.
It does not change `VERSION` (design.md, D4), the ledger, the requirement index, the manifest, or the JSON Schemas.
## Task Dependency Graph
```
 1 (branch, plan) ---> 2 (sync) ---> 3 (corpus operation and case)
```
Group 2 syncs the delta, so that the scenario that the new case cites has its new text in the main specs. The groups
run in order.
## 1. Branch and planning commit
- [x] 1.1 Run `git fetch origin`. Create the feature branch from [#40] with `gh issue develop 40 --base main`, with the
      user's approval, and check it out. The branch must start at `origin/main`. Commit the planning artifacts of this
      change as the first commit, with `#40` in the message. Verify `git merge-base --is-ancestor origin/main HEAD`
      succeeds, `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate state-element-type-kinds --strict` passes.
## 2. Sync
- [x] 2.1 Sync the delta of this change into `openspec/specs/element-validation/spec.md`, without archiving the
      change. Verify `openspec show element-validation --type spec` gives the new text of [ELV-002] and [ELV-002.01],
      [ELV-002.02] is unchanged, and `npm run validate` passes. `npm run validate` checks the 500-character limit of
      each requirement text.
- [x] 2.2 Commit group 2 with `#40` in the message. Verify `npm run spec-ids` and `npm run requirements:check` pass
      with no change to `openspec/spec-ids.yaml` or `openspec/requirements.json`, and `npm run check` passes before
      the commit.
## 3. Corpus operation and case
- [x] 3.1 In `scripts/check-corpus.ts`, add the operation `element-types` as design.md, D3 states. Make `input`
      optional in the `Case` type, and skip the input checks for an `element-types` case. Derive the list from
      `manifest/1.2.3/names.json`. With `--write`, write the canonical form of the list to the `expected` file of the
      case. Fail in each of these cases:
      1. Two manifest types give the same name.
      2. An `element-types` case has an `input`, or it has no `expected`.
      3. The expected file differs from the canonical form of the list.
      4. A `validate-element` case breaks design.md, D3, item 5.
      Add the check to the numbered list of the header comment. Verify `npm run typecheck` passes.
- [x] 3.2 Add the case `element-types/all` to `corpus/1.2.3/cases.json`, after the `validate-element` cases. It has
      `operation` `element-types`, `expected` `expected/element-types.json`, and `requirements` `["ELV-002.01"]`.
      Run `npm run corpus:write`. Verify `expected/element-types.json` holds 244 names, holds `parameter`,
      `hash-algorithm`, `oscal-document`, and `back-matter-resource-base64`, does not hold `root-model`, and is in
      code-point order. Verify the list equals the `elementType` values of
      `../oscal-bindings-typescript/src/generated/element-types.ts`, in the same order.
- [x] 3.3 Verify that the check fails in each of these cases, and restore the working copy after each one:
      1. One name is removed from `expected/element-types.json`.
      2. Two names of `expected/element-types.json` change places.
      3. The case has an `input`.
      4. In `manifest/1.2.3/names.json`, the `name` of one type is changed so that it gives the name of another type.
      5. A `validate-element` case with `expected-valid` names `with-id`.
      6. The `unknown-element-type` case names `hash-algorithm`.
      Verify `npm run corpus:check` passes after the last restore.
- [x] 3.4 In `corpus/1.2.3/README.md`, change these sections. Verify each new text names `element-types`:
      1. Layout, item 1: an `element-types` case has no input.
      2. Layout, item 5: `expected/` also holds the list of element-type names of the `element-types` case.
      3. Cases, item 3: an `element-types` case has no `input`.
      4. Cases, item 5.1: `expected` is also the path of the expected list, for `element-types`.
      5. Operations: add item 9, `element-types`. Request the supported element types. The result must equal the list
         in `expected`, item by item and in the same order.
- [x] 3.5 Commit group 3 with `#40` in the message. Verify `npm run check` passes before the commit, and
      `git status --short` shows only the files of this group and the artifacts of this change.
## Workflow follow-up
These steps need the merge or the archive, so they are not tracked tasks. The pull request of this change also
archives it.
- Archive this change in the pull request. Verify `npm run check` passes and `openspec list` shows no active change.
- Open the pull request with `Closes #40`, with the user's approval. State in the description that [ELV-002] is a
  break for a binding that leaves out a kind. Also state that the corpus has the new operation `element-types`, and
  that `VERSION` stays `0.8.0+oscal.1.2.3` (design.md, D4).
- The release that carries this change is out of scope.
- After the release, draft one issue in `cairn-proofs/oscal-bindings-python` and one in
  `cairn-proofs/oscal-bindings-typescript`. Each issue states that the corpus runner must run the `element-types`
  operation when the binding moves its pin. The Python issue also states that the list must add the 44 enums and the
  13 unions and remove `root-model` (`src/oscal_bindings/v1/extensions/validate_element.py`). The element validation
  operation must accept a value for each listed name, also the string value of an enum ([ELV-001]). Post each issue only
  after the user approves it.
[#40]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/40
