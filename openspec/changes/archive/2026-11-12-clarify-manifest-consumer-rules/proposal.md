## Why

The TypeScript spike ([typescript#1], [spike report]) built types from the schema and `names.json` alone. It found no
gap in the manifest format. It found two places where the naming-manifest text can mislead a consumer ([#11]):

1. [NAM-010] item 4 records a "distinguishing property" for each union branch. A reader can take that property for a
   required tag. In 6 of the 13 unions of OSCAL 1.2.3 the property is optional: `CatalogGroup`, `ConfidenceScore`,
   `MetadataParty`, `ModifySetParameter`, `Parameter`, and `ProfileGroup`. So an object without the property conforms
   to each branch of its union. [MDL-006] permits this, but [NAM-010] does not state it.
2. [NAM-012.01] requires a consumer to reject a manifest whose format version it does not support. It does not say
   what the consumer reports. `manifest/names.schema.json` holds `"format": { "const": 1 }`. A consumer that applies
   the JSON Schema first reports a JSON Schema failure for a format 2 manifest, and never reports the unsupported
   format. The store does this too. `validateManifest` in `scripts/names-lib.ts` applies the JSON Schema first and
   returns its failures. The self-test of [NAM-012.01] expects a `[json-schema]` failure for `format` 2, so it tests
   the order that this change forbids.

Two bindings read the manifest now. Both apply the JSON Schema before they check `format`: the TypeScript spike
validator ([spike report], section 4) and `scripts/manifest.py` of the Python binding ([python#22]). Each new consumer
copies one reading of the text, so the text must state the intended reading.

## What Changes

1. Add [NAM-020]. The `property` member of a variant holds the distinguishing property of [MDL-006]. The branch can
   define that property as optional. An object that holds no distinguishing property can then conform to more than
   one branch. A scenario uses the `catalog:group` union.
2. Add [NAM-021]. Each manifest format is a JSON object with its format version in the top-level member `format`. A
   manifest that is not a JSON object, or that has no `format` member, is invalid.
3. **BREAKING** Add [NAM-022]. A consumer reads `format` before it applies a JSON Schema of [NAM-004]. A consumer that
   does not support the value rejects the manifest and states that the format version is not supported. The other
   validity checks apply only to a manifest of a supported format version.
4. Make the store meet items 2 and 3. `validateManifest` checks the input and `format` first. The self-test checks the
   reason of each failure.
5. Set `VERSION` to `0.8.0+oscal.1.2.3`. Item 3 is a break for a consumer that conforms now. Under the Semantic
   Versioning rule for `0.y.z` versions, the store makes such a break a minor increment. The changes
   `limit-parse-resources` (design.md, D8) and `select-document-type-by-root-key` (design.md, D6) made the same
   choice. The change does not tag a release. The next release carries it.
6. Change step 1 of "Change a requirement" in `CONTRIBUTING.md`. A change that needs a version increment sets
   `VERSION` to the version of the next release, also when no release follows at once.

The change sets no rule for these:

1. The branch type that a binding gives to an object that conforms to more than one branch.
2. The file name of the JSON Schema of a later manifest format.
3. The text of the report for an unsupported format version.
4. The format version of `overrides.json`. No binding reads that file.
5. How [NAM-008] compares names across two manifest formats.
6. A check of `VERSION` against the latest release tag, one place that documents `VERSION`, and a `0.y.z` rule in
   [VER-003]. Issue [#48] holds this work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `naming-manifest`: add [NAM-020], [NAM-021], and [NAM-022]. No existing requirement changes.

## Impact

1. `openspec/specs/naming-manifest/spec.md`: three new requirements.
2. `openspec/spec-ids.yaml` and `openspec/requirements.json`: in the sync commit, `NAM` `next` goes from 20 to 23, and
   `npm run requirements:write` adds the three entries.
3. `scripts/names-lib.ts` and `scripts/names.ts`: the order of the checks, and the self-test.
4. `VERSION` and `CONTRIBUTING.md`.
5. Bindings: when a binding moves its pin to the release that carries this change, its manifest consumer must check
   `format` first. This applies to `scripts/manifest.py` of the Python binding and to the validator of the TypeScript
   binding. Neither binding must change for item 1 of What Changes. Item 2 adds no failure for format 1, because
   `names.schema.json` already requires `format`.
6. No change to `names.json`, `overrides.json`, the JSON Schemas, the corpus, or the CI workflow.

[#11]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/11
[#48]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/48
[typescript#1]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/1
[spike report]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/1#issuecomment-6276224534
[python#22]: https://github.com/cairn-proofs/oscal-bindings-python/pull/22
