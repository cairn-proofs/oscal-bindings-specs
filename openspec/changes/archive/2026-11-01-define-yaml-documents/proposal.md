## Why

NIST publishes OSCAL in XML, JSON, and YAML. The contract defines JSON only. cairn-proofs/oscal-bindings-python#7
plans YAML support in the Python binding, and [SRF-001] blocks it until the contract defines YAML. YAML 1.1 implicit
typing reads an unquoted `version: 1.0` as a number and `yes` as a boolean. If each binding decides how to type a YAML
scalar, the bindings accept different documents. This change defines YAML input and output once for every binding
(#16).

## What Changes

1. Add the `yaml-documents` capability. A binding can choose to offer YAML. A binding that offers YAML conforms to the
   full capability.
2. Define the YAML input. The input is a YAML 1.2 stream in UTF-8 that holds exactly one document. Input that is not
   well-formed YAML 1.2, for example input with a duplicate mapping key, is a parse error.
3. Define the type of a scalar. The vendored schema decides the type at the location of the scalar. The YAML tag and
   the scalar style do not change the type. A scalar at a number or boolean location must match the JSON grammar for
   that type. The YAML null forms are text, so `remarks: null` gives the string `"null"`. An alias, a tag, or the key
   `<<` adds no meaning.
4. Define the YAML parse operations. They give the same result as the JSON parse operations for the JSON text that the
   scalar rule gives. In that text, each number token is the text of its scalar. The document-parsing requirements
   apply to them. A binding offers typed YAML parsers for all eight document types or for none.
5. A scalar whose text matches no grammar is a schema-conformance failure at its location, with a structured entry.
6. A binding can limit the resources that a YAML input uses, for example alias expansion. It documents each limit, and
   an input over a limit is a parse error.
7. Define the YAML serialize operation. The output must read back to an equivalent document. The binding chooses the
   style, the quoting, and the key order.
8. Change [ERR-001] so that invalid YAML input is in the parse-error category.
9. Change two `binding-surface` scenarios that use YAML as the example of an operation that the contract does not
   define. They use XML instead.
10. Add YAML corpus cases with two new operations, `yaml-round-trip` and `yaml-parse`. The cases include NIST YAML
   examples and edge cases for scalar typing. A binding that does not offer YAML does not run these operations.
11. Extend `npm run corpus:check` with a reference reader for YAML. The reader proves each YAML case with the vendored
   schema and the `yaml` package, so that the corpus does not depend on a binding.
12. Release the spec artifact as `0.5.0+oscal.1.2.3`. This is a minor increment under [VER-003], because the change
    adds an optional capability and new corpus cases.

## Capabilities

### New Capabilities

1. `yaml-documents`: YAML input, scalar typing, the YAML parse and serialize operations, and the rule that YAML
   support is optional.

### Modified Capabilities

1. `error-model`: [ERR-001] puts invalid YAML input in the parse-error category.
2. `binding-surface`: the examples in [SRF-001.02] and [SRF-002.02] use XML instead of YAML.

## Impact

1. `openspec/specs/yaml-documents/spec.md`: a new capability with the prefix `YML`, after sync.
2. `openspec/specs/error-model/spec.md` and `openspec/specs/binding-surface/spec.md`: changed requirements, after sync.
3. `openspec/spec-ids.yaml` and `openspec/requirements.json`: the new prefix and the new requirements, in the sync
   commit.
4. `corpus/1.2.3/`: new YAML input files in `documents/valid/` and `documents/invalid/`, new `expected/` files, new
   entries in `cases.json`, and the two new operations in `README.md`.
5. `scripts/`: a new reference reader for YAML, and new checks for the YAML operations in `scripts/check-corpus.ts`.
   The `yaml` package is already a dependency.
6. `VERSION`: `0.4.0+oscal.1.2.3` to `0.5.0+oscal.1.2.3`.
7. Bindings: no binding must change. A binding that offers YAML implements the new capability and runs the YAML
   cases. cairn-proofs/oscal-bindings-python#7 can start after it moves its pin to the new release. A binding that
   does not offer YAML only moves its pin.
8. `docs/canonical-json.md` names the yaml-documents spec as a user. The rules do not change, because YAML output is
   compared through its JSON value.
9. `README.md`: the new self-test in the check list.
10. No change to the naming manifest or the schemas.
