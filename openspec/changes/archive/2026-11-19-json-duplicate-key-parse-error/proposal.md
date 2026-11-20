# Proposal

## Why

The contract gives no result for a JSON input that has two members with the same key in one object
(#141). RFC 8259 does not call such an input invalid, so [ERR-004] item 1 does not cover it. The same
document as YAML is a parse error ([YML-003] item 1).

Common JSON readers keep one value and drop the other without an error. Python `json` and
JavaScript `JSON.parse` keep the last value. A reader can also keep the first value. The schema check
and the constraint check then see different documents in different bindings. For example, a part
with `{"name": "objective", "name": "bogus"}` fails an `allowed-values` entry in one binding and
passes in another.

## What Changes

1. A new requirement, PRS-020, states that a parse operation of [PRS-001], or an operation that the
   contract defines through it, reports a parse error for a JSON input that has two members with the
   same key in one object. Two keys are the same when their text is the same after JSON escapes are
   decoded. The validity check of [ERR-002] returns false for such an input. The requirement goes
   directly below [PRS-001].
2. The requirement [ERR-004] gets a new item 4. It adds the inputs that [PRS-020] rejects to the
   parse-error category. A new scenario, ERR-004.06, states the result.
3. Two new corpus cases, with a document each, expect the parse-error category. One document spells
   the key the same way two times. The other spells it once with an escape.
4. `scripts/check-corpus.ts` rejects a duplicate key in the input of a `parse` case. Without this, the
   store runner keeps the last value, validates the document, and disagrees with the expected
   parse error. The runner also checks the two cases of item 3. Each input must be valid JSON with a
   duplicate key, and the document must conform to the schema when it is read with the last value.
   Without this check, a later edit can break a case so that it no longer detects a binding that
   keeps one value, and the store checks still pass. A self-test case covers each rule.
5. **BREAKING**: `VERSION` goes to the next minor version, because the contract becomes stricter
   ([VER-003.03]). A binding that keeps one value of a duplicate key does not meet the contract after
   this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-parsing`: the requirement PRS-020 and its scenarios PRS-020.01 to PRS-020.03.
2. `error-model`: the requirement ERR-004 gets item 4 and the scenario ERR-004.06.

## Impact

1. `scripts/check-corpus.ts`: the strict read of item 4 of What Changes. The function
   `assertNoDuplicateKeys` of `scripts/canonical-json.ts` already does the check.
2. `corpus/1.2.3/cases.json` and `corpus/1.2.3/documents/invalid/`: the cases of item 3 of What
   Changes.
3. `openspec/coverage.json` and `openspec/requirements.json`: regenerated.
4. `docs/canonical-json.md`: no change. Step 1 already states that a duplicate object key is not
   valid input.
5. `VERSION`: `0.10.0+oscal.1.2.3`.
6. Bindings: a binding needs a JSON reader that detects a duplicate key, for example
   `object_pairs_hook` in Python `json`. This work goes to the pin-move issue of each binding.

[ERR-004]: ../../specs/error-model/spec.md#requirement-err-004-inputs-that-are-not-a-valid-document-are-a-parse-error
[YML-003]: ../../specs/yaml-documents/spec.md#requirement-yml-003-a-yaml-document-reads-as-a-json-value
[PRS-001]: ../../specs/document-parsing/spec.md#requirement-prs-001-parse-an-oscal-document-from-text-or-bytes
[ERR-002]: ../../specs/error-model/spec.md#requirement-err-002-a-non-raising-validity-check-is-available
[PRS-020]: specs/document-parsing/spec.md
[VER-003.03]: ../../specs/schema-versioning/spec.md#scenario-ver-00303-stricter-parse-rule-or-changed-error-category-is-a-break
