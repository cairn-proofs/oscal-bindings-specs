# Design

## Context

See [proposal.md, Why](proposal.md#why) for the motivation. These facts shape the approach:

1. `scripts/canonical-json.ts` has `parseStrict`. It parses JSON text and throws on a duplicate key.
   It compares decoded keys, so `"a"` and `"\u0061"` are the same key. `docs/canonical-json.md`
   uses it for comparison.
2. `scripts/check-corpus.ts` reads the input of a `parse` case with `JSON.parse`, which keeps the last
   value. It does this in two places: `documentInput` (the `parse` case) and the `parse` branch of
   the main check. A syntax error in either place is a pass for a case that expects a parse error.
3. `documentInput` returns `undefined` when its read throws. The coverage and constraint runners
   skip such a case.
4. The corpus case `yaml-parse/duplicate-key` uses a valid catalog. The key `title` occurs two times
   in the metadata, and each value is a valid string.
5. `npm run spec-ids` and `openspec validate --strict` limit the description of a requirement to 500
   characters. The description of [PRS-001] has 465 characters, so the new rule cannot join it.

## Goals / Non-Goals

**Goals:**

1. A corpus case that a binding which keeps one value of a duplicate key fails.
2. A store runner that agrees with the new requirement.

**Non-Goals:**

1. A change to the readers of the other operations in `scripts/check-corpus.ts`. Only the `parse`
   case has an input that can carry a duplicate key and still be expected to give a parse error.

## Decisions

### D1: A new requirement, PRS-020, directly below PRS-001

PRS-020 holds the rule. [PRS-001] stays as it is.

1. Alternative: add the rule as an item of [PRS-001]. This fails because of fact 5.
2. Alternative: put the rule next to [YML-003] in `yaml-documents`. This makes the YAML capability
   state a rule for JSON input. It also adds a dependency from the YAML capability to the parsing of
   JSON.

The requirement uses the term of [PRS-013]: a parse operation of [PRS-001], or an operation that the
contract defines through it. The file parser, the typed parsers and the facade construction then
meet the rule, and a binding cannot keep one value in one of them. The validity check of [ERR-002]
is not such an operation, so the requirement names it in a sentence. Scenario PRS-020.03 tests that
sentence, as PRS-015.03 tests the validity check for a constraint failure.

Reading order puts PRS-020 below PRS-001. It uses the next number of `PRS`, which is 20.

### D2: ERR-004 gets item 4 and the scenario ERR-004.06

The new item cites [PRS-020], as item 2 cites [YML-003]. The item goes last, so items 1 to 3 keep
their numbers. The existing scenarios keep their names.

### D3: Two corpus cases, with documents that a binding can read as valid

The documents are minimal catalogs. The case `parse/duplicate-key` repeats the key `title` in the
metadata. The case `parse/duplicate-key-escaped` writes the second key as `"\u0074itle"`. Each
value is a valid string. A binding that keeps the first or the last value then returns a document
value, and the case fails it. If a value were invalid, such a binding would still report a parse
error, and the case would not detect it.

The cases go directly after `parse/invalid-utf8`, outside the generated block of `cases.json`. The
case `parse/duplicate-key` cites PRS-020.01 and PRS-020.03. The case `parse/duplicate-key-escaped`
cites PRS-020.02. Both cite ERR-004.06. The corpus README already requires that the validity check
returns false for the input of each `parse` case, so the cases test PRS-020.03 with no change to it.

### D4: The runner reads `parse` input with `parseStrict`

`documentInput` and the `parse` branch use `parseStrict` for the input of a `parse` case. A throw
has the same result as a syntax error. `documentInput` returns `undefined`, and the `parse` branch
accepts the expected parse error.

Alternative: check the duplicate key in a separate step before `JSON.parse`. This reads the text
two times and adds a second code path with the same result.

### D5: The runner checks why a duplicate-key case gives a parse error

The `parse` branch accepts any read failure as the expected parse error (D4). A case of D3 would
also pass if its JSON syntax were wrong, if its duplicate were removed, or if its last value were
invalid. A binding that keeps one value would then pass the case, and the store checks would not
show it.

In the `parse` branch, a case that cites PRS-020.01 or PRS-020.02 gets a rule. The input must be
valid JSON for plain `JSON.parse`. `assertNoDuplicateKeys` must throw for it. The document that
`JSON.parse` returns must conform to the schema. The rule is a new function,
`duplicateKeyCaseProblem(text, isValid)`, that returns a message or `undefined`. The header comment
of `scripts/check-corpus.ts` states it as a part of check 5.

Alternative: read the document with the last value when `readJsonInput` throws, and fail the case if
the document is not valid. This does not find a syntax error or a removed duplicate.

### D6: The self-tests

1. `scripts/check-canonical-json.ts` gets the row `escaped duplicate key` in its list of inputs that
   `parseStrict` rejects. This covers PRS-020.02 for the reader.
2. `scripts/check-corpus.ts` gets a self-test case for `readJsonInput`. It throws for a text with a
   duplicate key and returns the value for a text without one.
3. `scripts/check-corpus.ts` gets a self-test case for each result of `duplicateKeyCaseProblem`. It
   gives `undefined` for a valid document with a duplicate key. It gives a message for a syntax
   error, for a text with no duplicate key, and for a duplicate-key document that is not valid.

The self-tests need no file in the corpus, because both functions take the text. The function
`readJsonInput(text)` calls `parseStrict`. `documentInput` and the `parse` branch call it.

## Risks / Trade-offs

1. [An existing `parse` document already holds a duplicate key, and now fails the runner] → Run
   `npm run corpus:check` after D4. A failure names the case. The case then needs a new document,
   because it expects a different result than before.
2. [A binding that keeps the last value fails the new cases] → This is the intent. Each binding
   gets a pin-move issue, and `VERSION` takes a minor step because of the break ([VER-003.03]).

[PRS-001]: ../../specs/document-parsing/spec.md#requirement-prs-001-parse-an-oscal-document-from-text-or-bytes
[PRS-013]: ../../specs/document-parsing/spec.md#requirement-prs-013-the-root-key-selects-the-document-type-of-the-parse-failures
[ERR-002]: ../../specs/error-model/spec.md#requirement-err-002-a-non-raising-validity-check-is-available
[YML-003]: ../../specs/yaml-documents/spec.md#requirement-yml-003-a-yaml-document-reads-as-a-json-value
[VER-003.03]: ../../specs/schema-versioning/spec.md#scenario-ver-00303-stricter-parse-rule-or-changed-error-category-is-a-break
