# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` ([#42] and [#28]). A
change in a binding repository is out of scope (design.md, Non-Goals 4). The change edits two specs,
the ledger, the requirement index, and the corpus README. It does not change `VERSION` (design.md,
D7), `corpus/1.2.3/cases.json`, the scripts, the manifest, or the JSON Schemas.

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (sync) ---> 3 (corpus README)
```

Group 2 syncs the deltas, so that the main specs hold the limit-exceeded category before the corpus
README refers to it. The groups run in order.

## 1. Branch and planning commit

- [x] 1.1 Run `git fetch origin`. Create the feature branch from [#42] with
      `gh issue develop 42 --base main`, with the user's approval, and check it out. The branch must
      start at `origin/main`. Commit the planning artifacts of this change as the first commit, with
      `#42` and `#28` in the message. Verify `git merge-base --is-ancestor origin/main HEAD`
      succeeds, `git branch --show-current` is not `main`, `openspec list` shows only this change,
      and `openspec validate extend-error-taxonomy-for-limits --strict` passes.

## 2. Sync

- [x] 2.1 Sync the deltas of this change into `openspec/specs/` without archiving the change. In
      `error-model`, [ERR-001] takes its new text, and [ERR-009], [ERR-010], and [ERR-011] follow
      [ERR-008]. In `element-validation`, [ELV-001] takes its new text, and [ELV-004] follows
      [ELV-003]. Verify `openspec show error-model --type spec` lists six categories in [ERR-001]
      and lists [ERR-009], [ERR-010], and [ERR-011]. Verify
      `openspec show element-validation --type spec` lists [ELV-004], and [ELV-001.02] has its new
      text.
- [x] 2.2 In the same commit as task 2.1, set `ERR` `next` to 12 and `ELV` `next` to 5 in
      `openspec/spec-ids.yaml`. Run `npm run requirements:write`. Do not change `VERSION`
      (design.md, D7). Verify `npm run spec-ids` passes, and `openspec/requirements.json` has
      entries for [ERR-009], [ERR-010], [ERR-011], and [ELV-004].
- [x] 2.3 Commit tasks 2.1 and 2.2 with `#42` and `#28` in the message. Verify `npm run check`
      passes before the commit. `npm run validate` in that check fails a requirement text over 500
      characters.

## 3. Corpus README

- [ ] 3.1 In `corpus/1.2.3/README.md`, Cases, item 5.2, replace "The categories are the taxonomy of
      the error-model capability." State that the list holds each category of the error-model
      capability that a portable case can reach. Name the limit-exceeded category as a category
      that the list does not hold, because only a documented limit of a binding reaches it
      (design.md, D6). Verify the `categories`
      list of `corpus/1.2.3/cases.json` is unchanged and `npm run corpus:check` passes.
- [ ] 3.2 Commit group 3 with `#42` in the message. Verify `npm run check` passes before the commit,
      and `git status --short` shows only the corpus README and the artifacts of this change.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The pull request of this
change also archives it.

- Archive this change in the pull request. If a requirement or scenario changed after task 2.1,
  update the ledger and the index in the archive commit. Verify `npm run check` passes and
  `openspec list` shows no active change.
- Open the pull request with `Closes #42` and `Closes #28`, with the user's approval. State in the
  description that [ERR-010] is a break for a binding that identifies a limit only in the text of a
  message, and that `VERSION` stays `0.8.0+oscal.1.2.3` (design.md, D7).
- The release that carries this change is out of scope.
- After the release, draft one issue in `cairn-proofs/oscal-bindings-python` and one in
  `cairn-proofs/oscal-bindings-typescript`. Each issue states that a parse error over a documented
  limit must carry a testable limit property ([ERR-010]), and that each category test must follow
  the tree of [ERR-009]. The TypeScript issue also states that the depth limit of element validation
  must report the limit-exceeded category and the limit property ([ERR-011]), and refers to
  [typescript#10]. Post each issue only after the user approves it.

[#28]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/28
[#42]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/42
[typescript#10]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/10
