# Design

## Context

See proposal.md, Why, for the two problems. These facts shape the approach:

1. All 13 unions of OSCAL 1.2.3 use `anyOf`, and each branch sets `additionalProperties: false`. In each union, the
   branches differ only in the distinguishing property. They define the same other properties and require the same
   other properties. [MDL-006] does not require this. It requires only a property that no other branch has.
2. The term "distinguishing property" occurs in [MDL-006], [MDL-021], [NAM-010], [NAM-004.03], and the store scripts.
   The JSON member that holds it is `property`. The spike report uses a third term, "variant property".
3. `manifest/names.schema.json` holds `"format": { "const": 1 }` and lists `format` as required. Design D4 of
   `define-names-manifest-format` states that a later format gets a new schema file and a new `format` value. No text
   names that file, and no requirement states where a later format holds its version.
4. Three consumers apply the JSON Schema before they check `format`. They are `validateManifest` in
   `scripts/names-lib.ts`, `scripts/manifest.py` of the Python binding ([python#22]), and the TypeScript spike
   validator ([spike report], section 4). The store calls `validateManifest` for the committed manifest of each
   release, and for the previous manifest of [NAM-016]. Two other store checks read a manifest after
   `validateManifest` or without it: the byte comparison of [NAM-006] in `scripts/names.ts`, and the name comparison
   of [NAM-008] in `scripts/check-releases.ts`.
5. OpenSpec limits the text of a requirement to 500 characters. [NAM-010] has 486 characters, so the new union text
   cannot go in [NAM-010].
6. `VERSION` is `0.7.0+oscal.1.2.3`, and `v0.7.0+oscal.1.2.3` is the latest tag. The commits after that tag change only
   tooling and CI. No check makes `VERSION` higher than the latest tag. `check-version.ts` checks the form and the
   schema directory. The tag check of `build.yml` compares the tag with `VERSION`.
7. [VER-003] item 1 makes a breaking change a major increment and has no rule for `0.y.z` versions. The changes
   `limit-parse-resources` (D8) and `select-document-type-by-root-key` (D6) made a break a minor increment under the
   Semantic Versioning `0.y.z` rule.

## Goals / Non-Goals

**Goals:**

1. One reading of the distinguishing property, with no change to the format.
2. One order of the manifest checks for each consumer, the store included.
3. A version record on `main` that shows that the next release is a breaking increment.

**Non-Goals:**

1. A rule for the branch type of an object that conforms to more than one branch. A nominal binding needs that rule.
   It is a parse rule, not a manifest rule.
2. A change to the format, to `names.json`, or to the JSON Schemas.
3. A change to the checks of `overrides.json`. No binding reads that file.
4. A rule for [NAM-008] across two manifest formats. The change that adds format 2 sets that rule.
5. A check of `VERSION` against the latest release tag, and one place that documents `VERSION`. Issue [#48] holds
   this work.
6. A change to [VER-003] for `0.y.z` versions. Issue [#48] holds this work too.

## Decisions

### D1. "Distinguishing property" stays the only term

[NAM-020] links the term to [MDL-006] and to the JSON member `property`.

1. **Alternative considered: "variant property".** It matches the JSON member `variants`. But it would replace the
   term in two capabilities and in the scripts, and the change would gain nothing in meaning. Rejected.
2. **Alternative considered: rename the member `property`.** That is a format change. Rejected.

### D2. The text states "can conform to more than one branch", not "conforms to every branch"

The issue proposes "an object with no variant property matches every branch". That is true for each union of 1.2.3
(Context, item 1), but [MDL-006] does not make it true for a later release. A later union can have branches that also
differ in other properties. The weaker statement follows from [MDL-006] alone, so it stays true for each release. The
scenario [NAM-020.01] uses `CatalogGroup`, where the stronger statement is also true.

### D3. The new rules are new requirements, not edits of [NAM-010] and [NAM-012]

Context item 5 rules out a longer [NAM-010]. The format rules state two behaviors. [NAM-021] states where each format
holds its version. [NAM-022] states the order of the consumer checks. Each gets its own requirement. [NAM-010] and
[NAM-012] do not change. [NAM-012.01] stays true, and [NAM-022.01] adds the reason that the consumer states.

The issue names [NAM-004] for the order rule. [NAM-004] states what the store publishes and checks, so the order rule
does not go there.

The store generation reads a manifest, so it is a consumer under the Purpose of `naming-manifest`. [NAM-022] therefore
applies to the checks of [NAM-016] with no change to [NAM-016].

### D4. A consumer checks `format` and stops. It does not select a schema

The issue proposes that a consumer reads `format` and then selects the JSON Schema for that format. That needs a file
name for each format, and Context item 3 shows that no text names one. A consumer that supports only format 1 does not
need the name of another schema. It needs only to reject the manifest with the correct reason. The change that adds
format 2 defines how a consumer finds its schema.

[NAM-021] makes the rule work for each later format. Without it, a later format could hold its version in another
member, and a format 1 consumer could not read it.

[NAM-022] stops only the validity checks: [NAM-003], [NAM-004], [NAM-012], and [NAM-013]. The checks of [NAM-006] and
[NAM-008] are not validity checks. They compare a manifest with another file, so they can still report a difference.
That keeps [NAM-004.01] consistent with [NAM-022]: the scenario applies to a manifest of a supported format.

1. **Alternative considered: name the files now, for example `names.format-2.schema.json`.** No format 2 exists, so
   the name would be a guess. Rejected.
2. **Alternative considered: change `format` to an integer in `names.schema.json`.** Then the JSON Schema would accept
   format 2 and report its other failures, which [NAM-022] forbids. It also changes a file of the format. Rejected.
3. **Alternative considered: stop every check of the store after an unsupported format.** Then `names.ts` and
   `check-releases.ts` would need a format check before each comparison, and [NAM-008] would need a rule across
   formats now. Rejected, with Non-Goals item 4.

The store implements the rules in `validateManifest`, before the JSON Schema check:

1. When the input is not a JSON object, or has no `format` member, return one `[manifest]` failure that states this
   ([NAM-021]).
2. When the value of `format` is not a supported format, return one `[manifest]` failure. The failure names the value
   and states that it is not supported ([NAM-022]).
3. Otherwise, continue as before.

The self-test gets one test for each new scenario: [NAM-021.01], [NAM-022.01], and [NAM-022.02]. The test labeled
`NAM-012.01 an unknown format fails` expects a `[json-schema]` failure, so it fails after item 2. The change replaces
it with the test for [NAM-022.01], in the same commit as the code. The test labeled
`NAM-003 other OSCAL release is rejected` tests [NAM-012.02], so the change corrects its label.

### D5. The rule is a MUST, and the change sets `VERSION` without a release

A consumer that conforms to [NAM-012] now can fail [NAM-022] after the change (Context, item 4). [VER-003] calls that
a major increment. The store follows the Semantic Versioning `0.y.z` rule for such a break, as Context item 7 shows,
so the next version is `0.8.0+oscal.1.2.3`.

The change sets `VERSION` in its own pull request and does not tag a release. Then `main` shows the increment to each
later change and to the person who makes the release. No check enforces it (Context, item 6), but `VERSION` is the
file that the release process reads and the tag must match. The `select-document-type-by-root-key` change did not set
`VERSION`, and a separate pull request (#37) set it for the release. Step 1 of "Change a requirement" in
`CONTRIBUTING.md` changes to match this decision. A change that needs an increment sets `VERSION` to the version of
the next release. The rule for a second change before the release, and a check that enforces it, are out of scope
(Non-Goals, item 5).

1. **Alternative considered: SHOULD for each consumer.** That is a patch, but the store would not follow its own
   text. Rejected.
2. **Alternative considered: MUST for the store, SHOULD for other consumers.** That is a patch, and it closes the gap
   of the store. The user chose one rule for each consumer.
3. **Alternative considered: record the increment only in tasks.md.** The person who makes the release does not read
   the archived tasks of each change. Rejected.

## Risks / Trade-offs

1. [A binding does not conform to [NAM-022] until it moves its pin] → No published manifest has a format other than 1.
   So no consumer can see the difference before a format 2 release. A binding updates its consumer when it moves its
   pin (proposal.md, Impact item 5).
2. [The release pull request lowers `VERSION`, for example to `0.7.1+oscal.1.2.3`] → No check stops it (Non-Goals,
   item 5). The CONTRIBUTING step and the pull request description of this change state the increment.
3. [A later change on `main` sets `VERSION` again before the release, for example to `0.9.0`] → No check stops a
   second increment (Non-Goals, item 5). The reviewer of that change compares `VERSION` with the latest release tag.
4. [A minor increment conflicts with the "breaking change" text of [VER-003]] → The store made the same choice in two
   changes (Context, item 7). A later change can add a `0.y.z` rule to [VER-003] (Non-Goals, item 6).
5. [A nominal binding needs a branch type for an object that conforms to more than one branch] → Non-Goals item 1.
   [NAM-020] states the case, so a binding author sees it.

## Migration Plan

No data migration. To roll back, revert the pull request. That restores `VERSION` to `0.7.0+oscal.1.2.3`.

[python#22]: https://github.com/cairn-proofs/oscal-bindings-python/pull/22
[#48]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/48
[spike report]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/1#issuecomment-6276224534
