# Design

## Context

See [proposal.md, Why](proposal.md#why) for the motivation (#157). These facts shape the approach:

1. The grammar of RFC 8259 allows a `\u` escape of any four hexadecimal digits. A reader that
   follows only this grammar accepts `"\ud800"`. [ERR-004] item 1 ("not valid JSON") therefore does
   not cover it.
2. [PRS-020] has the same shape: valid JSON that readers treat in different ways. It is a
   requirement of `document-parsing`, an item of [ERR-004], a validity-check sentence for
   [ERR-002], two corpus cases, and a strict read in the store runner. This change follows it.
3. The text of [ERR-004] before its first scenario has 467 characters. A fifth item of the form
   "5. A JSON input that [PRS-023] rejects." adds about 40 characters and passes the limit of 500
   characters for a requirement.
4. The runner reads the input of a `parse` case with `parseStrict` of `scripts/canonical-json.ts`
   (`readJsonInput` in `scripts/check-corpus.ts`). `parseStrict` calls `JSON.parse`, which keeps a
   lone surrogate, and then `assertNoDuplicateKeys`. A `parse` case whose document conforms to the
   schema, and that the reader accepts, fails the runner with the message "parsing it is not an
   error".
5. The corpus README already requires that the validity check returns false for the input of each
   `parse` case. A `parse` case therefore tests PRS-023.04 with no change to the README.
6. In the Dafny specification of #142, a `string` is a sequence of Unicode scalar values under the
   default setting of Dafny 4. The specification has no value for a string with a lone surrogate.

## Goals / Non-Goals

**Goals:**

1. One result for a lone surrogate escape in each binding: a parse error.
2. A store runner that fails when a `parse` case for this rule does not isolate the fault.

**Non-Goals:**

1. A change to the YAML rules. A YAML double-quoted scalar can also hold the escape `\ud800`. The
   issue covers JSON input only.
2. A change to the Dafny files of #142. They are not on `main`.

## Decisions

### D1: A new requirement, PRS-023, directly below PRS-020

PRS-023 holds the rule. [PRS-001] stays as it is.

1. Alternative: add the rule to item 1 of [ERR-004] only. This fails because of fact 1. The input is
   valid JSON, so item 1 would be false as written.
2. Alternative: add an item to [PRS-001]. [PRS-020] already shows that a rule for a kind of JSON
   input has its own requirement, and [PRS-001] stays short.

The requirement uses the term of [PRS-020]: a parse operation of [PRS-001], or an operation that
the contract defines through it. The file parser, the typed parsers and the facade construction
then meet the rule. The validity check of [ERR-002] is not such an operation, so the requirement
names it in a sentence. Scenario PRS-023.04 tests that sentence.

Reading order puts PRS-023 below PRS-020. It uses the next number of `PRS`, which is 23.

### D2: The rule is about escapes in the input text, and it covers each JSON string

The requirement states the fault as an escape in the input, not as a property of the decoded value.
A Go reader replaces the escape with U+FFFD during the parse. A decoded value cannot tell this from
a literal U+FFFD in the input, which stays valid. A binding can detect the fault in the raw text in
every language, so the text is the stable place for the rule.

The rule says that a high surrogate escape needs a low surrogate escape immediately after it. In
`"\ud800abc\udc00"` a low surrogate escape follows the high one, but the two do not make a pair. A
high surrogate escape followed by a literal character, and the order low then high, are also lone
surrogates.

The requirement says "a JSON string", so it covers an object key. A key with a lone surrogate is
never a field name of the schema, so a binding reports a parse error for it in any case. The corpus
has no case for a key, because no case can isolate that fault from the schema fault.

### D3: ERR-004 changes item 4 and gets the scenario ERR-004.07

Item 4 becomes "A JSON input that [PRS-020] or [PRS-023] rejects." This adds 13 characters, which
gives about 480 characters, within the limit (fact 3). The new scenario goes last, and the existing
scenarios keep their names.

Alternative: a new item 5. This takes the text of [ERR-004] over the limit of 500 characters.

### D4: Three corpus cases

The documents are minimal catalogs with one string value that changes. The value is a `title` of
the metadata, so the document conforms to the schema when a reader keeps the lone surrogate. A
binding that keeps the lone surrogate then returns a document value, and the case fails it. If the
document were invalid in another way, such a binding would still report a parse error, and the case
would not detect it.

1. `parse/lone-high-surrogate` has the title `\ud800`. It cites PRS-023.01, PRS-023.04 and
   ERR-004.07.
2. `parse/lone-low-surrogate` has the title `\udc00`. It cites PRS-023.02 and ERR-004.07.
3. `round-trip/surrogate-pair` has the title `\ud83d\ude00` and the document type `catalog`. It
   cites PRS-023.03. Its expected file is the canonical form, which holds the character U+1F600.
   Without it, a binding that rejects each surrogate escape passes the two cases above.

The two `parse` cases go directly after `parse/duplicate-key-escaped`, outside the generated block
of `cases.json`. The documents are in `corpus/1.2.3/documents/invalid/` and
`corpus/1.2.3/documents/valid/`.

### D5: `parseStrict` rejects a lone surrogate escape

`parseStrict` gets a third step after `JSON.parse`. It reads the escape sequences of the text from
left to right. Each `\\` is one sequence, so `"\\ud800"`, an escaped backslash and the text
`ud800`, is not a surrogate escape. A high surrogate escape must be followed immediately by a low
surrogate escape, and a low surrogate escape must follow a high surrogate escape that it pairs with.
Because `readJsonInput` and `canonicalize` call `parseStrict`, a `parse` case with a lone surrogate
then has the same result as a syntax error: `documentInput` returns `undefined`, and the `parse`
branch accepts the expected parse error.

Alternative: check the decoded strings of the parsed value. `JSON.parse` keeps a lone surrogate, so
this works for the runner. It does not follow D2: the rule is about the text, and a check of the
text gives the same result for every reader.

[docs/canonical-json.md](../../../docs/canonical-json.md), step 1, says that a document with a
duplicate object key is not valid input. It gets the lone surrogate escape in the same sentence, so
the comparator rejects the inputs that `parseStrict` rejects.

### D6: The runner checks why a lone-surrogate case gives a parse error

The `parse` branch accepts any read failure as the expected parse error (D5). A case of D4 would
also pass if its JSON syntax were wrong, if its escape were removed, or if its document were
invalid in another way. A binding that keeps the lone surrogate would then pass the case, and the
store checks would not show it.

In the `parse` branch, a case that cites PRS-023.01 or PRS-023.02 gets a rule. The input must be
valid JSON for plain `JSON.parse`. The text must hold a lone surrogate escape by the rule of D5.
`assertNoDuplicateKeys` must not throw for it. The document that `JSON.parse` returns must conform
to the schema and meet the constraint manifest, so no other fault gives the parse error. The rule
is a new function, `loneSurrogateCaseProblem(text, isValid)`, that returns a message or
`undefined`. The caller builds `isValid` from the schema validator and the constraint check. The header comment
of `scripts/check-corpus.ts` states it as a part of check 5.

### D7: The self-tests

1. `scripts/check-canonical-json.ts` gets rows in its list of inputs that `parseStrict` rejects: a
   lone high surrogate escape, a lone low surrogate escape, a high surrogate escape followed by a
   literal character, and the order low then high. It gets rows in its list of inputs that parse:
   a surrogate pair, and an escaped backslash before `ud800`.
2. `scripts/check-corpus.ts` gets a self-test case for each result of `loneSurrogateCaseProblem`. It
   gives `undefined` for a conformant document with a lone surrogate escape. It gives a message for
   a syntax error, for a text with no lone surrogate escape, for a text with a duplicate key, for a
   document that does not conform to the schema, and for a document that fails a manifest entry.

## Risks / Trade-offs

1. [A binding that accepts a lone surrogate fails the new cases] → This is the intent. Each binding
   gets a pin-move issue, and `VERSION` needs no change ([VER-003.03], [VER-008]).
2. [A binding that has no access to the raw text cannot detect the fault] → A binding
   receives the input text or bytes before the parse, so it can scan them for the fault. The
   upgrade notes of the release state this.

[ERR-002]: ../../specs/error-model/spec.md#requirement-err-002-a-non-raising-validity-check-is-available
[ERR-004]: ../../specs/error-model/spec.md#requirement-err-004-inputs-that-are-not-a-valid-document-are-a-parse-error
[PRS-001]: ../../specs/document-parsing/spec.md#requirement-prs-001-parse-an-oscal-document-from-text-or-bytes
[PRS-020]: ../../specs/document-parsing/spec.md#requirement-prs-020-a-json-object-has-no-two-members-with-the-same-key
[PRS-023]: specs/document-parsing/spec.md#requirement-prs-023-a-json-string-has-no-lone-surrogate-escape
[VER-003.03]: ../../specs/schema-versioning/spec.md#scenario-ver-00303-stricter-parse-rule-or-changed-error-category-is-a-break
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
