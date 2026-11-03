# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #24). A change in a binding
repository is out of scope (design.md, Non-Goals 6). The change edits specs, the ledger, the requirement index, and
the corpus. No script or schema changes (proposal.md, Impact).

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (sync) ---> 3 (corpus case)
```

Group 2 syncs the deltas that the planning commit of group 1 holds. Group 3 comes after group 2, so that the scenario
that the new case cites is in the main specs when the case lands. The groups run in order.

## 1. Branch and planning commit

- [x] 1.1 Create the feature branch from #24 with `gh issue develop 24 --base main`, with the user's approval, and check
      it out. Commit the planning artifacts of this change as the first commit, with `#24` in the message. Verify
      `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate limit-parse-resources --strict` passes.

## 2. Sync

- [x] 2.1 Sync the deltas of this change into `openspec/specs/` without archiving the change. In `document-parsing`,
      [PRS-006] takes its new text, and [PRS-010], [PRS-011], and [PRS-012] follow [PRS-009]. In `yaml-documents`,
      [YML-005] takes its new text and its scenario [YML-005.05], and [YML-011] goes. In `error-model`, [ERR-001],
      [ERR-002], and [ERR-003] take their new text, with the scenarios [ERR-001.07] and [ERR-002.03]. Verify
      `openspec show document-parsing --type spec` lists [PRS-010], [PRS-011], and [PRS-012], and
      `openspec show yaml-documents --type spec` does not list [YML-011]. Verify
      `openspec show error-model --type spec` lists [ERR-001.07] and [ERR-002.03], and that its [ERR-001] text does
      not cite [YML-011].
- [x] 2.2 In the same commit as task 2.1, set `PRS` `next` to 13 in `openspec/spec-ids.yaml`. Add a `retired` entry for
      `YML-011` with `replaced_by: PRS-010` and a reason that states that [PRS-010] holds the same rule for each parse
      operation. Run `npm run requirements:write`. Do not change `VERSION` (design.md, D8). Verify `npm run spec-ids`
      passes, and `openspec/requirements.json` has entries for [PRS-010], [PRS-011], and [PRS-012] and none for
      [YML-011]. Verify a search for `YML-011` outside `openspec/changes/` finds only the ledger entry.
- [ ] 2.3 Commit tasks 2.1 and 2.2 with `#24` in the message, and state that `npm run check` passed. Verify
      `npm run check` passes before the commit, including `corpus:check` with the unchanged `requirements` fields of
      `parse/missing-required-field` and `parse/two-failures`, and `releases:check`.

## 3. Corpus case for the entry floor

- [ ] 3.1 Add `corpus/1.2.3/documents/invalid/many-failures.json`, as design.md, D3, states. The input is a catalog
      with valid `uuid` and `metadata` fields. `metadata.props` has 101 properties, and each property has only the
      field `"name": "x"`. Verify ajv with the catalog schema gives 101 errors at 101 different instance paths.
- [ ] 3.2 Add the case `parse/many-failures` to `corpus/1.2.3/cases.json` after `parse/two-failures`. The case has
  `operation` `parse`, `expected-category` `parse-error`, `expected-min-failures` 100, and `requirements`
  `["PRS-012.01"]`. Verify `npm run corpus:check` passes. The check counts 116 errors under the complete schema
  (design.md, D3). Set `expected-min-failures` to 117 and verify `npm run corpus:check` fails for `parse/many-failures`.
  Restore the value 100.
- [ ] 3.3 In `corpus/1.2.3/README.md`, Layout item 3, change "a minimal document with one fault" so that it also
      allows one kind of fault repeated, as `parse/two-failures` and `parse/many-failures` have. Verify the item
      describes each input in `documents/invalid/`.
- [ ] 3.4 Commit group 3 with `#24` in the message, and state that `npm run check` passed. Verify `npm run check`
      passes before the commit, and `git status --short` shows only the new input, `cases.json`, and the corpus
      README.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The change is archived in the same pull
request.

- Archive this change in the pull request. If a requirement or scenario changed after task 2.1, update the ledger and
  the index in the archive commit. Verify `npm run check` passes and `openspec list` shows no active change.
- Open the pull request with `Closes #24`, with the user's approval.
- The release that carries this change is out of scope. Its version is at least a minor increment over the last
  release (design.md, D8).
- After the release that holds this change is published, draft an issue in `cairn-proofs/oscal-bindings-python` to
  move the pin to that release. The issue states four facts. [PRS-010] replaces [YML-011]. Each documented limit
  names what it measures and the operations that it applies to. A parse error over a limit identifies the limit. The
  new case `parse/many-failures` expects 100 entries or more. Post the issue only after the user approves it.
- Draft an issue in this repository to state in [VER-003] how a `0.y.z` version treats a break (design.md, D8). Post
  it only after the user approves it.
- Draft an issue in this repository for the structured failures of element validation ([ELV-001]), as design.md,
  Non-Goals 3, states. Post it only after the user approves it.
