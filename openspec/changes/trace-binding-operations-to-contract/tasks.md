# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #17). The surface check and the
record of each binding are binding changes and are out of scope (design.md, Non-Goals 1).

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (index) ---> 3 (record schema) ---> 4 (archive, docs) ---> 5 (sync, release)
```

Groups 2 and 3 both edit `package.json` and the self-test of `scripts/requirements.ts`, so they run in order. Group 4
lists files that groups 2 and 3 create. Group 5 regenerates the index from the synced specs.

## 1. Branch and planning commit

- [ ] 1.1 Create the feature branch from #17 with `gh issue develop 17`, with the user's approval, and check it out.
      Commit the planning artifacts of this change as the first commit, with `#17` in the message. Verify
      `git branch --show-current` is not `main` and `openspec validate trace-binding-operations-to-contract --strict`
      passes.

## 2. Requirement index

- [ ] 2.1 Add `scripts/requirements.ts` with `--write`, a default check mode, and `--self-test` (design.md, D4). It
      reads the main specs with `readRepository` and `parseSpec`, fails with no output when a requirement heading has
      no well-formed identifier, and writes entries in identifier order. The check mode names
      `npm run requirements:write` when the committed file differs or is missing. Self-test fixtures cover
      [SRF-006.01], [SRF-006.02], [SRF-006.03], the identifier order across prefixes (`BMB-002` before `ELV-001`,
      `MDL-005` before `MDL-010`), and a malformed heading. Verify `npx tsx scripts/requirements.ts --self-test`
      passes and `npm run typecheck` passes.
- [ ] 2.2 Add `requirements:write`, `requirements:check`, and `requirements:self-test` to `package.json`, and add
      the self-test and the check to `npm run check` after `spec-ids`. Mark `openspec/requirements.json` as generated
      in `.gitattributes`. Run `npm run requirements:write`. Verify the file has one entry for each of the 52
      requirements that `openspec list --specs` counts, with no `MDL-004` entry, and `npm run check` passes.
- [ ] 2.3 Update the check list in `README.md` and add `openspec/requirements.json` to the layout. Verify each command
      that the README names exists in `package.json`.
- [ ] 2.4 Commit group 2 with `#17` in the message and state that `npm run check` passed.

## 3. Traceability record JSON Schema

- [ ] 3.1 Add `openspec/traceability.schema.json` (design.md, D3 and D6). Add self-test fixtures that check records
      against it with ajv:
      1. The D3 example passes.
      2. An entry with both `requirements` and `binding-local` fails ([SRF-007.01]).
      3. The identifier `PRS-001.01` fails ([SRF-007.02]).
      4. An unknown member, an empty `requirements` list, and a name with a space each fail.

      Verify `npm run requirements:self-test` passes.
- [ ] 3.2 Add the schema to the layout in `README.md`. Verify `npm run check` passes, and commit group 3 with `#17` in
      the message.

## 4. Archive contents and contributor docs

- [ ] 4.1 Add `openspec/requirements.json` and `openspec/traceability.schema.json` to `CONTENTS` in
      `scripts/build-archive.ts`. Run `npm run archive` and list the archive with `tar -tzf`. Verify it holds both files
      ([SRF-006.04], [SRF-007.03]) and no file under `openspec/changes/`. Delete `dist/` after the check.
- [ ] 4.2 Add `CONTRIBUTING.md` (design.md, D7). It states the promotion path of [SRF-005] and the step that
      regenerates the index after a change to a requirement heading. It links to the record schema. Link it from
      `README.md`. Verify every relative link in both files resolves and `ste-lint.py` reports no hard violation.
      Verify that the file cites the requirements and does not restate them.
- [ ] 4.3 Commit group 4 with `#17` in the message and state that `npm run check` passed.

## 5. Sync and release `0.4.0+oscal.1.2.3`

- [ ] 5.1 Sync the delta of this change into `openspec/specs/binding-surface/spec.md` without archiving the change.
      In the same commit, add the prefix `SRF` with `capability: binding-surface` and `next: 8` to
      `openspec/spec-ids.yaml`, and run `npm run requirements:write`. Verify `npm run spec-ids` passes,
      `openspec show binding-surface --type spec` lists [SRF-001] to [SRF-007], and the index has 59 entries.
- [ ] 5.2 Set `VERSION` to `0.4.0+oscal.1.2.3` (design.md, D5). Verify `npm run check` passes, including
      `releases:check`.
- [ ] 5.3 With the user's approval, push the branch and open the pull request for #17. State the new binding
      obligation in the pull request summary (design.md, Risks 1). After the merge, tag `v0.4.0+oscal.1.2.3` on `main`,
      with the user's approval. Verify CI builds the archive and creates the draft release, and that the draft notes
      state the new obligation. The user publishes it.

## Workflow follow-up

- Draft an issue in `cairn-proofs/oscal-bindings-python` to move the pin to `0.4.0+oscal.1.2.3`, add the traceability
  record, and add the surface check. Post it only after the user approves it.
- Archive this change. If a requirement or scenario changed after task 5.1, update the ledger and the index in the
  archive commit. Verify `npm run check` passes and `openspec list` shows no active change.
