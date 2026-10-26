# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #9). The Python pin move is a
Python change and is out of scope (design.md, D5 and Risks 3).

## Task Dependency Graph

```
 1 (branch + plan commit) ---> 2 (corpus cases) ---> 3 (sync + release) ---> 4 (archive)
```

Each group edits files that the next group reads, so the groups run in order. The tasks of group 2 all edit
`corpus/1.2.3/cases.json` and run as one wave.

## 1. Branch and planning commit

- [ ] 1.1 Create the feature branch from #9 with `gh issue develop 9`, with the user's approval, and check it out.
      Commit the planning artifacts of this change as the first commit, with `#9` in the message. Verify
      `git branch --show-current` is not `main` and `openspec validate reject-out-of-set-closed-enums --strict` passes.

## 2. Corpus cases

- [ ] 2.1 Add `corpus/1.2.3/documents/invalid/closed-enum-out-of-set.json`: the minimal catalog with one parameter
      whose `select` has `how-many: "seven"` and one `choice` (design.md, D3). Add the `parse` case
      `parse/closed-enum-out-of-set` with `expected-category: parse-error` and `requirements: ["PRS-009.01"]`. Verify
      `npm run corpus:check` passes, and that the schema reports one failure only, the `enum` keyword at
      `/catalog/params/0/select/how-many`.
- [ ] 2.2 Add `corpus/1.2.3/documents/valid/open-enum-off-list.json`: the minimal catalog with one back-matter
      resource, one rlink, and one hash with `algorithm: "BLAKE3"` (design.md, D3 and Risks 1). Add the `round-trip`
      case `round-trip/open-enum-off-list` with `document-type: catalog`, `expected:
      expected/open-enum-off-list.json`, and `requirements: ["PRS-009.02"]`. Run `npm run corpus:write`. Verify
      `npm run corpus:check` passes and the expected file holds `"algorithm":"BLAKE3"`.
- [ ] 2.3 Add `corpus/1.2.3/elements/parameter-selection-out-of-set.json` with `how-many: "seven"` and one `choice`.
      Add the `validate-element` case `element/parameter-selection-out-of-set` with
      `element-type: parameter-selection`, `expected-valid: false`, and
      `requirements: ["PRS-009.03", "ELV-001.02"]`. Verify `npm run corpus:check` passes.
- [ ] 2.4 Commit group 2 with `#9` in the message and state that `npm run check` passed. Verify `npm run check`
      passes before the commit.

## 3. Sync and release `0.3.0+oscal.1.2.3`

- [ ] 3.1 Sync the delta of this change into `openspec/specs/document-parsing/spec.md` without archiving the change.
      In the same commit, set `PRS` `next` to 10 in `openspec/spec-ids.yaml`. Verify `npm run spec-ids` passes and
      `openspec show document-parsing --type spec` lists [PRS-009] with three scenarios.
- [ ] 3.2 Set `VERSION` to `0.3.0+oscal.1.2.3` (design.md, D2). Verify `npm run check` passes, including
      `releases:check`, which checks that no released name or schema file changed.
- [ ] 3.3 With the user's approval, push the branch and open the pull request for #9. After the merge, tag
      `v0.3.0+oscal.1.2.3` on `main`, with the user's approval. Verify CI builds the archive and creates the draft
      release. The user publishes it.

## 4. Follow-up and archive

- [ ] 4.1 Draft an issue in `cairn-proofs/oscal-bindings-python` to move the spec artifact pin to
      `0.3.0+oscal.1.2.3` and run the new corpus cases. Post it only after the user approves it. Verify the issue
      exists after approval.
- [ ] 4.2 Archive this change. If a requirement or scenario changed after task 3.1, update the ledger in the archive
      commit. Verify `npm run spec-ids` passes and `openspec list` shows no active change.
