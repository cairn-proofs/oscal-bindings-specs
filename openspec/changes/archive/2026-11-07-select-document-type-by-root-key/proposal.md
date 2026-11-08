## Why

The contract does not say how a parse operation finds the document type of its input. A binding can try each of the
eight document types in turn. It then reports the failures of all eight. In the Python binding, one invalid control
`id` in the NIST SP 800-53 rev5 catalog gave 16 entries. 14 of them stated that the input is not some other document
type. Each entry held a copy of the document body, 349 MB in total after the raise ([python#42]). The same fan-out
made the parse 2× to 3× slower ([python#41]). The store's own validator shows the same fan-out. Ajv reports 16 to 18
errors for each single-fault input of the corpus, and 1 to 3 when it checks only the document type of the root key.

TypeScript, Rust, and Go bindings are planned. A zod union and a serde untagged enum try each member in the same way. A
contract rule keeps each binding from the fan-out, and corpus maximums make the rule testable.

## What Changes

1. Add [PRS-013] to `document-parsing`. The root key of a document type is the body field of its wrapper ([MDL-002]).
   The rule applies to the generic parse operation of [PRS-001] and to each operation that the contract defines
   through it. It does not apply to the typed parsers of [PRS-003].
   1. For an object whose root keys name exactly one document type, each entry of the parse error is a failure of that
      type.
   2. For an input that names no document type, the parse error states that, and it carries no failure of any
      document type.
2. Add the optional case field `expected-max-failures` to the corpus format: the highest number of structured entries
   that the parse error carries. `npm run corpus:check` checks that each value is consistent with [PRS-013].
3. Add `expected-max-failures` to eight existing `parse` cases: `parse/unknown-root` and the seven cases with one or two
   faults in one document type. The change adds no corpus input.
4. This change does not set `VERSION` and does not tag a release. The release that carries the change is a minor
   increment. A binding that reports the failures of more than one document type fails the new maximums.

The change sets no rule for these:

1. An object with two or more root keys. [PRS-004] already makes it a parse error.
2. The text of a message.
3. The form of the entry for an input that names no document type.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `document-parsing`: add [PRS-013].

## Impact

1. `openspec/specs/document-parsing/spec.md`: one new requirement.
2. `openspec/spec-ids.yaml`: in the sync commit, `PRS` `next` goes from 13 to 14. `npm run requirements:write` adds the
   [PRS-013] entry to `openspec/requirements.json`.
3. Corpus: eight changed cases in `corpus/1.2.3/cases.json`, and the new field in `corpus/1.2.3/README.md`.
4. `scripts/check-corpus.ts`: reads and checks `expected-max-failures`.
5. Bindings: each binding reads `expected-max-failures` in its conformance runner when it moves its pin. The Python
   binding meets [PRS-013] from [python#44] on, and each of the eight cases is within its maximum there. The change
   puts no maximum on `parse/closed-enum-out-of-set`, because that input fails in a nested union ([python#43]).
6. No change to the naming manifest, the schemas, or the CI workflow.

[python#41]: https://github.com/cairn-proofs/oscal-bindings-python/issues/41
[python#42]: https://github.com/cairn-proofs/oscal-bindings-python/issues/42
[python#43]: https://github.com/cairn-proofs/oscal-bindings-python/issues/43
[python#44]: https://github.com/cairn-proofs/oscal-bindings-python/pull/44
