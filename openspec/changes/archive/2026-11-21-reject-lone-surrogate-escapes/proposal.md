# Proposal

## Why

The contract gives no result for a JSON string that holds the escape of a lone surrogate, for
example `"\ud800"` (#157). RFC 8259 allows each `\u` escape of four hexadecimal digits, and it does
not require that a high surrogate escape comes before a low surrogate escape. The input is valid
JSON, so [ERR-004] item 1 does not cover it. The escape is ASCII, so [PRS-001.03] and [ERR-004.04]
do not cover it either. A lone surrogate is not a Unicode scalar value, and UTF-8 cannot encode it.

Common JSON readers give different results. Go `encoding/json` replaces the value with U+FFFD and
reports no error. JavaScript `JSON.parse` keeps the lone code unit. Python `json` keeps a lone
surrogate in a `str`, and the string then fails when a program encodes it as UTF-8. The schema check
and the constraint check then see different documents in different bindings. For example, a `title`
of `"\ud800"` can match a pattern in one binding and fail it in another.

The Dafny specification of #142 has the type `string` in its `Json` datatype. With the default
setting of Dafny 4, a `string` is a sequence of Unicode scalar values and cannot hold a lone
surrogate. This change makes every string of an accepted document a sequence of Unicode scalar
values, so each accepted document has a value in that type.

## What Changes

1. A new requirement, PRS-023, states that a parse operation of [PRS-001], or an operation that the
   contract defines through it, reports a parse error for a JSON input in which a string holds a
   lone surrogate escape. The validity check of [ERR-002] returns false for such an input. The
   requirement goes directly below [PRS-020].
2. The requirement [ERR-004] changes item 4 to "A JSON input that [PRS-020] or [PRS-023] rejects",
   and gets a new scenario, ERR-004.07, that states the result.
3. Three new corpus cases. Two `parse` cases expect the parse-error category, one for a lone high
   surrogate escape and one for a lone low surrogate escape. One `round-trip` case holds a valid
   surrogate pair, so that a binding cannot pass by rejecting each surrogate escape.
4. `scripts/canonical-json.ts` rejects a lone surrogate escape in `parseStrict`, and
   `scripts/check-corpus.ts` checks that the input of each lone-surrogate case holds that fault and
   no other. The check covers a syntax error, a duplicate key, a schema failure, and a constraint
   failure. Without this, the store runner keeps the lone surrogate, validates the document, and
   disagrees with the expected parse error. A self-test case covers each rule.
5. `docs/canonical-json.md`, step 1, adds the lone surrogate escape to the inputs that are not
   valid.
6. **BREAKING**: A binding that accepts a lone surrogate escape does not meet the contract after
   this change ([VER-003]).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-parsing`: the requirement PRS-023 and its scenarios PRS-023.01 to PRS-023.04.
2. `error-model`: the requirement ERR-004 changes item 4 and gets the scenario ERR-004.07.

## Impact

1. `scripts/canonical-json.ts`, `scripts/check-canonical-json.ts`, `scripts/check-corpus.ts`: the
   strict read of item 4 of What Changes, and its self-tests.
2. `corpus/1.2.3/cases.json`, `corpus/1.2.3/documents/`, `corpus/1.2.3/expected/`: the cases of item
   3 of What Changes.
3. `docs/canonical-json.md`: the sentence of item 5 of What Changes.
4. `openspec/coverage.json` and `openspec/requirements.json`: regenerated after the sync.
5. `VERSION`: no change. The version 0.10.0 on `main` is a break step above the latest release,
   v0.9.0, and no tag holds it ([VER-003], [VER-008]).
6. Each binding: a pin-move issue after the release. A binding needs a check of the raw text of each
   JSON string. A post-parse check does not work in every language. Go replaces the value with U+FFFD
   during the parse, and a literal U+FFFD in the input stays valid.
7. #142: two follow-ups for the Dafny work, which this change does not make. The build sets
   `--unicode-char=true` in place of relying on the default. The harness skips each case with the
   parse-error category before it converts a document to a Dafny value.

[ERR-002]: ../../specs/error-model/spec.md#requirement-err-002-a-non-raising-validity-check-is-available
[ERR-004]: ../../specs/error-model/spec.md#requirement-err-004-inputs-that-are-not-a-valid-document-are-a-parse-error
[ERR-004.04]: ../../specs/error-model/spec.md#requirement-err-004-inputs-that-are-not-a-valid-document-are-a-parse-error
[PRS-001]: ../../specs/document-parsing/spec.md#requirement-prs-001-parse-an-oscal-document-from-text-or-bytes
[PRS-001.03]: ../../specs/document-parsing/spec.md#requirement-prs-001-parse-an-oscal-document-from-text-or-bytes
[PRS-020]: ../../specs/document-parsing/spec.md#requirement-prs-020-a-json-object-has-no-two-members-with-the-same-key
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
