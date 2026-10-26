## Why

OSCAL 1.2.3 has closed enums: an `enum` in an `allOf` with a base datatype. Only a value from the enum is valid. The
contract defines this kind in [MDL-011], and [ERR-001] maps a document that does not conform to the schema to the
parse-error category. But no requirement states the parse-time result for an enum value, and the corpus has no case
for it. A binding can therefore accept `how-many: "seven"` and still pass the corpus. The Python binding did this until
cairn-proofs/oscal-bindings-python#21. This change makes the rule explicit and tests it (#9).

## What Changes

1. Add a requirement to `document-parsing`. Parsing rejects a closed-enum value outside its set with the parse-error
   category. For an open enum, parsing accepts any valid value of the base datatype. The requirement states the result
   of [MDL-011] and [ERR-001] together. It adds no new rule.
2. Add three corpus cases to `corpus/1.2.3/`:
   1. A `parse` case: a minimal catalog with `how-many: "seven"`. The expected category is `parse-error`.
   2. A `round-trip` case: a minimal catalog with a hash algorithm that is not in the open enum, for example
      `BLAKE3`. The binding must accept and serialize it.
   3. A `validate-element` case: a `parameter-selection` element with `how-many: "seven"`. The expected result is not
      valid.
3. Release the spec artifact as `0.3.0+oscal.1.2.3`. This is a minor increment under [VER-003]: the change specifies
   behavior that the contract already implies and adds corpus cases. It is not a stricter parse rule.

No case carries a `known-defects` entry. The Python binding rejects out-of-set closed values since v0.3.0
(cairn-proofs/oscal-bindings-python#21 is closed). The TypeScript binding is a spike and does not run the corpus.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-parsing`: add one requirement for the parse result of open and closed enum values.

## Impact

1. `openspec/specs/document-parsing/spec.md`: one added requirement, after sync.
2. `corpus/1.2.3/`: three new input files, one new `expected/` file, and three new entries in `cases.json`.
3. `VERSION`: `0.2.0+oscal.1.2.3` to `0.3.0+oscal.1.2.3`.
4. Bindings: a binding that accepts an out-of-set closed value fails the new cases. The Python binding passes them at
   v0.3.1, from a check of its models. The Python binding pins `0.2.0+oscal.1.2.3` and runs the new cases only after
   it moves its pin.
5. No change to the naming manifest, the schemas, or the corpus tooling. `npm run corpus:check` already checks that
   the schema rejects each `parse` input and accepts each `round-trip` input.
