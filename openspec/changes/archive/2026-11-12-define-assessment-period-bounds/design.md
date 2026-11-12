## Context

See [proposal.md, Why](proposal.md#why) for the motivation. These facts constrain the approach.

1. [PRS-008] requires parsing to keep the instant, the offset, and each fraction digit of a datetime. [SER-005]
   requires serialization to keep them.
2. [SER-004] requires the canonical form of a serialized document to equal the canonical form of its input. The
   canonical form keeps the order of array items and sorts object keys
   ([Canonical JSON](../../../docs/canonical-json.md#rules)). Thus each binding keeps array order, and a binding can
   lose key order ([SER-004.02]).
3. The canonical form of a datetime writes a zero offset as `Z` and removes the trailing zeros of the fraction. It
   keeps every other offset as written ([Canonical JSON, Datetimes](../../../docs/canonical-json.md#datetimes)).
   `scripts/canonical-json.ts` exports this normalization as `normalizeDatetime`.
4. The source values of the period come from array items: the tasks of a plan and their nested tasks, and the results
   of Assessment Results. One task has one timing. A `within-date-range` sends its `start` only to the starts and its
   `end` only to the ends. Thus two keys of one object never give values for the same bound.
5. The Python binding returns `tuple[date | None, date | None]` from `assessment_period()`. It walks each task before
   its nested tasks.
6. The only `assessment-period` case is `assessment-period/catalog`, which expects `access-error`. For an
   `assessment-period` case, `npm run corpus:check` checks only that the input is not an Assessment Plan or Assessment
   Results.

## Goals / Non-Goals

**Goals:**

1. Give one bound for each input, so that all bindings return the same start and end.
2. Make the bounds testable in the corpus, with no binding in the store.

**Non-Goals:**

1. Corpus cases for [FAC-005.01] to [FAC-005.03], [FAC-006.01], or an empty bound. [FAC-007] does not change these
   rules.
2. The type that a binding uses for a datetime value. [PRS-008] already sets what the value keeps.
3. A change in a binding repository.

## Decisions

### D1. The bound rules are a new requirement after [FAC-005] and [FAC-006]

[FAC-007] states the rules once, for both document types, and it refers back to [FAC-005] and [FAC-006]. [FAC-004],
[FAC-005], and [FAC-006] keep their rules and change only the words "date" and "calendar date".

Alternative: put the rules in [FAC-004]. Its description then has more than 500 characters, and it mixes the access
rule with the value rules.

### D2. A bound is the datetime value of the document

A calendar date is the date of a datetime in some offset. Each choice of offset gives a different date for some input,
and the date loses the instant that [PRS-008] keeps. The datetime value has none of these problems. The caller can get
a calendar date from it in the offset that the caller needs.

Alternative: a calendar date in the offset of each value, as the Python binding returns. For the timings of
[FAC-007.01], it gives the start `2026-03-01`, which is the date of the later instant.

### D3. An equal instant gives the first value in document order

Two values with the same instant and different offsets are different values (Context item 3), so the rule must choose
one. Document order costs a binding nothing. Each binding already keeps array order (Context item 2), and Context
item 4 shows that key order never decides a bound. The accessor walks the values in document order and replaces the
bound only on a strictly earlier start or a strictly later end.

Alternative: let a binding return any value with that instant. Bindings then return different text for the same
input, and the corpus must compare this operation by instant, not by canonical form.

### D4. `expected-period` is a case field that the checker computes

`expected-period` is an object with the keys `start` and `end`. Each value is a datetime string in canonical form
(Context item 3). A conformance runner normalizes each bound of the binding in the same way and compares the strings.

For a case with `expected-period`, `npm run corpus:check` checks these:

1. The case has no `expected-category`.
2. The input is valid against the schema, and its root key is `assessment-plan` or `assessment-results`.
3. The checker computes the period by [FAC-005] to [FAC-007]. It walks the values in document order, and it compares
   instants with all fraction digits. It does not use the JavaScript `Date` type, which keeps only milliseconds. The
   canonical form of each computed bound equals the value in the field.

A case with `expected-category` keeps the check of Context item 6. The field has no form for an empty bound, because
no case of this change has one (Non-Goals 1).

Alternative: no checker computation, as for `expected-max-failures`. A count of entries depends on the binding, but a
period does not. The checker can compute it, so a wrong value in `cases.json` fails the store checks.

### D5. Three new inputs, one for each scenario of [FAC-007]

Each input is a minimal valid document written for the corpus. The values are in document order.

| Case | Input | Values | `start` | `end` |
|---|---|---|---|---|
| `assessment-period/mixed-offsets` | `assessment-plan-mixed-offsets.json` | task 1 on-date `2026-03-01T23:00:00-05:00`, task 2 on-date `2026-03-02T01:00:00Z` | `2026-03-02T01:00:00Z` | `2026-03-01T23:00:00-05:00` |
| `assessment-period/equal-instant` | `assessment-plan-equal-instant.json` | task 1 on-date `2026-03-01T12:00:00Z`, its nested task on-date `2026-03-01T07:00:00-05:00` | `2026-03-01T12:00:00Z` | `2026-03-01T12:00:00Z` |
| `assessment-period/seventh-fraction-digit` | `assessment-results-seventh-fraction-digit.json` | result 1 `2026-03-01T10:00:00.1234568Z` to `2026-03-01T11:00:00Z`, result 2 `2026-03-01T05:00:00.1234567-05:00` to `2026-03-01T06:00:00.0000001-05:00` | `2026-03-01T05:00:00.1234567-05:00` | `2026-03-01T06:00:00.0000001-05:00` |

The cases cite these identifiers:

1. `assessment-period/mixed-offsets`: [FAC-007.01]. A binding that returns calendar dates gives `2026-03-01` and
   `2026-03-02`.
2. `assessment-period/equal-instant`: [FAC-007.02]. A binding that walks nested tasks first, or that replaces a bound
   on an equal instant, returns the `-05:00` value for one bound or both.
3. `assessment-period/seventh-fraction-digit`: [FAC-007.03] and [FAC-006.01]. Both bounds come from result 2, which is
   second in document order. A binding that keeps six fraction digits sees two equal instants for each bound, and the
   rule of D3 then gives result 1.

### D6. The release is a minor increment, under the `0.y.z` rule

A binding that returns calendar dates fails the new cases. The store is at `0.8.0+oscal.1.2.3`, and Semantic
Versioning lets a `0.y.z` version change anything. The store made the same choice for [PRS-013].

## Risks / Trade-offs

1. [A conformance runner compares the text of a bound, not its canonical form] → `corpus/1.2.3/README.md` states
   that the runner normalizes each bound before it compares (D4).
2. [The checker computation has a fault] → Mutation tests change each expected bound, and the checker must fail each
   one. The review of `cases.json` checks each bound against the D5 table.

## Migration Plan

1. Sync the delta, and update the ledger and the requirement index. Change the checker and the corpus in the same
   pull request, with the archive of this change.
2. Release the next minor version.
3. Each binding moves its pin, reads `expected-period` in its conformance runner, and returns datetime bounds.
