# Design

## Context

See [proposal.md, Why](proposal.md#why) for the motivation (#66). These facts shape the approach:

1. The vendored schema has four `format` keywords. `DateTimeWithTimezoneDatatype` has `date-time`
   and a pattern. `URIDatatype` has `uri` and a pattern. `URIReferenceDatatype` has `uri-reference`
   and no pattern. `EmailAddressDatatype` has `email` and the pattern `^.+@.+$`.
2. The store calls `addFormats` of `ajv-formats` in three scripts: `scripts/check-corpus.ts`,
   `scripts/constraints-docs.ts` and `scripts/yaml-reader.ts`. `scripts/coverage-faults.ts` takes
   its validator from `loadSchema` in `scripts/check-corpus.ts`.
3. `ajv-formats` has two modes, and each is an approximation of the RFC. For `http://a.b/%`, the
   mode `full` rejects the value and the mode `fast` accepts it. The two modes also differ for
   `http://[::1` and for `c:\OSCAL`.
4. For `date-time`, the pattern is stricter than the format for each value with a four-digit year.
   A check of 7,231,374 such values found none that the pattern accepts and the format rejects. The
   pattern also accepts one date with a two-digit year, `19-02-29`, with any time and offset. The
   format rejects it. The leap-year branch of the pattern allows the two characters `19` as a whole year.
5. The pattern of `DateTimeWithTimezoneDatatype` rejects 29 February of the leap years 1904 to 1996.
   Upstream tracks the defect in [usnistgov/metaschema#849] and [usnistgov/metaschema-xslt#125].
6. A check of the 43 non-minified JSON files of `usnistgov/oscal-content` found 44,683 values of
   `href`, `source`, `ns` and `system`. None of them has a space, a control character, a backslash,
   a non-ASCII character or an invalid escape, and `ajv-formats` in mode `full` accepts each one.
7. `npm run validate` runs `openspec validate --all --strict`. Strict validation fails for a
   requirement description longer than 500 characters.

## Goals / Non-Goals

**Goals:**

1. The same verdict in each binding for each value of the scenarios of PRS-016 to
   PRS-019.
2. A store checker that does not depend on the approximation of a library.

**Non-Goals:**

1. A rule for how a consumer fetches or renders a URI. A value that meets PRS-017 can name any
   scheme or host. A consumer that acts on a URI applies its own check.
2. A change to a vendored schema file.

## Decisions

### D1. Four requirements in document-parsing

The rules go in `document-parsing` as PRS-016 to PRS-019. [PRS-008] and [PRS-009] already
hold the rules for datatype values and enum values. [PRS-009] states that element validation
applies the same rules. PRS-016 states the same for element validation and for the builders. The
builders already apply the schema to the element that they return ([BMB-002]), so they need no
other change.

PRS-016 holds the general rule, and it comes first. PRS-017, PRS-018 and PRS-019 are the rules for
the four datatypes. The pattern of `DateTimeWithTimezoneDatatype` accepts a two-digit year, so
PRS-019 adds the grammar of RFC 3339. The pattern still decides each leap day, so a leap day of
1904 to 1996 stays invalid.

PRS-016 also states that a value that fails a datatype rule does not conform to the schema. Without
this statement, [PRS-006], [PRS-015] and [ERR-002] can treat a datatype fault as a schema failure
or as no failure, because the `format` keyword is not normative. The statement gives one reading.
The corpus case `parse/uri-reference-and-constraint-failure` shows it.

The sync places the four requirements directly below [PRS-015], in the order PRS-016, PRS-019,
PRS-017 and PRS-018. The scenario PRS-016.03 uses terms of [PRS-006] and [PRS-015], so the
requirements go below them.

### D2. A reference check in the store

A new script, `scripts/datatype-rules.ts`, holds the rules and one function, `addDatatypeFormats`.
The function registers four formats on an ajv instance:

1. `uri`: accepts a string that matches the production `URI` of RFC 3986.
2. `uri-reference`: accepts a string that matches the production `URI-reference`.
3. `email`: accepts a string that holds no ASCII control character.
4. `date-time`: accepts a string that matches the production `date-time` of RFC 3339.

The three scripts of item 2 of [Context](#context) call `addDatatypeFormats` in place of
`addFormats`. The package `ajv-formats` leaves `package.json`.

The script builds one regular expression for each production by composing the productions of the
ABNF in appendix A of RFC 3986. It adds no dependency. A library for this check would be a second
approximation, as item 3 of [Context](#context) shows. The self-test of the script holds the
examples of RFC 3986, and one value for each class of fault of [D3](#d3-corpus-cases).

### D3. Corpus cases

Each invalid input is a minimal catalog with one fault, except the input of
`parse/uri-reference-and-constraint-failure`, which has a second fault that a constraint rejects.
Each parse case expects a parse error with one structured entry, so it sets both
`expected-min-failures` and `expected-max-failures` to 1. The party of each email input holds an
`addresses` member, so that [PRS-014] selects one branch of the union and a binding reports the
fault once.

| Case | Operation | Fault | Scenario |
|---|---|---|---|
| `parse/uri-reference-space` | parse | `href` is `a b` | PRS-017.01 |
| `parse/uri-reference-invalid-escape` | parse | `href` is `%zz` | PRS-017.02 |
| `parse/uri-reference-open-bracket` | parse | `href` is `http://[x` | PRS-017.03 |
| `parse/uri-reference-trailing-space` | parse | `href` is `#a` and a space | PRS-017.04 |
| `parse/uri-reference-control-character` | parse | `href` holds a tab | PRS-017.05 |
| `parse/uri-space` | parse | `ns` is `http://exa mple.org` | PRS-017.06 |
| `parse/uri-no-path-after-scheme` | parse | `ns` is `http:` | PRS-017.13 |
| `parse/uri-reference-non-ascii` | parse | `href` is `http://é.example/` | PRS-017.10 |
| `parse/uri-reference-backslash` | parse | `href` is `/a\b` | PRS-017.11 |
| `parse/uri-reference-trailing-line-feed` | parse | `href` is `#a` and a line feed | PRS-017.12 |
| `parse/email-control-character` | parse | email address holds U+0001 | PRS-018.01 |
| `parse/email-delete-character` | parse | email address holds U+007F | PRS-018.03 |
| `parse/datetime-lowercase-zone` | parse | `last-modified` is `2026-01-01T00:00:00z` | PRS-016.02 |
| `parse/datetime-two-digit-year` | parse | `last-modified` is `19-02-29T00:00:00Z` | PRS-019.01 |
| `parse/uri-reference-and-constraint-failure` | parse | `href` is `a b`, and a `priority` property fails a constraint | PRS-016.03 |
| `round-trip/uri-forms` | round-trip | ten valid `href` values and two `ns` values | PRS-017.07 |
| `round-trip/email-forms` | round-trip | `a@b` and `用户@例子.广告` | PRS-016.01, PRS-018.02 |
| `element/back-matter-rlink-href-space` | validate-element | `back-matter` with an rlink `href` of `a b` | PRS-017.08 |
| `build-rlink/href-space` | build-rlink | `href` is `a b` | PRS-017.09 |

The eight `uri-reference` faults have different grammar errors. A binding that uses a library
approximation can accept some of them. The mode `fast` of `ajv-formats` accepts `%zz`,
`http://[x`, the non-ASCII value and the backslash value.

The checker has no schema for an rlink alone. It checks an element only through a top-level
definition of the schema, and the rlink is an item schema of `back-matter`. The element case
therefore uses the type `back-matter`.

Two cases use a value that the grammar accepts and the pattern rejects: `2026-01-01T00:00:00z` and
`http:`. A binding that drops the pattern accepts them, and the cases detect it.

### D4. Reasons of the cannot-fail entries

The reason of each of the four `uri-reference` entries in
`manifest/1.2.3/constraint-exclusions.json` says that the schema check of the store rejects each
value that the pattern rejects. The reason now names the rule of PRS-017. The grammar of RFC 3986
allows no white space, so a value that the pattern rejects also fails the schema. The entries stay
in the list `cannot-fail`. The file `constraints.json` holds no reasons, so it does not change.

## Risks / Trade-offs

1. [Risk] A binding implements the grammar with a library that accepts a value that the grammar
   rejects. → The corpus has one case for each class of fault of [D3](#d3-corpus-cases).
2. [Risk] A document of another source has a URI with a space or a non-ASCII character. The
   contract rejects it, and the binding does not repair it. → The parse error identifies the field.
   The NIST content of item 6 of [Context](#context) has no such value.
3. [Trade-off] The production `URI-reference` accepts the empty string. The store accepts it today.
   The XSD pattern of the datatype rejects it. The contract follows the JSON Schema.
4. [Risk] The pattern of `DateTimeWithTimezoneDatatype` rejects a valid leap day of 1904 to 1996.
   The contract follows the pattern, so the value is invalid. → A later OSCAL release can replace
   the pattern. The vendored schema then changes, and the corpus cases of [D3](#d3-corpus-cases) do
   not depend on a leap day.

[PRS-014]: ../../specs/document-parsing/spec.md#requirement-prs-014-a-distinguishing-property-selects-the-nested-union-branch-of-parse-failures
[PRS-006]: ../../specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[PRS-015]: ../../specs/document-parsing/spec.md#requirement-prs-015-a-constraint-failure-is-a-parse-failure-that-names-its-constraint
[ERR-002]: ../../specs/error-model/spec.md#requirement-err-002-a-non-raising-validity-check-is-available
[PRS-008]: ../../specs/document-parsing/spec.md#requirement-prs-008-timezone-aware-datetimes-are-enforced-where-oscal-requires-them
[PRS-009]: ../../specs/document-parsing/spec.md#requirement-prs-009-enum-values-are-checked-by-the-kind-of-the-enum
[BMB-002]: ../../specs/backmatter-builders/spec.md#requirement-bmb-002-build-a-back-matter-rlink-value
[usnistgov/metaschema#849]: https://github.com/usnistgov/metaschema/issues/849
[usnistgov/metaschema-xslt#125]: https://github.com/usnistgov/metaschema-xslt/issues/125
