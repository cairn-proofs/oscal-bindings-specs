# Tasks

## 1. Reference check in the store

- [x] 1.1 Write `scripts/datatype-rules.ts` as [D2] states. It exports `addDatatypeFormats` and has
      a `--self-test` mode. Add the script `datatype-rules:self-test` to `package.json`, and add it to
      `npm run check` before `corpus:self-test`. The self-test holds the examples of RFC 3986 and
      one value for each class of fault of [D3]. It includes `%zz` and `http://[x`, which the mode
      `fast` of `ajv-formats` accepts, and `19-02-29T00:00:00Z`. Verify
      `npm run datatype-rules:self-test` passes.
- [x] 1.2 In `scripts/check-corpus.ts`, `scripts/constraints-docs.ts` and `scripts/yaml-reader.ts`,
      call `addDatatypeFormats` in place of `addFormats`, and remove the import of `ajv-formats`.
      Remove `ajv-formats` from `package.json` and `package-lock.json`. Verify
      `grep -rn "ajv-formats" scripts package.json` prints nothing. Verify `npm run typecheck`,
      `npm run corpus:check`, `npm run corpus:self-test`, `npm run constraints:check`,
      `npm run constraints:self-test` and `npm run yaml-reader:self-test` pass.

## 2. Corpus cases

- [x] 2.1 Add the fifteen invalid inputs of [D3] to `corpus/1.2.3/documents/invalid/`. Each is a
      minimal catalog with one fault, except the input of
      `parse/uri-reference-and-constraint-failure`. Write each control character as the JSON
      escape `\t`, `\n`, `\u0001` or `\u007f`. Give the party of each email input an `addresses`
      member ([D3]). Add the fifteen `parse` cases to `corpus/1.2.3/cases.json` directly after the
      case `parse/datetime-without-timezone`, each with `expected-category` `parse-error`,
      `expected-min-failures` 1, `expected-max-failures` 1, and the scenario in `requirements`.
      Give `parse/uri-reference-and-constraint-failure` a `notes` field that states that the
      `priority` property alone gives three constraint failures, which is more than the maximum.
      Verify that `JSON.parse` reads each new input. Verify `npm run corpus:check` passes, and
      verify `npm run corpus:cases` leaves the cases in `cases.json`.
- [x] 2.2 Add `documents/valid/uri-forms.json` with the values of PRS-017.07, and
      `documents/valid/email-forms.json`. Add the cases
      `round-trip/uri-forms` and `round-trip/email-forms`. Run `npm run corpus:write`. Verify
      `corpus/1.2.3/expected/` holds the two canonical forms and `npm run corpus:check` passes.
- [x] 2.3 Add `elements/back-matter-rlink-href-space.json` and the case
      `element/back-matter-rlink-href-space`, with `element-type` `back-matter` and
      `expected-valid` `false`. Add the case
      `build-rlink/href-space`, with `arguments` `href` `a b` and `expected-category`
      `builder-error`. Verify `npm run corpus:check` passes.

## 3. Sync, archive and integration

- [x] 3.1 Sync the delta into `openspec/specs/document-parsing/spec.md`. Put PRS-016, PRS-019,
      PRS-017 and PRS-018 directly below `PRS-015`, in this order. In `openspec/spec-ids.yaml`, set
      `next` of `PRS` to 20. Run
      `npm run requirements:write` and `npm run coverage:write`. Verify `npm run spec-ids`,
      `npm run requirements:check` and `npm run coverage:check` pass, and verify
      `openspec/coverage.json` lists a corpus case for each scenario of PRS-016 to
      PRS-019.
- [x] 3.2 Change the reason of the four `uri-reference` entries in
      `manifest/1.2.3/constraint-exclusions.json` as [D4] states. Verify
      `npm run exclusions:check`, `npm run exclusions:self-test` and `npm run constraints:check`
      pass, and verify `git diff --stat manifest/` lists only `constraint-exclusions.json`.
- [x] 3.3 In `corpus/1.2.3/README.md`, add this sentence after the sentence "A case whose input does
      not conform to the schema has no `expected-constraints`.": "An input conforms to the schema
      only when each of its values also meets the datatype rules of PRS-016." Link PRS-016 as the
      other identifiers of the file are linked. Verify the link resolves in the main spec.
- [x] 3.4 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 3.5 Run `npm run check`. Verify it passes.

## Workflow follow-up

1. Close #66 with the pull request.
2. The next release holds this change. `VERSION` stays `0.9.0+oscal.1.2.3`. After the release, each
   binding gets a pin-move issue.

[D2]: design.md#d2-a-reference-check-in-the-store
[D3]: design.md#d3-corpus-cases
[D4]: design.md#d4-reasons-of-the-cannot-fail-entries
