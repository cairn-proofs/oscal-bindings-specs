# Tasks

## 1. Strict read in the runner

- [x] 1.1 In `scripts/canonical-json.ts`, add the third step of [D5] to `parseStrict`. Read the escape
      sequences from left to right. Treat `\\` as one sequence. Throw for a lone surrogate escape.
      In `scripts/check-canonical-json.ts`, add the rows of [D7] item 1. Verify
      `npm run canonical:self-test` passes, and verify `npm run corpus:check` still passes. A failure
      names a document of the corpus that holds a lone surrogate escape ([Risks]).
- [x] 1.2 In `scripts/check-corpus.ts`, add `loneSurrogateCaseProblem(text, isValid)` ([D6]) and call
      it in the `parse` branch for a case that cites PRS-023.01 or PRS-023.02. Add the rule to check
      5 of the header comment. Build `isValid` from the schema validator and the constraint check
      ([D6]). Add the self-test cases of [D7] item 2. Verify `npm run typecheck` and
      `npm run corpus:self-test` pass.
- [x] 1.3 In `docs/canonical-json.md`, add the lone surrogate escape to the sentence in step 1 that
      names a duplicate object key ([D5]). Verify that `grep -n "surrogate" docs/canonical-json.md`
      shows the sentence.

## 2. Corpus cases

- [x] 2.1 Write the three documents of [D4]. The files are
      `corpus/1.2.3/documents/invalid/lone-high-surrogate.json`,
      `corpus/1.2.3/documents/invalid/lone-low-surrogate.json` and
      `corpus/1.2.3/documents/valid/surrogate-pair.json`. Each file is the minimal catalog with the
      `title` of the metadata that [D4] gives. Verify with `grep` that each file holds the six
      characters of each escape, because some editors decode an escape when they save. Verify, with
      `JSON.parse` and the schema validator of `loadSchema()` in `scripts/check-corpus.ts`, that each
      document conforms to the schema.
- [x] 2.2 Add the cases of [D4] to `corpus/1.2.3/cases.json`. Put the two `parse` cases directly
      after `parse/duplicate-key-escaped`. Each `parse` case has the category `parse-error` and a
      `notes` field that names the escape. Add the case `round-trip/surrogate-pair` with the
      document type `catalog`. Run `npm run corpus:write` to write `expected/surrogate-pair.json`, and
      verify that the file holds the character U+1F600 and no escape. Verify `npm run corpus:check`
      passes, and verify `npm run corpus:cases` leaves the cases in `cases.json`.

## 3. Sync, archive and integration

- [x] 3.1 Sync the deltas. In `openspec/specs/document-parsing/spec.md`, put PRS-023 directly below
      PRS-020. In `openspec/specs/error-model/spec.md`, replace ERR-004 with the delta. In
      `openspec/spec-ids.yaml`, set `next` of `PRS` to 24. Run `npm run requirements:write` and
      `npm run coverage:write`. Verify `npm run spec-ids`, `npm run requirements:check` and
      `npm run coverage:check` pass. Verify `openspec/coverage.json` lists the cases of 2.2 for
      PRS-023.01 to PRS-023.04 and ERR-004.07. Verify the description of PRS-023 and of ERR-004 has
      500 characters or fewer in the main specs.
- [x] 3.2 Verify `npm run version:check` and `npm run releases:check` pass with `VERSION` at
      `0.10.0+oscal.1.2.3`, which is the value that [VER-008] allows.
- [x] 3.3 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 3.4 Run `npm run check` with the pinned `openspec` binary. If `npm run templates:check` fails,
      run `npm run templates:write` and run `npm run check` again. Verify `npm run check` passes.

## Workflow follow-up

1. Close #157 with the pull request.
2. Add one comment to #142 with the two follow-ups of item 7 of Impact in the proposal.
3. The upgrade notes of the release state that a binding must scan the raw text of each JSON string
   for a lone surrogate escape, because a reader can replace the escape during the parse.
4. The next release holds this change. The version of the release is a break step above the latest
   release ([VER-003], [VER-008]). `VERSION` already holds that version, so it does not change.
   After the release, each binding gets a pin-move issue.

[D4]: design.md#d4-three-corpus-cases
[D5]: design.md#d5-parsestrict-rejects-a-lone-surrogate-escape
[D6]: design.md#d6-the-runner-checks-why-a-lone-surrogate-case-gives-a-parse-error
[D7]: design.md#d7-the-self-tests
[Risks]: design.md#risks--trade-offs
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
