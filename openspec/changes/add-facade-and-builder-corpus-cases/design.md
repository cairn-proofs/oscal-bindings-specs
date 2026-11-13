## Context

See [proposal.md, Why](proposal.md#why) for the motivation. These facts constrain the approach.

1. Each of the eight valid JSON documents in `corpus/1.2.3/documents/valid/` that has the name of its
   document type has a `round-trip` case. The expected file of that case is the canonical form of
   the document. `npm run corpus:check` confirms this.
2. The rules of [Canonical JSON for conformance comparison](../../../docs/canonical-json.md#rules)
   need no schema. A datetime is found by its object key. The rules thus apply unchanged to the JSON
   value of an element, for example a metadata block or a hash.
3. The vendored schema defines the hash algorithm as `anyOf` the string datatype and an enum of
   eight values. The string datatype has the pattern `^\S(.*\S)?$`. `SHA-999` is valid, and
   ` SHA-256` is invalid. A planning probe with ajv gave these results.
4. The schema has a definition for `hash` and for `document-id`. It has no top-level definition for
   an rlink or a resource. These are the item schemas of `resources` in the `back-matter`
   definition, and of `rlinks` in that resource schema.
5. A `back-matter-resource` with `"document-ids": [{ "identifier": "" }]` fails the schema at one
   location, `/document-ids/0/identifier`, with the keyword `pattern`. A planning probe gave this
   result.
6. Design D7 of the archived change `derive-resource-identifier-from-key` gave `build-resource`
   inline `arguments`. It rejected input files, because each input file needs a case, and a new
   directory adds a rule for no gain.
7. OpenSpec 1.15.0 refuses a MODIFIED block that drops a scenario. The archived change
   `split-long-requirements` (design D7) synced its main specs by hand for the same reason.
8. Both bindings throw the `TypeError` of their language for a value that is not a document
   wrapper. The TypeScript facade constructor has the parameter type `OscalDocument`, so the
   compiler already rejects most such calls.
9. `VERSION` is `0.8.0+oscal.1.2.3`, and the latest release tag is `v0.7.0+oscal.1.2.3`.

## Goals / Non-Goals

**Goals:**

1. Give each scenario that [#44] and [#45] name a corpus case that a binding runs, except the
   retired [FAC-001.02].
2. Let `npm run corpus:check` compute or confirm each expected value without a binding.

**Non-Goals:**

1. Cases for the text form of [FAC-003], for the named-algorithm form of [BMB-001], or for the
   `description` and `rlinks` inputs of [BMB-003]. No scenario that the issues name needs them.
2. A case that builds a resource twice to compare two generated identifiers.
3. A change in a binding repository.

## Decisions

### D1. [FAC-001] loses its rejection rule, and the sync is manual

[FAC-001] keeps its first two sentences. The sentence "The facade MUST reject a value that is not
an OSCAL document wrapper" and [FAC-001.02] leave the spec. A statically typed binding cannot
receive such a value (Context item 8). A dynamically typed binding can keep its `TypeError` as an
idiom of its language. No category of [ERR-001] then needs to hold it.

The MODIFIED block of [FAC-001] drops [FAC-001.02], so OpenSpec cannot apply it (Context item 7).
The sync edits `openspec/specs/` by hand, in one commit with the planning artifacts, as in the
archived change. `openspec archive` in a scratch copy then prints "Specs already in sync; no files
changed" as the test of the sync. `openspec/spec-ids.yaml` gets a `retired` entry for
[FAC-001.02], with no `replaced_by`.

Alternatives:

1. A type-error category in [ERR-001]. Only a dynamically typed binding can reach it, so it stays
   out of the `categories` list, as limit exceeded does. Both bindings must also change their error
   class for an error of the caller's program.
2. A statement that no corpus case checks [FAC-001.02]. No rule requires a case for each scenario,
   so the statement adds nothing. The error still has no category, against [ERR-001].

### D2. An algorithm is invalid only when the schema rejects the hash

[BMB-001] returns "a validated hash element", and [MDL-011] makes the algorithm an open enum. The
builder thus accepts each algorithm that the schema accepts (Context item 3). [BMB-001.03] gives
` SHA-256` as its example. [BMB-001.04] accepts `SHA-999`, so a binding that treats the list as
closed fails a case. [ERR-013.01] names an algorithm that the schema rejects. The headings of
[BMB-001.03] and [ERR-013.01] do not change.

Alternative: only the eight named algorithms are valid. A hash that a document holds, for example
in `open-enum-off-list.json`, then cannot be built again with the builder.

### D3. The `facade` operation compares with the expected file of the document

A `facade` case has an `input` and one of `expected` and `expected-category`. A case with
`expected` has a `document-type`.
`input-form` selects the construction:

1. Absent: parse the input with the generic parser, and wrap the result in the facade.
2. `bytes`: build the facade from the raw bytes of the input.
3. `path`: build the facade from the input path. This is a new value of `input-form`.

With `expected`, the runner reads the wrapper, the body, the metadata, the OSCAL version, and the
body identifier through the facade. Let `B` be the value of the `document-type` key of `expected`.
The checks are:

1. The canonical form of the wrapper is the same bytes as `expected`.
2. The canonical form of the body is the canonical form of `B` (Context item 2).
3. The canonical form of the metadata is the canonical form of the `metadata` of `B`.
4. The OSCAL version equals the `oscal-version` of that metadata, as a string.
5. The body identifier equals the `uuid` of `B`, as a string.

With `expected-category`, the category is `not-found`, the form is `path`, and the path does not
exist. The facade must report the category and name the path, as `parse-file` does.

`expected` is the file of the `round-trip` case of the same input (Context item 1). The corpus then
needs no new expected file.

Alternatives:

1. New fields `expected-uuid` and `expected-oscal-version` on a `facade` case. They copy values
   that `expected` already holds.
2. One operation for each form. Three operations then share one check.

### D4. The builder operations take inline arguments and an inline expected element

`build-hash` and `build-rlink` take inline `arguments`, as `build-resource` does (Context item 6).
A new field, `expected-element`, holds the JSON of the element that the builder returns. The runner
compares the canonical form of the JSON of the result with the canonical form of
`expected-element`. A builder case has exactly one expected result.

The arguments are:

1. `build-hash`: `value` (a string, required), and `algorithm` (a string).
2. `build-rlink`: `href` (a string, required), `media-type` (a string), and `hashes` (an array of
   hash objects).
3. `build-resource`: `key`, `title`, and `identifier` (each a string), and `document-ids` (an
   array of document-id objects). `key` becomes optional.

The expected results are:

1. `build-hash` and `build-rlink`: `expected-element` or `expected-category`.
2. `build-resource`: `expected-uuid`, `expected-element`, or `expected-category`. The existing
   `expected-uuid` cases do not change.

Alternative: an expected file under `expected/`. The element has few fields. A file adds a
`corpus:write` path, and each file needs a case, as an input file does in Context item 6.

### D5. A generated identifier is checked by its datatype

When the arguments of a `build-resource` case have no `key` and no `identifier`, `expected-element`
has no `uuid`. The runner checks that the `uuid` of the result matches the pattern of the UUID
datatype of the schema. It then removes `uuid` from the result and compares the rest with
`expected-element`. This is the check that [#45] item 3 asks for.

### D6. A nested argument reaches the builder without validation

The runner gives each item of `hashes` and of `document-ids` to the builder as the element of the
binding with the same JSON. The runner does not validate the item. The builder must report the error of an
invalid item ([BMB-003.03]). A runner that validates the item first reports a different error, or
no error from the builder. `corpus/1.2.3/README.md` states this rule.

### D7. The checker computes each expected element from the arguments

`npm run corpus:check` makes the element that the arguments give, and validates it with ajv:

1. Hash: `{ "algorithm": algorithm or "SHA-256", "value": value }`, against the `hash` definition.
2. Rlink: `href`, and `media-type` and `hashes` when present, against the rlink item schema of
   Context item 4.
3. Resource: `uuid` from `identifier`, and `title` and `document-ids` when present, against the
   resource item schema. With no `identifier`, the checker validates with a fixed UUID version 4
   and leaves `uuid` out of the comparison (D5).

With `expected-element`, the element is valid, and its canonical form equals the canonical form of
`expected-element`. A `build-resource` case with `expected-element` has no `key`.

With `expected-category`, the category is `builder-error`, and the case has exactly one fault:

1. `build-hash` and `build-rlink`: the element is not valid.
2. `build-resource`: one of these is true, and the others are false:
   1. `key` is empty, and there is no `identifier`.
   2. `key` is not empty, and `identifier` matches the UUID pattern.
   3. The element is not valid.

For a `facade` case, the checker confirms these:

1. `input-form` is absent, `bytes`, or `path`. Only a `facade` case has `path`.
2. The case has exactly one of `expected` and `expected-category`.
3. With `expected`, the input is valid against the schema, its only root key is `document-type`,
   `expected` is the expected file of a `round-trip` case, and `expected` is the canonical form of
   the input.
4. With `expected-category`, the category is `not-found`, the form is `path`, and the input does
   not exist.

Only a builder case has `arguments` and `expected-element`. Only a `build-resource` case has
`expected-uuid`.

### D8. The cases

The facade cases use the eight valid documents of Context item 1. Each cites [FAC-002.01] and
[FAC-002.02]. The others cite:

| Case | `input-form` | Expected | Also cites |
|---|---|---|---|
| `facade/catalog` | absent | `expected/catalog.json` | [FAC-001.01] |
| `facade/profile` | `bytes` | `expected/profile.json` | [FAC-003.01] |
| `facade/component-definition` | `path` | `expected/component-definition.json` | [FAC-003.02] |
| `facade/system-security-plan` | absent | `expected/system-security-plan.json` | [FAC-001] |
| `facade/assessment-plan` | absent | `expected/assessment-plan.json` | [FAC-001] |
| `facade/assessment-results` | absent | `expected/assessment-results.json` | [FAC-001] |
| `facade/plan-of-action-and-milestones` | absent | `expected/plan-of-action-and-milestones.json` | [FAC-001] |
| `facade/mapping-collection` | absent | `expected/mapping-collection.json` | [FAC-001] |

`facade/missing-file` has the input `documents/does-not-exist.json`, the form `path`, and the
category `not-found`. It cites [FAC-003.02] only.

Let `V` be the digest
`9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`, and `U` the identifier
`0c6b8f1e-4a2d-4b7e-9c3f-5d6e7f8a9b0c` of the existing case `build-resource/key-and-identifier`.

| Case | `arguments` | Expected | Cites |
|---|---|---|---|
| `build-hash/default-algorithm` | `value` `V` | `{ "algorithm": "SHA-256", "value": V }` | [BMB-001.01] |
| `build-hash/algorithm-string` | `value` `V`, `algorithm` `SHA-512` | `{ "algorithm": "SHA-512", "value": V }` | [BMB-001.02] |
| `build-hash/off-list-algorithm` | `value` `V`, `algorithm` `SHA-999` | `{ "algorithm": "SHA-999", "value": V }` | [BMB-001.04] |
| `build-hash/invalid-algorithm` | `value` `V`, `algorithm` ` SHA-256` | `builder-error` | [BMB-001.03], [ERR-013.01] |
| `build-rlink/reference-only` | `href` `https://example.org/policies/access-control.pdf` | `{ "href": ... }` | [BMB-002.01] |
| `build-rlink/media-type-and-hashes` | the same `href`, `media-type` `application/pdf`, `hashes` one SHA-256 hash of `V` | the three fields | [BMB-002.02] |
| `build-resource/generated-identifier` | `title` `Access Control Policy` | `{ "title": "Access Control Policy" }` | [BMB-003.01] |
| `build-resource/omitted-inputs` | `identifier` `U`, `title` `Access Control Policy` | `{ "uuid": U, "title": "Access Control Policy" }` | [BMB-003.02] |
| `build-resource/invalid-document-id` | `identifier` `U`, `document-ids` `[{ "identifier": "" }]` | `builder-error` | [BMB-003.03] |

`V` is the SHA-256 digest of the ASCII text `test`. The probes of Context items 3 and 5 confirm
that each element of the table is valid, and that each `builder-error` case has one fault.

### D9. `VERSION` does not change

The change removes one rule and states which algorithms are invalid. It adds no requirement and no
category. `VERSION` already names the next minor release (Context item 9), under the `0.y.z` rule.

## Risks / Trade-offs

1. [A runner validates a nested argument before the builder runs, and the case fails for the wrong
   reason] → D6 states the rule in the README. The case then fails visibly in that binding.
2. [A binding has no public operation that writes the JSON of a body or a metadata block] → The
   runner is test code of the binding, so it can use an internal means to write that JSON. The
   README does not name one.
3. [The checker computation of an expected element has a fault] → A mutation test changes each
   expected value and each fault, and the checker must fail each one.

## Migration Plan

1. Sync the deltas by hand (D1), and add the ledger entry. Add the checker change, the README
   change, and the cases. All of these go in one pull request, with the archive of this change.
2. Release `0.8.0+oscal.1.2.3`.
3. Each binding moves its pin and adds the items of [proposal.md, Impact](proposal.md#impact) item
   5.

[#44]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/44
[#45]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/45
