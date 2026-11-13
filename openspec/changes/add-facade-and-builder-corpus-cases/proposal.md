## Why

The corpus has no case for [FAC-001] to [FAC-003] ([#44]), or for [BMB-001] to [BMB-003] ([#45]).
It has no operation that builds the facade and reads a field from it, and no operation for the hash
builder or the rlink builder. A binding can thus pass the corpus and still differ from another
binding in these scenarios.

Three scenarios also have a fault that a case alone does not correct:

1. [FAC-001.02] requires a type error for a value that is not a document wrapper. No category of
   [ERR-001] holds a type error. A statically typed binding cannot receive such a value, because
   its compiler rejects the call. Both bindings report the error of their language, not an error of
   the taxonomy.
2. [BMB-001.03] requires a validation error for "an algorithm value that OSCAL does not define".
   [MDL-011] makes the hash algorithm an open enum, so each value of the string datatype is valid,
   for example `SHA-999`. The TypeScript builder accepts `SHA-999`, and the Python builder rejects
   it. [ERR-013.01] uses the same words.
3. [BMB-003.01] requires a generated identifier. The value is different for each call, so a case
   cannot compare it with a fixed value.

## What Changes

1. [FAC-001] no longer requires the facade to reject a value that is not a document wrapper.
   [FAC-001.02] is retired. The type of the argument is a matter of the language of each binding.
2. [BMB-001] states that the builder accepts each algorithm that the schema accepts, and that input
   is invalid when the schema rejects the hash. [BMB-001.03] and [ERR-013.01] name an algorithm that
   the schema rejects. A new scenario, [BMB-001.04], accepts an algorithm that is not a named
   algorithm.
3. The corpus gets the operation `facade`. A case builds the facade from a valid document, as a
   parsed document, as bytes, or as a file path. The case then compares the wrapper, the body, the
   metadata, the OSCAL version, and the body identifier with the expected file of the document.
   There is one case for each of the eight document types, and one case for a missing path.
4. The corpus gets the operations `build-hash` and `build-rlink`. The operation `build-resource`
   gets the argument `document-ids`, and its key becomes optional. A new field, `expected-element`,
   holds the element that a builder returns. For a generated identifier, the runner checks the
   identifier against the UUID datatype and compares the other fields.
5. `npm run corpus:check` checks each new case without a binding.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-facade`: [FAC-001] loses its rejection rule and [FAC-001.02].
2. `backmatter-builders`: [BMB-001] states which input is invalid, and gets [BMB-001.04].
3. `error-model`: [ERR-013.01] names an algorithm that the schema rejects.

## Impact

1. `openspec/specs/document-facade/spec.md`, `openspec/specs/backmatter-builders/spec.md`, and
   `openspec/specs/error-model/spec.md`: one modified requirement each.
2. `openspec/spec-ids.yaml`: in the sync commit, a `retired` entry for [FAC-001.02]. The `next`
   numbers do not change, because the change adds no requirement. `openspec/requirements.json` does
   not change, because no requirement title changes.
3. Corpus: the operations, the input form, and the case fields in `corpus/1.2.3/README.md`, and the
   new cases in `corpus/1.2.3/cases.json`. The `categories` list does not change.
4. `scripts/check-corpus.ts`: checks the new operations and fields.
5. Bindings: when a binding moves its pin, it adds these:
   1. The `facade`, `build-hash`, and `build-rlink` operations, and the new `build-resource`
      arguments, in its conformance runner.
   2. A hash builder that accepts each algorithm that the schema accepts. The Python builder rejects
      `SHA-999` at planning time.
   3. The TypeScript facade work of cairn-proofs/oscal-bindings-typescript#20 and the builder work
      of cairn-proofs/oscal-bindings-typescript#12 can use the corpus cases.
6. No change to the naming manifest, the schemas, the error categories, or the CI workflow.

[#44]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/44
[#45]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/45
