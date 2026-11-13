## Why

A back-matter resource can occur in more than one document, for example a reference that each SSP of
an organization cites. Each copy needs the same `uuid`, so that the references to the resource agree
across the documents ([#46]). [BMB-003] generates a fresh unique identifier when the caller omits
the identifier. Two documents that build the same resource thus get two identifiers.

A caller can compute a UUID version 5 and give it as the identifier. Each caller then picks its own
namespace and its own name, and two tools do not agree on the identifier of one resource. A binding
cannot add a shared derivation by itself, because [SRF-002] item 2 does not let a binding-local
operation decide the output.

The key adds two error situations. A binding that accepts an empty key, or that lets an identifier
win over a key, gives a resource and no error. The corpus can detect this only with an error
category. [BMB-001] to [BMB-003] report a validation error, and no category of [ERR-001] holds it.

## What Changes

1. [BMB-003] accepts an optional key. The builder generates a fresh identifier only when the caller
   omits both the identifier and the key. The other rules of [BMB-003] do not change.
2. Add [BMB-004] to `backmatter-builders`. When the caller gives a key and omits the identifier, the
   identifier is the UUID version 5 of the key. The namespace of the UUID is a value that the
   contract fixes. An empty key, or a key with an identifier, reports a validation error.
3. The Purpose of `backmatter-builders` states that a key gives one identifier to each copy of a
   resource.
4. A new document, `docs/back-matter-keys.md`, records the source of the namespace and gives
   guidance for the choice of a key. It has no normative rules.
5. [ERR-001] gets the category builder error. Add [ERR-013] to `error-model`. It puts each
   validation error of a back-matter builder in that category.
6. The corpus gets the operation `build-resource`, the category `builder-error`, and five cases.
   Three cases compare the identifier that the builder derives with an expected value. Two cases
   expect the builder-error category. `npm run corpus:check` computes each expected value without a
   binding.
7. **BREAKING** for a binding that reports a builder error as a parse error. The TypeScript binding
   does this, and its builders must then report the builder-error category. The release that
   carries the change is a minor increment, under the `0.y.z` rule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `backmatter-builders`: [BMB-003] accepts a key. [BMB-004] derives the identifier from the key.
2. `error-model`: [ERR-001] has the builder-error category. [ERR-013] maps builder validation errors
   to it.

## Impact

1. `openspec/specs/backmatter-builders/spec.md`: one new requirement, one modified requirement, and
   a changed Purpose.
2. `openspec/specs/error-model/spec.md`: one new requirement and one modified requirement.
3. `openspec/spec-ids.yaml`: in the sync commit, `BMB` `next` goes from 4 to 5, and `ERR` `next`
   goes from 13 to 14. `npm run requirements:write` adds the [BMB-004] and [ERR-013] entries to
   `openspec/requirements.json`.
4. `docs/back-matter-keys.md`: new. The spec artifact archive already includes `docs/`.
5. Corpus: the `build-resource` operation and its case fields in `corpus/1.2.3/README.md`, the
   `builder-error` category, and five new cases in `corpus/1.2.3/cases.json`.
6. `scripts/check-corpus.ts`: checks a `build-resource` case and the namespace.
7. Bindings: when a binding moves its pin, it adds these:
   1. The key input and [BMB-004] in its resource builder.
   2. The builder-error category, for each validation error of its back-matter builders. The
      TypeScript builders then no longer report a parse error.
   3. The `build-resource` operation in its conformance runner.
8. No change to the naming manifest, the schemas, or the CI workflow.

[#46]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/46
