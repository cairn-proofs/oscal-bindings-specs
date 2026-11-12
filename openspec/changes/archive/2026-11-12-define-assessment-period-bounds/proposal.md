## Why

[FAC-004] says that the assessment-period accessor returns "a start date and an end date". [FAC-005] and [FAC-006]
require "the earliest start and the latest end". Each source value is a `DateTimeWithTimezoneDatatype` value. The
requirements do not state the form of a bound or the order that "earliest" and "latest" use. They also do not state
the bound when two values are equal in that order ([#43]).

Two bindings read the requirements differently. The Python binding returns calendar dates, each in the offset of its
source value. The TypeScript binding planned to order the values by instant and to return the source value
([typescript#11]). For the task timings `2026-03-01T23:00:00-05:00` and `2026-03-02T01:00:00Z`, the Python binding gives
the start `2026-03-01`, and the TypeScript plan gives the start `2026-03-02T01:00:00Z`. The corpus has only the case
`assessment-period/catalog`, so both bindings pass.

## What Changes

1. Add [FAC-007] to `document-facade`. It applies to each start and end of [FAC-005] and [FAC-006]:
   1. A bound is empty or a datetime value of the document, with the instant, the offset, and the fraction digits that
      [PRS-008] keeps.
   2. The order is the instant, with all fraction digits.
   3. When two or more values have the earliest or the latest instant, the bound is the first of them in document
      order. In document order, array items keep their order, and each item comes before the items that it holds.
2. [FAC-007] has three scenarios: mixed offsets, an equal instant in two offsets, and two values that differ only in
   the seventh fraction digit.
3. [FAC-004], [FAC-005], and [FAC-006] use "start", "end", and "datetime" where they now use "date" or "calendar date".
   Their rules do not change.
4. The corpus format gets the case field `expected-period` for an `assessment-period` case. It holds the expected start
   and end in the canonical datetime form of `docs/canonical-json.md`. `npm run corpus:check` computes the period of
   the input by [FAC-005] to [FAC-007], and compares it with the field.
5. Three new corpus cases, each with a new valid input, one for each scenario of [FAC-007]. Two inputs are Assessment
   Plans. One input is Assessment Results, so the rule is also tested through [FAC-006].
6. **BREAKING** for a binding that returns calendar dates. The Python binding fails the three new cases until it
   returns datetime values. The release that carries the change is a minor increment, under the `0.y.z` rule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-facade`: add [FAC-007]. [FAC-004], [FAC-005], and [FAC-006] use "datetime" for each bound.

## Impact

1. `openspec/specs/document-facade/spec.md`: one new requirement, and three modified requirements.
2. `openspec/spec-ids.yaml`: in the sync commit, `FAC` `next` goes from 7 to 8. `npm run requirements:write` adds the
   [FAC-007] entry to `openspec/requirements.json`.
3. Corpus: three new inputs in `corpus/1.2.3/documents/valid/`, three new cases in `corpus/1.2.3/cases.json`, and the
   new field and the changed `assessment-period` operation in `corpus/1.2.3/README.md`.
4. `scripts/check-corpus.ts`: reads and checks `expected-period`.
5. Bindings: each binding reads `expected-period` in its conformance runner when it moves its pin. The Python binding
   changes the return type of `assessment_period()` from `date` to its datetime type.
6. `README.md`: Known implementations lists `oscal-bindings-typescript`. This edit is not part of the contract
   change. It goes in the same pull request.
7. No change to the naming manifest, the schemas, or the CI workflow.

[#43]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/43
[typescript#11]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/11
