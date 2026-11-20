# Tasks

## 1. Strict read in the runner

- [x] 1.1 Add `readJsonInput(text)` to `scripts/check-corpus.ts`. It calls `parseStrict` of
      `scripts/canonical-json.ts`. Use it in `documentInput` (the `parse` case) and in the `parse`
      branch of the main check, in place of `JSON.parse` ([D4]). Verify `npm run corpus:check` passes.
      A failure names a `parse` case whose input holds a duplicate key ([Risks]).
- [x] 1.2 Add `duplicateKeyCaseProblem(text, isValid)` to `scripts/check-corpus.ts`, and call it in
      the `parse` branch for a case that cites PRS-020.01 or PRS-020.02 ([D5]). Add the rule to check
      5 of the header comment. Verify `npm run corpus:check` still passes.
- [x] 1.3 Add the self-tests of [D6]. In `scripts/check-corpus.ts`, add the cases for
      `readJsonInput` and for each result of `duplicateKeyCaseProblem`. In
      `scripts/check-canonical-json.ts`, add the row `escaped duplicate key` to the inputs that
      `parseStrict` rejects. Verify `npm run corpus:self-test` and `npm run canonical:self-test` pass.

## 2. Corpus cases

- [x] 2.1 Write the two documents of [D3] in `corpus/1.2.3/documents/invalid/`. The file
      `duplicate-key.json` is the JSON form of `yaml-duplicate-key.yaml`. The file
      `duplicate-key-escaped.json` is the same document, and it writes the second `title` key with
      the JSON escape for the letter `t`. Verify with `grep` that the second file holds the six
      characters of the escape, because some editors decode it when they save. Verify, with
      `JSON.parse` and the schema validator of `loadSchema()` in `scripts/check-corpus.ts`, that
      each document is valid when it is read with the last value.
- [x] 2.2 Add the cases `parse/duplicate-key` and `parse/duplicate-key-escaped` to
      `corpus/1.2.3/cases.json`, directly after `parse/invalid-utf8` ([D3]). Each case has the
      category `parse-error` and a `notes` field that names the repeated key. The case
      `parse/duplicate-key` cites PRS-020.01, PRS-020.03 and ERR-004.06. The case
      `parse/duplicate-key-escaped` cites PRS-020.02 and ERR-004.06. Verify
      `npm run corpus:check` passes, and verify `npm run corpus:cases` leaves the cases in
      `cases.json`.

## 3. Sync, version, archive and integration

- [x] 3.1 Sync the deltas. In `openspec/specs/document-parsing/spec.md`, put PRS-020 directly below
      PRS-001. In `openspec/specs/error-model/spec.md`, replace ERR-004 with the delta. In
      `openspec/spec-ids.yaml`, set `next` of `PRS` to 21. Run `npm run requirements:write` and
      `npm run coverage:write`. Verify `npm run spec-ids`, `npm run requirements:check` and
      `npm run coverage:check` pass, and verify `openspec/coverage.json` lists the case of 2.2 for
      PRS-020.01 to PRS-020.03 and ERR-004.06.
- [x] 3.2 Set `VERSION` to `0.10.0+oscal.1.2.3`, as the proposal states. Verify
      `npm run version:check` and `npm run releases:check` pass.
- [x] 3.3 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 3.4 Run `npm run check`. Verify it passes.

## Workflow follow-up

1. Close #141 with the pull request.
2. After the merge, tag the release `v0.10.0+oscal.1.2.3` on `main`. After the release, each binding
   gets a pin-move issue. The issue for a binding states that its JSON reader must detect a duplicate
   key, for example with `object_pairs_hook` in Python `json`.

[D3]: design.md#d3-two-corpus-cases-with-documents-that-a-binding-can-read-as-valid
[D4]: design.md#d4-the-runner-reads-parse-input-with-parsestrict
[D5]: design.md#d5-the-runner-checks-why-a-duplicate-key-case-gives-a-parse-error
[D6]: design.md#d6-the-self-tests
[Risks]: design.md#risks--trade-offs
