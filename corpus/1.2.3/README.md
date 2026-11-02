# Conformance corpus for OSCAL 1.2.3

A binding conforms when it gives the expected result for each case in `cases.json`, except a case that names the
binding in its `known-defects`. Every binding runs the same corpus.

## Layout

1. `cases.json`: the case index. Each case names an operation, an input, and an expected result.
2. `documents/valid/`: valid OSCAL documents, one or more for each of the eight document types. A `.json` file is a
   JSON input, and a `.yaml` file is a YAML input.
3. `documents/invalid/`: documents that a binding must reject. Each is a minimal document with one fault. The JSON
   inputs are minimal catalogs. A YAML input is a minimal document of the type that its fault needs.
4. `elements/`: standalone OSCAL elements for element validation.
5. `expected/`: the canonical form of each `round-trip` and `yaml-round-trip` input. `npm run corpus:write` generates
   these files. Do not edit them.

## Cases

Each case has these fields:

1. `id`: a unique name.
2. `operation`: the operation to run, from the list in [Operations](#operations).
3. `input`: the input path, relative to this directory.
4. `requirements`: the requirement and scenario identifiers that the case tests.
5. One expected result:
   1. `expected`: the path of the expected canonical form, for a round trip.
   2. `expected-category`: the error category, from the `categories` list. The categories are the taxonomy of the
      error-model capability.
   3. `expected-valid`: `true` or `false`, for element validation.
6. Optional fields:
   1. `document-type`: the root key of the document type, for a round trip or a typed parse.
   2. `element-type`: the element-type name, for element validation.
   3. `input-form`: `bytes` when the input must reach the binding as raw bytes, not as text.
   4. `expected-min-failures`: the lowest number of structured failure entries that the parse error carries.
   5. `source`: the repository, commit, path, and `sha256` of a document copied from another repository.
   6. `known-defects`: each binding that is known to fail the case, with its issue URL and the observed behavior.
   7. `notes`: an explanation for people. For a `yaml-parse` case, the notes name the fault code of the reference
      YAML reader in backticks, for example `` `grammar` ``.

## Operations

1. `round-trip`: parse the input with the generic parser and with the typed parser of `document-type`. Both must
   succeed. Serialize the parsed document. The canonical form of the output must be the same bytes as `expected`. The
   canonical form is defined in [Canonical JSON for conformance comparison](../../docs/canonical-json.md).
2. `parse`: parse the input with the generic parser. The parser must report `expected-category`. The non-raising
   validity check must return false for the same input.
3. `parse-typed`: parse the input with the typed parser of `document-type`. The parser must report
   `expected-category`.
4. `parse-file`: parse the file at the input path. The path does not exist. The parser must report
   `expected-category` and name the path.
5. `assessment-period`: wrap the parsed input in the document facade and request the assessment period. The facade
   must report `expected-category`.
6. `validate-element`: validate the input against `element-type`. The result must be `expected-valid`, or the
   operation must report `expected-category`.
7. `yaml-round-trip`: parse the YAML input with the YAML parse operation. Serialize the parsed document to JSON. The
   canonical form of the output must be the same bytes as `expected`. Then serialize the parsed document to YAML,
   parse that output with the YAML parse operation, and serialize the result to JSON. Its canonical form must also be
   the same bytes as `expected`.
8. `yaml-parse`: parse the YAML input with the YAML parse operation. The parser must report `expected-category`.

For each `round-trip` input, the non-raising validity check must return true. The check does not apply to a
`yaml-round-trip` input.

A binding that offers no YAML skips each operation whose name starts with `yaml-`. The yaml-documents capability
makes YAML optional.

## How the corpus is checked

`npm run corpus:check` checks the corpus without any binding. It uses the vendored schema and an independent JSON
Schema validator. For a YAML input, it uses the reference YAML reader, `scripts/yaml-reader.ts`. For example, it
confirms that each valid document is valid, that each invalid document fails in the stated way, and that each expected
file is the canonical form of its input. A YAML input that copies a NIST example uses the expected file of its JSON
twin. Each document in `documents/valid/` that has a `source` is a public-domain example from NIST
`usnistgov/oscal-content`. The other documents were written for this corpus.
