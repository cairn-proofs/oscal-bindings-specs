# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` ([#41]). A change in a
binding repository is out of scope (design.md, Non-Goals 1). The change edits one spec, the ledger,
the requirement index, the corpus index and README, and the corpus checker. It does not change
`VERSION` (design.md, D5), the manifest, or the JSON Schemas.

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (sync) ---> 3 (corpus)
```

Group 2 syncs the delta, so that the main specs hold [ERR-012] before the corpus case cites it. The
groups run in order.

## 1. Branch and planning commit

- [x] 1.1 Run `git fetch origin`. Create the feature branch from [#41] with
      `gh issue develop 41 --base main`, with the user's approval, and check it out. The branch must
      start at `origin/main`. Commit the planning artifacts of this change as the first commit, with
      `#41` in the message. Verify `git merge-base --is-ancestor origin/main HEAD` succeeds,
      `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate define-file-read-error --strict` passes.

## 2. Sync

- [x] 2.1 Sync the delta of this change into `openspec/specs/error-model/spec.md` without archiving
      the change. [ERR-001] takes its new text, and [ERR-012] follows [ERR-011]. Verify
      `openspec show error-model --type spec` lists seven categories in [ERR-001] and lists
      [ERR-012] with three scenarios.
- [x] 2.2 In the same commit as task 2.1, set `ERR` `next` to 13 in `openspec/spec-ids.yaml`. Run
      `npm run requirements:write`. Do not change `VERSION` (design.md, D5). Verify
      `npm run spec-ids` passes, and `openspec/requirements.json` has an entry for [ERR-012].
- [x] 2.3 Commit tasks 2.1 and 2.2 with `#41` in the message. Verify `npm run check` passes before
      the commit.

## 3. Corpus

- [ ] 3.1 In `scripts/check-corpus.ts`, make check 6 for a `parse-file` case depend on its category,
      as design.md D4 states. A `not-found` case fails when its input path exists. A `read-error`
      case fails when its input path is not a directory. Any other category fails. Update the
      header comment of check 6 if its text no longer fits. Verify `npm run corpus:check` fails
      when the `parse-file/missing-file` case has the input `documents/valid`, and revert the
      mutation.
- [ ] 3.2 In `corpus/1.2.3/cases.json`, add `read-error` to the end of `categories`. Add the case
      `parse-file/directory` after `parse-file/missing-file`, with the operation `parse-file`, the
      input `documents/valid`, the category `read-error`, and the requirements `ERR-012.01`
      (design.md, D4). Verify `npm run corpus:check` passes. Verify it fails when the new case has
      the input `documents/does-not-exist`, and revert the mutation.
- [ ] 3.3 In `corpus/1.2.3/README.md`, Operations, item 4, replace "The path does not exist." State
      that the path does not exist for the not-found category, and that the path is a directory for
      the read-error category. Keep the rule that the parser reports `expected-category` and names
      the path. Verify the text matches check 6 of task 3.1.
- [ ] 3.4 Commit group 3 with `#41` in the message. Verify `npm run check` passes before the commit,
      and `git status --short` shows no other change of this group.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The pull request of this
change also archives it.

- Archive this change in the pull request. If a requirement or scenario changed after task 2.1,
  update the ledger and the index in the archive commit. Verify `npm run check` passes and
  `openspec list` shows no active change.
- Open the pull request with `Closes #41`, with the user's approval. State in the description that
  `VERSION` stays `0.8.0+oscal.1.2.3` (design.md, D5).
- The release that carries this change is out of scope.
- After the release, draft one issue in `cairn-proofs/oscal-bindings-python` and one in
  `cairn-proofs/oscal-bindings-typescript`. Each issue states that a file-path parse that cannot read
  the file must report the read-error category and name the path ([ERR-012]).
  It also states that the corpus case `parse-file/directory` tests the rule. The TypeScript issue
  refers to
  [typescript#8]. Post each issue only after the user approves it.

[#41]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/41
[typescript#8]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/8
