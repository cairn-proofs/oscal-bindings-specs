# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #18). The change edits specs,
the ledger, the requirement index, the corpus citations, the self-test labels, and the toolchain pin. No check,
schema, corpus case, or manifest changes (proposal.md, Impact). Group 2 also edits the private threat model in
`./threat-models/`, which is a separate repository with its own commit (design.md, D10). A change in a binding
repository is out of scope (design.md, Non-Goals 6).

## Task Dependency Graph

```
 1 (branch, plan, sync) ---> 2 (threat model identifiers)
          |
          +----------------> 3 (pin 1.15.0)
```

Group 1 holds the planning artifacts and the manual sync in one commit, because the change does not validate until
the main specs match its deltas (design.md, D7). Group 2 needs the synced main specs, because it checks each
identifier that the threat model cites against them. Group 3 comes after group 1, because the main specs pass
`openspec validate --all --strict` with 1.15.0 only after the sync. Groups 2 and 3 do not depend on each other.

## 1. Branch, planning artifacts, and manual sync

- [x] 1.1 Create the feature branch from #18 with `gh issue develop 18 --base main`, with the user's approval, and check
      it out. The working tree already sets 1.15.0 in `mise.toml`. Keep that edit out of the commit of group 1, for
      example with `git stash`, and restore it in task 3.1. Verify `git branch --show-current` is not `main`, and
      `openspec list` shows only this change.
- [x] 1.2 Write the list of scenario identifiers in the main specs to a scratch file, with
      `grep -rhoE 'Scenario: [A-Z]+-[0-9]{3}\.[0-9]{2}' openspec/specs | sort`. Edit `openspec/specs/` by hand to
      match the deltas of this change. Replace each MODIFIED requirement with its delta block, and insert each ADDED
      requirement at the place that design.md, D3 states. Do not run `openspec archive` for the sync, because it
      refuses the 12 MODIFIED blocks that drop a moved scenario (design.md, D7). Verify
      `openspec validate split-long-requirements --strict` passes. This shows only that no MODIFIED block drops a
      scenario of the main spec. It does not compare text. Then copy the repository to a scratch directory, run
      `openspec archive split-long-requirements --yes` there, and verify it prints "Specs already in sync; no files
      changed". That output shows that each MODIFIED and ADDED block matches the main spec (design.md, D7).
- [x] 1.3 Verify that no changed or new requirement cites a requirement below it in its spec. For each requirement
      that the deltas name, list each `[PREFIX-NNN]` citation of the same spec, and check that the cited requirement is
      above it. Verify that the only forward citations in the 8 changed specs are the ones of design.md, Non-Goals 3.
- [x] 1.4 In `openspec/spec-ids.yaml`, set `next` to 7 for `FAC`, 9 for `ERR`, 22 for `MDL`, and 20 for `NAM`. Add a
      `retired` entry for each of the 29 moved scenarios, with `replaced_by` its new identifier and a reason that names
      the new requirement. The pairs are below. Verify
      `npm run spec-ids` passes, and each identifier of the scratch list of task 1.2 is live or retired.
      Moved scenarios: FAC-004.01 → FAC-005.01, FAC-004.02 → FAC-006.01, FAC-004.03 → FAC-005.02, ERR-001.01 →
      ERR-004.01, ERR-001.02 → ERR-005.01, ERR-001.03 → ERR-006.01, ERR-001.04 → ERR-007.01, ERR-001.05 → ERR-008.01,
      ERR-001.06 → ERR-004.02, ERR-001.07 → ERR-004.03, MDL-001.01 → MDL-015.01, MDL-001.03 → MDL-010.06,
      MDL-007.04 → MDL-021.01, MDL-007.05 → MDL-021.02, MDL-007.06 → MDL-021.03, MDL-011.01 → MDL-018.01,
      MDL-011.04 → MDL-018.02, MDL-011.05 → MDL-018.03, MDL-011.06 → MDL-018.04, NAM-001.02 → NAM-009.01,
      NAM-001.03 → NAM-009.02, NAM-002.01 → NAM-010.01, NAM-002.02 → NAM-010.02, NAM-003.05 → NAM-012.01,
      NAM-004.02 → NAM-013.01, NAM-005.01 → NAM-015.01, NAM-005.02 → NAM-015.02, NAM-007.03 → NAM-017.01,
      NAM-008.03 → NAM-019.01.
- [x] 1.5 Run `npm run requirements:write`. Do not change `VERSION` (design.md, D9). Verify
      `git diff openspec/requirements.json` adds 26 entries and changes no existing entry.
