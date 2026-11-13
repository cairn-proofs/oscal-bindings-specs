## Context

See [proposal.md, Why](proposal.md#why) for the motivation. These facts constrain the approach.

1. The OSCAL `uuid` datatype accepts a UUID of version 4 or version 5. Its pattern in the vendored
   schema is
   `^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[45][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$`.
2. OSCAL identifiers have per-subject consistency. An identifier changes only when its subject is no
   longer the same subject ([OSCAL identifier use, Consistency]). A title, an rlink `href`, or a
   hash can change while the subject stays the same.
3. The `back-matter` assembly has the index constraint `oscal-back-matter-resource-uuid-index` on
   `@uuid`, at the level ERROR. Two resources in one back-matter must not have the same `uuid`.
4. [BMB-001] to [BMB-003] report a "validation error". [ERR-001] requires each error situation to
   map to one category, but no category holds this error. The `categories` list in
   `corpus/1.2.3/cases.json` follows [ERR-001], and check 2 of `npm run corpus:check` fails a listed
   category that has no case.
5. The description of [ERR-001] has 495 characters, with whitespace normalized.
6. The corpus has no operation for a builder. Each existing operation reads an input file, except
   `element-types`.
7. `scripts/build-archive.ts` puts `docs/` in the spec artifact archive. `README.md` describes
   `docs/` as "shared rule documents that the specs cite".

## Goals / Non-Goals

**Goals:**

1. Give one identifier to one key in each binding and each tool that follows the contract.
2. Make the derived identifier and the errors of the key testable in the corpus, with no binding in
   the store.

**Non-Goals:**

1. Corpus operations for the hash and rlink builders. The error cases of `build-resource` give the
   builder-error category its case.
2. Detection of two resources with the same key in one back-matter. The builder builds one resource,
   and it does not see the other resources (Context item 3).
3. A change in a binding repository.

## Decisions

### D1. The key rule is a new requirement after [BMB-003]

[BMB-004] holds the derivation and its errors. [BMB-003] adds the key to its list of inputs, and
generates a fresh identifier only when the caller omits the identifier and the key. The scenario
heading of [BMB-003.01] keeps its words, and its WHEN clause names the key.

Alternative: put the derivation in [BMB-003]. Its description then has more than 500 characters.

### D2. The namespace is a fixed UUID in a domain that the project controls

The spec states the namespace `3942257f-e1cf-5e06-9c6f-eeb97ecabe77`. It is the UUID version 5 of
the URL `https://oscalregistry.org/ns/oscal/back-matter-resource` in the URL namespace of RFC 9562
(`6ba7b811-9dad-11d1-80b4-00c04fd430c8`). The spec states the UUID, not the URL. A binding then
needs no second derivation, and the URL is only the record of the source.

The path has these parts:

1. `oscal`: the standard. Another standard can have its own namespaces under `/ns/`.
2. `back-matter-resource`: the kind of object. A key then cannot give the same identifier to a
   resource and to an object of another kind.
3. No version. A version of OSCAL would give two identifiers to one resource in two OSCAL versions,
   and Context item 2 does not let the identifier change.

Alternatives:

1. A namespace from the NIST URI `http://csrc.nist.gov/ns/oscal`. NIST does not define a namespace
   UUID for OSCAL, and a namespace from its URI looks like a NIST standard. It also gives no
   separation between kinds of object.
2. A namespace from the repository URL. The URL changes when the organization or the repository
   changes its name.

### D3. The name is the key, as UTF-8 bytes

The name has no other input of the builder. The identifier then follows the subject that the caller
names, and not the content of one copy (Context item 2). [BMB-004.02] tests this. UTF-8 is the
encoding of OSCAL JSON text, and [BMB-004.03] fixes the bytes for a key that is not ASCII. The
contract applies no Unicode normalization to the key.

Alternative: a name from the content, for example the first rlink `href`, then a document
identifier, then the title. Each of these values can change while the subject stays the same.

### D4. A key with an identifier, or an empty key, is an error

A key and an identifier give two sources for one value. An error shows the conflict to the caller,
and a later version can let one input win with no break for a caller. An empty key is an error for
the same reason as an empty list in [BMB-003]. An empty key is almost always a fault of the caller.
Each such fault would give one identifier to unrelated resources.

Alternative: the identifier wins. A wrong key then has no effect that the caller can see.

### D5. Each validation error of a builder is in the builder-error category

[ERR-001] gets item 8, builder error, with no parent category. [ERR-013] puts each validation error
of [BMB-001] to [BMB-004] in it. The builder-error category closes the gap of Context item 4 for
all the builders. The corpus can then expect the category for [BMB-004.04] and [BMB-004.05].

The requirements of `backmatter-builders` keep the words "validation error". [ERR-013] maps that
error to the category, as [ERR-011] maps the error of [ELV-004]. The scenario headings
[BMB-001.03] and [BMB-003.03] thus keep their words.

The builder-error category has no parent. A builder reads values from the caller, not document
text, so the error is not a parse error.

With item 8, the description of [ERR-001] would have 513 characters (Context item 5). The phrase
"whether the language surfaces an error as an exception" becomes "whether the error is an
exception". The rule does not change, and the description has 492 characters.

Alternatives:

1. The name "build error". The store uses "build" for its CI check and for the archive build.
2. The name "validation error". A parse error already holds each schema-validation failure of a
   document ([ERR-004]). Element validation returns a result, not an error ([ELV-001]).
3. A case field that expects any error, with no category. The field then exists only because of
   the gap of Context item 4, and each binding still reports the error in its own form.
4. Builder error as a subcategory of parse error. A caller that catches a parse error then also
   catches a builder error, and D9 has no break. But a test for the parse-error category is then
   true for an error that no parse gives.

### D6. The key is a free string, and a document gives guidance

The contract does not restrict the form of a key. `docs/back-matter-keys.md` gives the guidance, and
the Purpose of `backmatter-builders` links to it. The document has these sections:

1. The purpose of a key: each copy of one resource, in any document, gets one identifier.
2. The namespace: the UUID, the URL, and the derivation of D2. The document states that
   `oscalregistry.org` is not a NIST site, and that the namespace has no OSCAL version.
3. The choice of a key:
   1. A key names the subject, not one copy or one revision of it. Examples are a URL of the
      subject, the number of a published standard, and an identifier that the organization assigns.
   2. Do not make a key from a title, an rlink `href`, a hash, or a document identifier of one
      revision.
   3. Start a key with a domain that the organization controls, so that two organizations do not use
      the same key for two subjects.
   4. Two resources in one back-matter must not have the same key (Context item 3).

`README.md` item 5 changes "shared rule documents" to "shared documents", because the new document
has no rules.

Alternative: a key must be an absolute URI. Two forms of one URI still give two identifiers, for
example two forms with a different case of the host. Only a normalization rule in the contract
prevents this.

### D7. `build-resource` is a corpus operation with inline arguments

A `build-resource` case has no `input`. It has these fields:

1. `arguments`: an object with these keys:
   1. `key`: a string. It is required.
   2. `title`: a string. It is optional.
   3. `identifier`: a string. It is optional.
2. One expected result:
   1. `expected-uuid`: the expected identifier, in lowercase.
   2. `expected-category`: `builder-error`.

The runner builds a resource with the arguments. It compares the `uuid` of the resource with
`expected-uuid`, or it checks that the builder reports `expected-category`. For a `build-resource`
case, `npm run corpus:check` checks these:

1. The case has `arguments`, and no `input`. `arguments` has only the keys of item 1.
2. The case has exactly one of `expected-uuid` and `expected-category`.
3. With `expected-uuid`, `arguments.key` is not empty, and `arguments` has no `identifier`. The
   checker computes the UUID version 5 of `arguments.key` with SHA-1 from `node:crypto`. It does not
   use a UUID library. The result equals `expected-uuid`.
4. With `expected-category`, the category is `builder-error`. Exactly one of these is true, so that
   the case has one fault:
   1. `arguments.key` is empty, and `arguments` has no `identifier`.
   2. `arguments.key` is not empty, and `arguments.identifier` matches the pattern of Context
      item 1.

The checker also checks the namespace once:

1. The UUID version 5 of the URL of D2 in the URL namespace equals the namespace of D2.
2. The text of [BMB-004] in `openspec/specs/backmatter-builders/spec.md` contains that namespace.
3. `docs/back-matter-keys.md` contains the URL and the namespace.

`builder-error` goes in the `categories` list of `cases.json`.

Alternative: an input file with the arguments. Each input file needs a case (check 3 of the
checker), and a new directory adds a rule for no gain.

### D8. Five cases

| Case | `arguments` | Expected | Cites |
|---|---|---|---|
| `build-resource/key` | `key` `https://example.org/policies/access-control` | `expected-uuid` `51beb3e9-30bb-535f-ba49-e68d4661aaa9` | [BMB-004.01] |
| `build-resource/key-with-title` | the same `key`, `title` `Access Control Policy` | `expected-uuid` `51beb3e9-30bb-535f-ba49-e68d4661aaa9` | [BMB-004.02] |
| `build-resource/non-ascii-key` | `key` `https://example.org/policies/données` | `expected-uuid` `daa01937-2576-5dc8-9fb0-4da240946a5e` | [BMB-004.03] |
| `build-resource/key-and-identifier` | the `key` of the first case, `identifier` `0c6b8f1e-4a2d-4b7e-9c3f-5d6e7f8a9b0c` | `expected-category` `builder-error` | [BMB-004.04], [ERR-013.02] |
| `build-resource/empty-key` | `key` the empty string | `expected-category` `builder-error` | [BMB-004.05] |

The `é` of the third key is U+00E9, which is `c3 a9` in UTF-8. A binding that hashes the key in
another encoding gives another identifier. The identifier of the fourth case is a valid UUID version
4. The only fault of the case is thus the key with an identifier.

### D9. The release is a minor increment, under the `0.y.z` rule

The change adds an input, two requirements, and a category. A caller that gives no key gets the same
resource. The change is breaking for the TypeScript binding. Its builders throw a `ParseError` in
the parse-error category (`src/backmatter.ts` of `oscal-bindings-typescript`), and [ERR-013] does
not let a builder error be a parse error. A TypeScript caller that catches a parse error from a
builder then catches nothing. [VER-003.03] names a major increment for a changed category, but
Semantic Versioning lets a `0.y.z` version change anything. The store made the same choice for
[FAC-007] and [PRS-013].

`VERSION` is `0.8.0+oscal.1.2.3`, and the latest release tag is `v0.7.0+oscal.1.2.3`. `VERSION`
thus already names the next minor release, so it does not change.

## Risks / Trade-offs

1. [Two organizations use one key for two subjects, so two subjects get one identifier] → The
   guidance of D6 item 3.3 says to start each key with a domain of the organization.
2. [The namespace in the spec has a typing error] → The namespace checks of D7 compare the spec text
   with the derivation from the URL.
3. [The checker computation has a fault] → The values of D8 come from Python `uuid.uuid5` and from
   an independent SHA-1 computation in Node, and the two agree. A mutation test changes each
   expected value, and the checker must fail each one.

## Migration Plan

1. Sync the deltas, change the Purpose, and update the ledger and the requirement index. Add the
   document, the checker change, and the cases in the same pull request, with the archive of this
   change.
2. Release `0.8.0+oscal.1.2.3`.
3. Each binding moves its pin, and adds the items of [proposal.md, Impact](proposal.md#impact)
   item 7.

[OSCAL identifier use, Consistency]: https://pages.nist.gov/OSCAL/learn/concepts/identifier-use/#consistency
