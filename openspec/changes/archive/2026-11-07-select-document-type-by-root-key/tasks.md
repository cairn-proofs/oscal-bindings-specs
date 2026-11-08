# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs`. A change in a binding repository is out
of scope (design.md, Non-Goals 5). The change edits a spec, the ledger, the requirement index, the corpus checker, and
the corpus index and README. It adds no corpus input.

## Task Dependency Graph

```
 1 (issue, branch, plan) ---> 2 (sync) ---> 3 (checker) ---> 4 (maximums)
```

Group 2 syncs the delta, so that the identifiers that the cases cite are in the main specs. Group 3 adds the field to
the checker before group 4 uses it in `cases.json`. The groups run in order.

## 1. Issue, branch, and planning commit

- [x] 1.1 Draft a store issue that states the problem of proposal.md, Why, and cites [python#41], [python#42], and
      [python#44]. Post it only after the user approves it. Verify `gh issue view <n>` shows the issue.
- [x] 1.2 Create the feature branch from the issue with `gh issue develop <n> --base main`, with the user's approval,
      and check it out. Commit the planning artifacts of this change as the first commit, with `#<n>` in the message.
      Verify `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate select-document-type-by-root-key --strict` passes.

## 2. Sync

- [x] 2.1 Sync the delta of this change into `openspec/specs/`, without archiving the change. In `document-parsing`,
      [PRS-013] follows [PRS-012]. Verify `openspec show document-parsing --type spec` lists [PRS-013], [PRS-013.01],
      and [PRS-013.02].
- [x] 2.2 In the same commit as task 2.1, set `PRS` `next` to 14 in `openspec/spec-ids.yaml`, and run
      `npm run requirements:write`. Do not change `VERSION` (design.md, D6). Verify `npm run spec-ids` passes, and
      `openspec/requirements.json` has an entry for [PRS-013].
- [x] 2.3 Commit tasks 2.1 and 2.2 with `#<n>` in the message. Verify `npm run check` passes before the commit.

## 3. Checker

- [x] 3.1 In `scripts/check-corpus.ts`, add `"expected-max-failures"?: number` to `Case`, and check each case with the
      field by the three rules of design.md, D4. The branch of a root key is the `oneOf` branch of the complete schema
      whose `required` holds that key. Verify `npm run typecheck` and `npm run corpus:check` pass with the unchanged
      `cases.json`.
- [x] 3.2 Verify each rule of D4 fails a case that breaks it. On the working copy of `cases.json`, apply three
      mutations one at a time: the value 0 on `parse/invalid-uuid`, the value 1 on `round-trip/minimal-catalog`, and
      the value 1 on a case whose input has two root keys. For the third, add a scratch input and case, and delete
      both after the check. Restore `cases.json` after each mutation. Verify `npm run corpus:check` reports the case
      for each mutation and passes after the restore.
- [x] 3.3 In `corpus/1.2.3/README.md`, add `expected-max-failures` to the optional fields of Cases, with the three
      rules of D4. Change the `parse` operation to state that the parse error carries no more entries than
      `expected-max-failures`. Verify the README names each field that `Case` holds.
- [x] 3.4 Commit group 3 with `#<n>` in the message. Verify `npm run check` passes before the commit.

## 4. Maximums

- [x] 4.1 Add `expected-max-failures` and the `requirements` identifiers of design.md, D5, to the eight cases of the D5
      table in `corpus/1.2.3/cases.json`. Verify `npm run corpus:check` passes.
- [x] 4.2 With the Python binding of [python#44], call `parse_oscal` on the input of each of the eight cases, and count
      the entries of each `OscalParseError`. Verify each count is within the `expected-min-failures` and
      `expected-max-failures` of its case. Record the counts in the pull request. A count over the maximum is a fault
      in the case or a defect of the binding, so stop and report it.
- [x] 4.3 Commit group 4 with `#<n>` in the message. Verify `npm run check` passes before the commit, and
      `git status --short` shows only `cases.json` and the artifacts of this change.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The change is archived in the same pull
request.

- Archive this change in the pull request. If a requirement or scenario changed after task 2.1, update the ledger and
  the index in the archive commit. Verify `npm run check` passes and `openspec list` shows no active change.
  Result: no requirement or scenario changed after task 2.1, so the ledger and the index need no update.
- Open the pull request with `Closes #<n>`, with the user's approval.
- The release that carries this change is out of scope. Its version is a minor increment (design.md, D6).
- After the release, draft an issue in `cairn-proofs/oscal-bindings-python` to move the pin. The issue states that the
  conformance runner reads `expected-max-failures`, that the traceability record cites [PRS-013], and that the local
  `document-type-selection` spec keeps only the binding details and refers to [PRS-013]. The binding details are the
  class-name tag, the `oscal_document_type` entry at the root, the names of the keys in its message, and the
  first-key selection. Post the issue only after the user approves it.
- Draft a store issue for the nested unions of the schema (design.md, Non-Goals 1), with the
  `closed-enum-out-of-set` numbers of design.md, Context item 4. Post it only after the user approves it.

[python#41]: https://github.com/cairn-proofs/oscal-bindings-python/issues/41
[python#42]: https://github.com/cairn-proofs/oscal-bindings-python/issues/42
[python#44]: https://github.com/cairn-proofs/oscal-bindings-python/pull/44
