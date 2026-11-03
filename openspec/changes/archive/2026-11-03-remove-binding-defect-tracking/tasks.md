# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #23). A change in a binding
repository is out of scope (design.md, Non-Goals 5).

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (corpus) ---> 3 (link check, README) ---> 4 (sync)
```

Group 3 needs group 2, because the link check fails on the `issue` values in `cases.json` until group 2 removes them.
Group 4 syncs the specs that the messages of groups 2 and 3 cite. The groups run in order.

## 1. Branch and planning commit

- [x] 1.1 Create the feature branch from #23 with `gh issue develop 23 --base main`, with the user's approval, and check
      it out. Commit the planning artifacts of this change as the first commit, with `#23` in the message. Verify
      `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate remove-binding-defect-tracking --strict` passes.

## 2. Corpus without binding data

- [x] 2.1 In `corpus/1.2.3/cases.json`, remove the `known-defects` field from `round-trip/seven-fraction-digits`,
      `parse/name-keyed-field`, and `yaml-round-trip/string-scalars`. Remove the top-level `defect-twins` array. Verify
      `git diff --stat` shows only `cases.json`, and that the diff removes lines only.
- [x] 2.2 In `scripts/check-corpus.ts`, apply design.md, D4. Remove the `known-defects` entry check and the
      defect-twin group check. Remove both fields from the types. Fail on a case that has the own property
      `known-defects`, and on an index that has the own property `defect-twins`. Each message cites [VER-006]. Add the
      rejection as item 10 of the header comment. Verify `npm run typecheck` and `npm run corpus:check` pass. Then add
      `"known-defects": []` to one case and verify `npm run corpus:check` fails with the [VER-006] message. Remove it,
      add `"defect-twins": []` to the index, and verify the check fails again. Restore `cases.json` and verify
      `git diff corpus/1.2.3/cases.json` matches task 2.1 only.
- [x] 2.3 Update `corpus/1.2.3/README.md` as design.md, D6, item 3 states. Remove the `known-defects` clause from the
      first paragraph and the `known-defects` item from the optional fields. Renumber `notes` as item 6. Link [VER-007]
      with the anchor `#requirement-ver-007-each-binding-keeps-its-own-expected-conformance-failures` in
      `../../openspec/specs/schema-versioning/spec.md`. Verify `grep -rn "known-defects\|defect-twins"` outside
      `openspec/` finds only the rejection code in `scripts/check-corpus.ts`.
- [x] 2.4 Commit group 2 with `#23` in the message, and state that `npm run check` passed. Verify `npm run check`
      passes before the commit. The [VER-007] link in the corpus README resolves after group 4.

## 3. Link check and README

- [x] 3.1 Add `## Known implementations` to `README.md` after `## Use the store`, as design.md, D6, item 1 states. It
      lists `oscal-bindings-python` (Python) with a link to `https://github.com/cairn-proofs/oscal-bindings-python` and
      a link to `https://github.com/cairn-proofs/oscal-bindings-python/issues`. It states that each binding keeps its
      own expected conformance failures. Verify the section has no link that ends in an issue or pull request number.
- [x] 3.2 Add `scripts/check-binding-links.ts` with the steps of design.md, D3, items 1 to 5. Verify
      `npm run typecheck` passes, and `npx tsx scripts/check-binding-links.ts` passes on the working tree.
- [x] 3.3 Add `--self-test` to the script with the cases of design.md, D3, item 6. Add `binding-links:check` and
      `binding-links:self-test` to `package.json`, after `corpus:check` in the `check` chain. Verify
      `npm run binding-links:self-test` passes, and that it fails when one case expects
      `github.com/cairn-proofs/oscal-bindings-python/issues/6` to pass. Add
      `cairn-proofs/oscal-bindings-python#6` to a line of `docs/canonical-json.md` and verify
      `npm run binding-links:check` fails and names the file and line. Restore the file and verify `git status` shows
      no change to it.
- [x] 3.4 Add the link check as item 9 of the check list in `README.md` `## Develop`, and renumber the items after it
      (design.md, D6, item 2). Verify each command that the README names exists in `package.json`.
- [x] 3.5 Commit group 3 with `#23` in the message, and state that `npm run check` passed. Verify `npm run check`
      passes before the commit.

## 4. Sync

- [x] 4.1 Sync the deltas of this change into `openspec/specs/` without archiving the change. [PRS-005] loses the
      binding-specific defect sentences, and [VER-006] and [VER-007] follow [VER-005]. In the same commit, set `VER`
      `next` to 8 in `openspec/spec-ids.yaml`, and run `npm run requirements:write`. Do not change `VERSION`
      (design.md, D5). Verify `npm run spec-ids` passes, `openspec show schema-versioning --type spec` lists [VER-006]
      and [VER-007], `openspec/requirements.json` holds the two new entries, and `grep -n "Python runtime"
      openspec/specs` finds nothing. Verify `npm run check` passes, including `releases:check`, and the [VER-007] link
      in `corpus/1.2.3/README.md` resolves to a heading in the main spec.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The change is archived in the same pull
request.

- Archive this change in the pull request. If a requirement or scenario changed after task 4.1, update the ledger and
  the index in the archive commit. Verify `npm run check` passes, `openspec list` shows no active change, and
  `npm run binding-links:check` passes with no exempt path left outside `openspec/changes/archive/`.
  Result: no requirement or scenario changed after task 4.1, so the ledger and the index need no update.
- OpenSpec 1.15.0 fails `--strict` on 24 long requirements in the main specs. This pull request keeps the pin at
  1.13.0. The pin moves with the fix in #18.
- Open the pull request with `Closes #23`, with the user's approval.
- The release that carries this change is out of scope. Its version is at least a minor increment over the last
  release (design.md, D5).
- After the release that holds this change is published, draft an issue in `cairn-proofs/oscal-bindings-python` to
  move the pin to that release. The issue states that the corpus no longer carries `known-defects`, and that the
  binding keeps its expected failures as #33 set up. Post it only after the user approves it.
