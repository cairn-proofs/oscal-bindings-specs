# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #16). The YAML work in each
binding is out of scope (design.md, Non-Goals 5).

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (reader) ---> 3 (corpus operations) ---> 4 (fixtures) ---> 5 (sync, release)
```

Group 3 calls the reader of group 2. Group 4 adds cases that the checks of group 3 prove. Group 5 syncs the specs
that the cases of group 4 cite. The groups run in order.

## 1. Branch and planning commit

- [x] 1.1 Start after PR #20, which archives `trace-binding-operations-to-contract`, merges into `main`. Create the
      feature branch from #16 with `gh issue develop 16 --base main`, with the user's approval, and check it out.
      Commit the planning artifacts of this change as the first commit, with `#16` in the message. Verify
      `git branch --show-current` is not `main`, `openspec list` shows only this change, and
      `openspec validate define-yaml-documents --strict` passes.

## 2. Reference reader

- [ ] 2.1 Add `scripts/yaml-reader.ts` (design.md, D4). It exports one function that takes the input bytes and the ajv
      validator of the document. It returns the JSON value, or a parse error with a reason code. Follow steps 1 to 3
      of D4. These include `fatal` UTF-8 decoding, `resolveKnownTags: false`, and warnings that are not errors. They
      also include the content (`Scalar.source`) of each scalar, alias resolution with a cycle check, and the JSON
      grammar of D2. Add the
      start-up check of D4 for locations that allow a string and another scalar type. Verify `npm run typecheck`
      passes.
- [ ] 2.2 Add `--self-test` to the reader, and the script `yaml-reader:self-test` to `package.json` before
      `corpus:check` in `npm run check`. Self-test inputs cover each scenario of [YML-002], [YML-003], [YML-004], and
      [YML-009], plus a `!!set` and a `!!binary` tag. It covers [YML-005.04] and [YML-010.01] with the JSON text and
      the error location that the reader returns. The self-test checks the reason code of each rejected input.
      Verify `npm run yaml-reader:self-test` passes, and that it fails when the self-test expects `version: 1.0` to
      give a number.
- [ ] 2.3 Add the reader self-test to the check list in `README.md`. Verify each command that the README names exists
      in `package.json`.
- [ ] 2.4 Commit group 2 with `#16` in the message, and state that `npm run check` passed. Verify `npm run check`
      passes before the commit.

## 3. Corpus operations

- [ ] 3.1 Add `yaml-round-trip` and `yaml-parse` to `OPERATIONS` in `scripts/check-corpus.ts`, with the checks of
      design.md, D5. A `yaml-round-trip` case needs a `document-type`, and its input root must be that type. The
      canonical form of the reader output must equal `expected`. A `yaml-round-trip` case with a `source` must name an
      `expected` file that a JSON `round-trip` case also names, and `--write` does not write that file. For
      `yaml-parse`, the reader must reject the input. Update the header comment of the script. Verify
      `npm run corpus:check` passes with no YAML case.
- [ ] 3.2 Update `corpus/1.2.3/README.md`. Verify each operation in `OPERATIONS` has an entry in the README, and that
      no README statement is false for a YAML case:
      1. Add the two operations to [Operations](../../../corpus/1.2.3/README.md#operations).
      2. State that a binding that offers no YAML skips each operation whose name starts with `yaml-`.
      3. State that the non-raising validity check applies only to a `round-trip` input, not to a `yaml-round-trip`
         input.
      4. Add the `.yaml` inputs to the layout list. Change "Each is the minimal catalog with one fault" so that it
         also covers the YAML fixtures, which are minimal documents of other types.
- [ ] 3.3 In `docs/canonical-json.md`, add the yaml-documents spec ([YML-008]) to the specs that use the canonical
      form. Verify `npm run check` passes.
- [ ] 3.4 Commit group 3 with `#16` in the message, and state that `npm run check` passed. Verify `npm run check`
      passes before the commit.

## 4. Corpus fixtures

- [ ] 4.1 Copy the seven NIST YAML examples of design.md, Context 4, from `usnistgov/oscal-content` at commit
      `78650f02ad9321bb7b817846f8fbd4f2bcd620de` into `corpus/1.2.3/documents/valid/`, with the name of the JSON twin
      and the `.yaml` extension. Add one `yaml-round-trip` case for each, with the `source` and its `sha256`, the
      `document-type` and the `expected` file of the JSON twin, and `requirements: ["YML-005.02", "YML-008.01"]`.
      Verify `npm run corpus:check` passes and `git status` shows no change under `corpus/1.2.3/expected/`.
- [ ] 4.2 Add the three hand-written `yaml-round-trip` cases of design.md, D6, items 2 to 4. Cite the scenarios that
      each fixture tests: [YML-004.01] to [YML-004.06], [YML-004.09], [YML-005.04], [YML-009.01], [YML-009.03],
      [YML-008.01], and [YML-008.02]. Run `npm run corpus:write`. Read each value of the new expected files by hand,
      against the list in D6. Verify `npm run corpus:check` passes.
- [ ] 4.3 Add the `yaml-parse` cases of design.md, D6, item 5, with `expected-category: parse-error`. Each case cites
      the scenario that it tests, for example [YML-002.01] to [YML-002.04], [YML-003.02], [YML-003.03], [YML-004.07],
      [YML-004.08], [YML-004.10], [YML-005.03], [YML-009.02], [YML-009.04], and [YML-010.01]. At least one case also
      cites [ERR-001.06]. The `notes` of each case name its fault. Verify `npm run corpus:check` passes, and that the
      reason code of the reader for each input matches the fault in its `notes`.
- [ ] 4.4 Commit group 4 with `#16` in the message, and state that `npm run check` passed. Verify `npm run check`
      passes before the commit.

## 5. Sync and release `0.5.0+oscal.1.2.3`

- [ ] 5.1 Sync the deltas of this change into `openspec/specs/` without archiving the change. In the same commit, add
      the prefix `YML` for `yaml-documents` with `next: 12` to `openspec/spec-ids.yaml`, and run
      `npm run requirements:write`. Verify `npm run spec-ids` passes, `openspec show yaml-documents --type spec` lists
      [YML-001] to [YML-011], and `openspec/requirements.json` holds the eleven new entries.
- [ ] 5.2 Set `VERSION` to `0.5.0+oscal.1.2.3` (design.md, D7). Verify `npm run check` passes, including
      `releases:check`, which checks that no released name or schema file changed.
- [ ] 5.3 With the user's approval, push the branch and open the pull request for #16. After the merge, tag
      `v0.5.0+oscal.1.2.3` on `main`, with the user's approval. Verify CI builds the archive and creates the draft
      release. The user publishes it.
- [ ] 5.4 Draft a comment on cairn-proofs/oscal-bindings-python#7 that names the release and the YAML requirements.
      The comment lists observable cases that the planned design must pass: `as-is: yes` and `start: +443` are parse
      errors, and a mapping with `title` two times is a parse error. Post it only after the user approves it. Verify
      the comment exists after approval.

## Workflow follow-up

- Archive this change. If a requirement or scenario changed after task 5.1, update the ledger in the archive commit.
  Verify `npm run spec-ids` passes and `openspec list` shows no active change.
