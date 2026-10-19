# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #7). Work in a code repo goes
into a local change of that repo (phase 1 design, D8). The release order is in design.md, D9: the release in group 6
comes before the TypeScript spike, and the archive in group 7 comes after it.

## Task Dependency Graph

```
 1 (file schemas) ---> 2 (generator) ---> 3 (overrides for 1.2.3) ---> 6 (sync + release) ---> 7 (spike, archive)
                            |                                              ^
                            +------------> 4 (checks) ---------------------+
 5 (repository governance) ------------------------------------------------+
```

Group 1 and group 5 touch different files and can run in parallel. Group 4 needs the generator from group 2, and its
regeneration check needs the committed files from group 3.

## 1. Manifest file formats

- [x] 1.1 Write `manifest/names.schema.json` for format 1 ([NAM-002], [NAM-003], [NAM-004]). Constrain every string:
      names and type references with `^[A-Z][A-Za-z0-9]*$`, pointers with a fixed character set and no `%`,
      `property` and `body-field` with the OSCAL key pattern, and `schema.file` as a bare file name. Set
      `additionalProperties` to false on each object. Define the six kinds and the data of each kind (design.md, D4).
      Verify with fixtures: the sketch in D4 passes, and a name with a final newline, a name with `-`, an entry
      without a kind, and a `schema.file` of `../x.json` each fail.
- [x] 1.2 Write `manifest/overrides.schema.json` for format 1 ([NAM-005]): `local-names`, `names`, and `merges`, with
      the same string constraints as task 1.1. Verify with fixtures: the sketch in D4 passes, and an unknown member and
      a merge with one pointer each fail.

## 2. Names generator

- [x] 2.1 Add a pointer module under `scripts/`. It parses `#` plus an RFC 6901 pointer with `~0` and `~1`, and it
      resolves the pointer through own properties only (`Object.hasOwn`). Keyed tables use `Map`. Verify with
      self-tests: `__proto__`, `constructor`, `toString`, `~0`, `~1`, and `%` keys resolve only when they are own
      keys.
- [x] 2.2 Add the place walk. It finds each definition, inline object, union, union branch, enum place, single-or-many
      property, document wrapper, and the document union ([MDL-001], [MDL-011], [MDL-012]). It does not follow `$ref`.
      It skips scalar definitions ([NAM-001]). Verify against the counts in design.md, Context, item 3, for the 1.2.3
      schema.
- [x] 2.3 Add the naming rules ([MDL-001], [MDL-002], [MDL-005], [MDL-006], [MDL-010], [MDL-011], [MDL-012]) and the
      override names from `overrides.json`. Verify with self-tests that cover each scenario of those requirements,
      with small schemas in memory.
- [x] 2.4 Add the merge rules ([MDL-013]): branch copies merge, and an explicit merge from `overrides.json` merges.
      The structural comparison compares `$ref` strings, not their targets. Verify with self-tests for
      [MDL-013.03], [MDL-013.04], and a merge of two different structures.
- [x] 2.5 Add the derivation guards ([MDL-007]) and the override guards ([NAM-005]). Guards 3 to 6 and the override
      guards report every failure in one run. Verify with a self-test for each scenario of [MDL-007] and [NAM-005].
- [x] 2.6 Add pinning ([NAM-007]). The generator reads the manifest of the previous OSCAL release, when the store
      holds one, and checks it against [NAM-003], [NAM-004], and the previous schema hash before it uses it
      ([NAM-006]). It reports each dropped name. Verify with self-tests for each scenario of [NAM-007], using two small
      schemas.
- [x] 2.7 Add the writer and the command-line entry. The writer hashes the schema bytes that it parses, sorts by code
      unit (not `localeCompare`), writes two-space indentation, sorted keys, and a final newline (design.md, D4). Check
      mode compares in memory and writes nothing. Add `npm run names:write` and `npm run names:check`. Verify with a
      self-test that two runs give byte-identical output ([NAM-006.02]).

## 3. Overrides for OSCAL 1.2.3

- [x] 3.1 Run the generator on the 1.2.3 schema with an empty `manifest/1.2.3/overrides.json`. Verify that the run
      stops with the guard for missing singular names ([MDL-007.04]), and record the list of list properties that it
      names.
- [x] 3.2 For each list property from task 3.1, find the singular local name in the NIST OSCAL v1.2.3 Metaschema
      source and add it to `local-names` (design.md, D7). Record the Metaschema file and definition for each name in
      the pull request description. Verify that the generator no longer reports a missing singular name.
- [x] 3.3 Check each candidate for an explicit merge (design.md, D8) against Metaschema. Add a merge only when both
      places use the same Metaschema definition. Verify that the generator accepts each merge ([MDL-007.06]).
- [x] 3.4 Generate the full name list and give it to the user for review. Add the override names that the user
      approves, at least `RiskLog`, and decide on the candidate `InformationType` (design.md, D2).
      Verify that the user approved the list, and that the generator gives no guard failure.
- [x] 3.5 Write `manifest/1.2.3/names.json` with `npm run names:write`. Replace the placeholder
      `manifest/1.2.3/README.md` with a short description of the two files. Verify `npm run names:check` passes, and
      that the scenario names in the specs match the generated names, for example `SystemComponentStatus`,
      `HashAlgorithm`, `ParameterSelectionHowMany`, `RiskStatus`, `MergeWithFlat`, `TaskTimingOnDate`,
      `BackMatterResourceCitation`, `FindingTargetStatusState`, and `MappingCollectionMappings`.

## 4. Store checks

