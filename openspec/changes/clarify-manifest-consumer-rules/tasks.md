# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs`. A change in a binding repository is out
of scope (proposal.md, Impact item 5). The change edits a spec, the ledger, the requirement index, the store validator
and its self-test, `VERSION`, and `CONTRIBUTING.md`. It does not change `names.json`, `overrides.json`, the JSON
Schemas, or the corpus.

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (sync) ---> 3 (validator) ---> 4 (version, contributing)
```

Group 2 syncs the delta, so that the scenario identifiers that the self-tests of group 3 cite are in the main specs.
Group 4 sets `VERSION` last, so that each earlier commit passes `npm run check` with the released version. The groups
run in order.

## 1. Branch and planning commit

- [ ] 1.1 Create the feature branch from [#11] with `gh issue develop 11 --base main`, with the user's approval, and
      check it out. Commit the planning artifacts of this change as the first commit, with `#11` in the message.
      Verify `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate clarify-manifest-consumer-rules --strict` passes.

## 2. Sync

- [ ] 2.1 Sync the delta of this change into `openspec/specs/naming-manifest/spec.md`, without archiving the change.
      Place [NAM-020] after [NAM-010], and [NAM-021] and [NAM-022] after [NAM-012]. Verify
      `openspec show naming-manifest --type spec` lists [NAM-020.01], [NAM-021.01], [NAM-022.01], and [NAM-022.02], and
      `npm run validate` passes. `npm run validate` checks the main specs, including the 500-character limit of each
      requirement text.
- [ ] 2.2 In the same commit as task 2.1, set `NAM` `next` to 23 in `openspec/spec-ids.yaml`, and run
      `npm run requirements:write`. Do not change `VERSION` in this group. Verify `npm run spec-ids` passes, and
      `openspec/requirements.json` has entries for [NAM-020], [NAM-021], and [NAM-022].
- [ ] 2.3 Commit group 2 with `#11` in the message. Verify `npm run check` passes before the commit.

## 3. Store validator

- [ ] 3.1 In `validateManifest` of `scripts/names-lib.ts`, add the three steps of design.md, D4 before the JSON Schema
      check. Keep the supported formats in one constant. The self-test `NAM-012.01 an unknown format fails` fails after
      this task, and task 3.2 replaces it. Verify `npm run typecheck` passes.
- [ ] 3.2 In the self-test of `scripts/names.ts`, replace `NAM-012.01 an unknown format fails` with three tests. Each
      test calls `validateManifest` and checks the full list of failures, not only the `[json-schema]` failures:
      1. [NAM-021.01]: an input that is not a JSON object, and an object with no `format` member, each give exactly one
         `[manifest]` failure.
      2. [NAM-022.01]: `format` 2 gives exactly one `[manifest]` failure, and its text names `2`.
      3. [NAM-022.02]: `format` 2 and an unknown member give exactly one failure, and no failure starts with
         `[json-schema]`.

      Change the label `NAM-003 other OSCAL release is rejected` to
      `NAM-012.02 manifest of another OSCAL release is rejected`. Verify `npm run names:self-test` passes. Revert task
      3.1 in the working copy and verify the three new tests fail. Then restore the working copy.
- [ ] 3.3 Commit tasks 3.1 and 3.2 together, with `#11` in the message. Verify `npm run check` passes before the
      commit, and `npm run names:check` reports no change to `names.json`.

## 4. Version and CONTRIBUTING

- [ ] 4.1 Set `VERSION` to `0.8.0+oscal.1.2.3` (design.md, D5). Do not tag a release. Verify `npm run version:check`
      and `npm run releases:check` pass.
- [ ] 4.2 In `CONTRIBUTING.md`, section "Change a requirement", change step 1 of the pull request list. A change syncs
      the delta specs. A change that needs a version increment sets `VERSION` to the version of the next release, also
      when no release follows at once. Keep step 3 about the release tag. Verify the new step no longer ties `VERSION`
      to a release.
- [ ] 4.3 Commit group 4 with `#11` in the message. Verify `npm run check` passes before the commit, and
      `git status --short` shows only the files of this group and the artifacts of this change.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The pull request of this change also
archives it.

- Archive this change in the pull request. If a requirement or scenario changed after task 2.1, update the ledger and
  the index in the archive commit. Verify `npm run check` passes and `openspec list` shows no active change.
- Open the pull request with `Closes #11`, with the user's approval. State in the description that [NAM-022] is a
  break for current consumers. Also state that the change sets `VERSION` to `0.8.0+oscal.1.2.3` under the `0.y.z`
  rule (design.md, D5), and that it tags no release.
- The release that carries this change is out of scope. Its tag is `v0.8.0+oscal.1.2.3` or a higher version.
- After the release, draft one issue in `cairn-proofs/oscal-bindings-python` and one in
  `cairn-proofs/oscal-bindings-typescript`. Each issue states that the manifest consumer must check `format` before
  the JSON Schema check ([NAM-022]) when the binding moves its pin. Name `scripts/manifest.py` ([python#22]) in the
  Python issue. Post each issue only after the user approves it.

[#11]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/11
[python#22]: https://github.com/cairn-proofs/oscal-bindings-python/pull/22
