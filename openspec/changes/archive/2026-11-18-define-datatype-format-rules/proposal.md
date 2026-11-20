# Proposal

## Why

The contract does not say whether a binding enforces the `format` keywords of the vendored JSON
Schema (#66). Four datatypes carry one: `date-time`, `uri`, `uri-reference` and `email`. The store's
checker enforces them with `ajv-formats`. A binding that follows the draft-07 default treats them as
annotations. Libraries differ from each other. The same document is then valid in one binding and
invalid in another.

The `uri-reference` datatype has no pattern, so its `format` is the only rule. The values `a b`,
`%zz` and `http://[x` fail the format and pass without it. A malformed URI is also where parsers
disagree, and a consumer that filters on a URI then misreads it.

## What Changes

1. A new requirement, PRS-016, states that the patterns of the schema decide the validity of a
   value. A binding does not accept or reject a value because of the `format` keyword alone. A
   value that fails a datatype rule of the capability does not conform to the schema. Element
   validation and the builders apply the same rule.
2. A new requirement, PRS-017, states that a value of `URIDatatype` matches the production `URI` of
   RFC 3986, and a value of `URIReferenceDatatype` matches the production `URI-reference`. A binding
   rejects any other value and does not change it.
3. A new requirement, PRS-018, states that a value of `EmailAddressDatatype` holds no ASCII control
   character. The binding applies no other check of the format of an email address.
4. A new requirement, PRS-019, states that a value of `DateTimeWithTimezoneDatatype` matches the
   production `date-time` of RFC 3339. The pattern of the schema also applies. The pattern accepts
   the text `19-02-29T00:00:00Z`, which has no four-digit year.
5. The corpus gets cases for the four requirements. See [design.md, D3](design.md#d3-corpus-cases).
6. The store's checker stops asserting the `format` keywords with `ajv-formats`. A new script holds
   the rules of PRS-017, PRS-018 and PRS-019. See
   [design.md, D2](design.md#d2-a-reference-check-in-the-store).
7. The four `cannot-fail` reasons for `uri-reference` entries in
   `manifest/1.2.3/constraint-exclusions.json` cite the rule of PRS-017. They no longer cite the
   check of the store.
8. **BREAKING**: a binding that treats `format` as an annotation must now reject the values that
   PRS-017, PRS-018 and PRS-019 name. `VERSION` is already one minor step above the latest release, so it
   does not change ([VER-003], [VER-008]).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-parsing`: the requirements PRS-016, PRS-017, PRS-018 and PRS-019 and their scenarios.

## Impact

1. `openspec/specs/document-parsing/spec.md`: the four requirements, after the sync.
2. `scripts/check-corpus.ts`: the validator of `loadSchema` registers the four formats from the new
   script and no longer calls `addFormats`.
3. `scripts/datatype-rules.ts`: new, with a `--self-test` mode.
4. `corpus/1.2.3/cases.json`, `corpus/1.2.3/documents/` and `corpus/1.2.3/elements/`: the cases of
   [design.md, D3](design.md#d3-corpus-cases). `corpus/1.2.3/expected/` is regenerated. The text of
   `corpus/1.2.3/README.md` gets one sentence on schema conformance.
5. `manifest/1.2.3/constraint-exclusions.json`: the four reasons of item 7 of What Changes.
6. `openspec/coverage.json`, `openspec/requirements.json` and `openspec/spec-ids.yaml`: regenerated
   or updated at the sync.
7. Bindings: a binding that accepts a value of PRS-017, PRS-018 or PRS-019 does not meet the contract after
   this change.
8. `VERSION`: no change.

[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-008]: ../../specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