- [x] 4.1 Add the manifest check under `scripts/`. It validates each `names.json` and `overrides.json` against its JSON
      Schema, and it checks the rules that a JSON Schema cannot express: unique names, references that name an entry,
      pointers that resolve, distinguishing properties that are keys at their pointer, and a schema hash that matches
      the vendored schema ([NAM-001], [NAM-003], [NAM-004]). Verify with a fixture for each scenario of [NAM-003] and
      [NAM-004].
- [x] 4.2 Add regeneration for each OSCAL release in the store, in release order ([NAM-006]). Verify that a hand edit
      of `names.json` fails the check ([NAM-006.01]).
- [x] 4.3 Add the release name check ([NAM-008]). It selects the baseline from `v*` tags that match the version
      grammar of `check-version.ts`, name the same OSCAL release, and are ancestors of `origin/main`, by Semantic
      Versioning precedence. It calls git with argument arrays and full `refs/tags/` names. It fails when it cannot
      read the tags or the history. It writes each changed or removed name to the output and to
      `$GITHUB_STEP_SUMMARY` when that is set. Verify with self-tests for each scenario of [NAM-008], including
      `v0.10.0` after `v0.9.0`.
- [x] 4.4 Add a check that fails when a file under a released `schemas/<release>/` differs from the same file at the
      baseline tag of task 4.3. Verify with a self-test that changes one byte.
- [x] 4.5 Add a name diff for reviewers. It compares each `names.json` with the same file at the base ref that
      `SPEC_IDS_BASE` names, and lists each added, changed, and removed name with its pointer and its cause: rule,
      override name, singular local name, or merge. It writes the list to the output, and to `$GITHUB_STEP_SUMMARY`
      when that is set. It reports and does not fail. It complements task 4.3, which compares with the latest release
      and enforces the version rule. Verify with a self-test that changes one override and expects one changed name
      with the cause "override name".
- [x] 4.6 Add the checks and self-tests of tasks 4.1 to 4.5 to `npm run check`. Set `timeout-minutes` on the CI
      `build` job. Keep the new steps out of the `draft-release` job, and add no npm dependency. Verify
      `npm run check` passes locally and `git diff package-lock.json` is empty.

## 5. Repository governance

- [x] 5.1 Add `.github/CODEOWNERS` for `manifest/`, `schemas/`, `scripts/`, and `.github/`. Verify GitHub shows the
      owners on a pull request that touches `manifest/`.
- [ ] 5.2 Ask the user, as repository admin, to confirm that `main` requires a reviewed pull request, a code owner
      review, and the `build` check, and to add a ruleset that blocks update and deletion of `v*` tags. Verify the user
      confirms each setting.
      Status (checked with `gh api`):
      1. Done: `main` requires the `build` check (strict, admins included) and a pull request.
      2. Done: the active tag ruleset "Protect release tags" (id 25416793) blocks update and deletion of
         `refs/tags/v*`, with no bypass actors.
      3. Open: one approval and code owner review. The repository has one maintainer, and GitHub does not let an author
         approve their own pull request, so these settings would block every merge. When a second maintainer joins:
         create a team such as `@cairn-proofs/maintainers`, point CODEOWNERS at it, add both maintainers, and require
         one approval and code owner review on `main`.
- [x] 5.3 Add `.github/pull_request_template.md` with a manifest section that asks for: the reason for each change to
      `overrides.json`, the Metaschema file and definition for each new singular local name, and, when a released name
      changes, the `VERSION` increment. Add `.gitattributes` with `manifest/*/names.json linguist-generated=true`, so
      that GitHub collapses the generated diff and reviewers read `overrides.json` and the name diff of task 4.5.
      Verify that a new pull request shows the template, and that GitHub marks `names.json` as generated in its diff.

## 6. Sync and release `0.2.0+oscal.1.2.3`

- [x] 6.1 Sync the deltas of this change into the main specs without archiving the change. In the same commit, update
      `openspec/spec-ids.yaml`: add the prefix `NAM` for `naming-manifest` with `next: 9`, set `MDL` `next` to 14, and
      add a retired entry for `MDL-004` with a reason and `replaced_by: MDL-013`. Verify `npm run spec-ids` passes and
      `openspec list --specs --store oscal-bindings-specs` shows nine capabilities.
- [x] 6.2 Update the store `README.md` for the manifest files and the generator commands. Set `VERSION` to
      `0.2.0+oscal.1.2.3`. Verify `npm run check` passes.
- [x] 6.3 With the user's approval, push the branch, open the pull request, and after the merge tag `v0.2.0+oscal.1.2.3`
      on `main`. Verify CI builds the archive with `names.json` and creates the draft release. The user publishes it.

## 7. TypeScript spike and archive

- [ ] 7.1 Give the spike in cairn-proofs/oscal-bindings-python#17 the release tag and its `sha256`. Record each format
      problem that the spike finds. Verify the spike reports whether its types compile from the schema and
      `names.json`.
- [ ] 7.2 If the spike found a format problem, update this change and its artifacts, and repeat group 6 with the next
      version. Verify the spike passes against the new release.
- [x] 7.3 Draft the follow-up issues for the user to review, and post them only after approval: the closed-enum parse
      rule with corpus cases in the store, the closed-enum fix in the Python repo, and the new scope of
      cairn-proofs/oscal-bindings-python#16 (Python consumes `names.json`). Verify each issue exists after approval.
      Posted: #9 (store), cairn-proofs/oscal-bindings-python#21 (Python), and the new title and body of
      cairn-proofs/oscal-bindings-python#16.
- [ ] 7.4 Archive this change. If any requirement or scenario changed after task 6.1, update the ledger in the archive
      commit. Verify `npm run spec-ids` passes and `openspec list --store oscal-bindings-specs` shows no active change.