- [x] 1.6 In `corpus/1.2.3/cases.json`, change each citation of a moved scenario to its new identifier: 9 citations of
      [ERR-001.01] to [ERR-001.06]. Change no other field. In `scripts/names.ts` and `scripts/check-releases.ts`, change
      each self-test label that names a moved scenario to its new identifier. Change no test body. Verify
      `npm run corpus:check`, `npm run names:self-test`, and `npm run releases:self-test` pass. Verify `git grep` of
      each old identifier of task 1.4 finds it only in `openspec/spec-ids.yaml` and `openspec/changes/`.
- [x] 1.7 Compare the diff of `openspec/specs/` against the table of design.md, D4. Verify each sentence that leaves a
      requirement is in the place that the table names. Verify the three rows that design.md, D4 marks for a
      reviewer's check, and the reading of [ERR-001] and [ERR-005] in design.md, D5.
- [x] 1.8 Verify `mise exec npm:@fission-ai/openspec@1.15.0 -- openspec validate --all --strict` passes. Verify
      `npm run check` passes with the pinned 1.13.0. Repeat the scratch archive of task 1.2 on the final state, and
      verify "Specs already in sync; no files changed". Commit tasks 1.2 to 1.7 and the planning artifacts as one
      commit, with `#18` in the message, and state that `npm run check` passed.

## 2. Threat model identifiers

- [x] 2.1 Run `scripts/setup-threat-model.sh` if `./threat-models/` is not present, and pull its branch. List each
      requirement and scenario identifier that the threat model cites, with
      `grep -ohE '\b[A-Z]{3}-[0-9]{3}(\.[0-9]{2})?\b' threat-models/*.json threat-models/*.svg | sort -u`. Verify each
      requirement identifier is live in the synced main specs, and each scenario identifier is live or has a
      `replaced_by`. For each identifier in the first column of design.md, D4, read the text that cites it, and verify
      the rule that the text relies on is still in that requirement. When the rule moved, change the citation to the
      new identifier, or cite both. At planning time, the only such citation is [NAM-008] in the Comments of threat 22
      (`e58154eb-0952-41f1-b754-84a99d59676f`). It names [NAM-008] as the source of the release baseline, which
      [NAM-018] now defines.
- [x] 2.2 Make the edits with the threat-composer tools, for example `tm_update_threat`, so that the model stays valid.
      Verify `tm_validate` passes, and the grep of task 2.1 finds no identifier whose cited rule moved. Commit in the
      threat-model repository with `#18` in the message, and push its branch only with the user's approval. Verify
      `git status --short` in this repository shows no change from group 2, because `/threat-models/` is ignored.

## 3. Pin the OpenSpec CLI to 1.15.0

- [x] 3.1 Restore the `mise.toml` edit from task 1.1, or set `"npm:@fission-ai/openspec" = "1.15.0"`. Run `mise lock`.
      Verify `mise.lock` names 1.15.0 for `npm:@fission-ai/openspec`, with a `digest` and a sidecar `path`, and
      `.mise/locks/npm-fission-ai-openspec/1.15.0/` exists. Remove `.mise/locks/npm-fission-ai-openspec/1.13.0/` if
      `mise lock` keeps it. Verify `git grep -n '1\.13\.0' -- mise.toml mise.lock .mise .github` finds nothing.
- [x] 3.2 Run `mise install --locked`. Verify `openspec --version` prints 1.15.0, and `npm run check` passes. Commit
      group 3 with `#18` in the message, and state that `npm run check` passed with 1.15.0. Verify
      `git status --short` shows no other change.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The change is archived in the same pull
request.

- Archive this change in the pull request with `openspec archive split-long-requirements`. Verify it reports "Specs
  already in sync" and changes no spec. If a requirement or scenario changed after task 1.2, update the ledger, the
  index, and the corpus citations in the archive commit. Verify `npm run check` passes and `openspec list` shows no
  active change.
- Open the pull request with `Closes #18`, with the user's approval. Verify the CI log of the toolchain step shows
  OpenSpec 1.15.0, and the CI run passes.
- In the pull request, answer the three questions of #18: the release decides the increment (design.md, D9), a
  binding does not have to cite a new identifier (design.md, D8), and one pull request carries the split and the pin
  (design.md, D7). State the deviation from #18, Proposed work 1, which says to keep each existing scenario: 29
  scenarios move to new identifiers, so that each scenario is under the rule that it tests (design.md, D3, D6).
- If #13 merges first, rebase, resolve `mise.toml` and `mise.lock`, and run `mise lock` again.
- The release that carries this change is out of scope. It chooses a minor or a patch increment (design.md, D9). Its
  notes list the 29 moved scenarios with their new identifiers, for binding tests that name a scenario.
- #31 covers the 11 forward citations in requirements that this change does not touch (design.md, Non-Goals 3), a
  rule in `openspec/config.yaml`, and a check in `npm run spec-ids`. It starts after this change merges.
