# Conformance corpus for OSCAL 1.2.3

A binding conforms when it gives the expected result for each case in `cases.json`. Every binding runs the same corpus.
A binding that fails a case records the expected failure in its own repository, not in this corpus
([VER-007](../../openspec/specs/schema-versioning/spec.md#requirement-ver-007-each-binding-keeps-its-own-expected-conformance-failures)).

## Layout

1. `cases.json`: the case index. Each case names an operation, an input, and an expected result. An `element-types`
   case and a builder case (`build-hash`, `build-rlink`, or `build-resource`) have no input.
2. `documents/valid/`: valid OSCAL documents, one or more for each of the eight document types. A `.json` file is a
   JSON input, and a `.yaml` file is a YAML input.
3. `documents/invalid/`: documents that a binding must reject. Each is a minimal document with one fault. An input for
   a case that counts failures with `expected-min-failures` above 1, for example `two-failures.json` and
   `many-failures.json`, has the faults that the case counts. The JSON inputs are minimal catalogs. A YAML input is a minimal document of the type that its fault needs.
4. `elements/`: standalone OSCAL elements for element validation.
5. `expected/`: the canonical form of each `round-trip` and `yaml-round-trip` input. It also holds the list of
   element-type names of the `element-types` case. `npm run corpus:write` generates these files. Do not edit them.

## Cases

Each case has these fields:

1. `id`: a unique name.
2. `operation`: the operation to run, from the list in [Operations](#operations).
3. `input`: the input path, relative to this directory. An `element-types` case and a builder case have no `input`.
4. `requirements`: the requirement and scenario identifiers that the case tests.
5. One expected result:
   1. `expected`: the path of the expected canonical form, for a round trip. For `element-types`, it is the path of the
      expected list.
   2. `expected-category`: the error category, from the `categories` list. The list holds each category of the
      error-model capability that a portable case can reach. It does not hold the limit-exceeded category, because
      only a documented limit of a binding reaches it.
   3. `expected-valid`: `true` or `false`, for element validation.
   4. `expected-period`: an object with the keys `start` and `end`, for an assessment period. Each value is a datetime
      in the canonical form of [Canonical JSON for conformance comparison](../../docs/canonical-json.md#datetimes).
   5. `expected-uuid`: the identifier that the resource builder derives from the key, in lowercase, for a
      `build-resource` case.
   6. `expected-element`: the JSON of the element that a builder returns. The canonical form of the JSON of the result
      must be the same bytes as the canonical form of `expected-element`.
6. `arguments`: for a builder case, an object with these keys:
   1. `build-hash`: `value` (a string, required) and `algorithm` (a string).
   2. `build-rlink`: `href` (a string, required), `media-type` (a string), and `hashes` (an array of hash objects).
   3. `build-resource`: `key`, `title`, and `identifier` (each a string), and `document-ids` (an array of document-id
      objects).

   For an item of `hashes` or `document-ids`, the runner gives the builder the element of the binding with the same
   JSON. The runner does not validate the item. The builder must report the error of an invalid item.
7. Optional fields:
   1. `document-type`: the root key of the document type, for a round trip or a typed parse.
   2. `element-type`: the element-type name, for element validation.
   3. `input-form`: `bytes` when the input must reach the binding as raw bytes, not as text. For a `facade` case,
      `path` when the facade must be built from the input path.
   4. `expected-min-failures`: the lowest number of structured failure entries that the parse error carries.
   5. `expected-max-failures`: the highest number of structured failure entries that the parse error carries. It
      applies only to a `parse` case. Its value is an integer of 1 or more, and not less than `expected-min-failures`.
      An input whose root keys name one document type is not valid against the schema of that document type, so the
      fault is in that type
      ([PRS-013](../../openspec/specs/document-parsing/spec.md#requirement-prs-013-the-root-key-selects-the-document-type-of-the-parse-failures)).
      An input with two or more root keys has no `expected-max-failures`, because PRS-013 sets no rule for its
      failures.
   6. `source`: the repository, commit, path, and `sha256` of a document copied from another repository.
   7. `notes`: an explanation for people. For a `yaml-parse` case, the notes name the fault code of the reference
      YAML reader in backticks, for example `` `grammar` ``.

## Operations

1. `round-trip`: parse the input with the generic parser and with the typed parser of `document-type`. Both must
   succeed. Serialize the parsed document. The canonical form of the output must be the same bytes as `expected`. The
   canonical form is defined in [Canonical JSON for conformance comparison](../../docs/canonical-json.md).
2. `parse`: parse the input with the generic parser. The parser must report `expected-category`. The parse error must
   carry no more structured entries than `expected-max-failures`. The non-raising validity check must return false for
   the same input.
3. `parse-typed`: parse the input with the typed parser of `document-type`. The parser must report
   `expected-category`.
4. `parse-file`: parse the file at the input path. For the not-found category, the path does not exist.
   For the read-error category, the path is a directory. The parser must report `expected-category` and name the
   path.
5. `assessment-period`: wrap the parsed input in the document facade and request the assessment period. The facade
   must report `expected-category`, or return the start and the end of `expected-period`. The runner normalizes each
   bound that the facade returns as [Canonical JSON for conformance comparison](../../docs/canonical-json.md#datetimes)
   states, and then compares it with the value in `expected-period`.
6. `validate-element`: validate the input against `element-type`. The result must be `expected-valid`, or the
   operation must report `expected-category`.
7. `yaml-round-trip`: parse the YAML input with the YAML parse operation. Serialize the parsed document to JSON. The
   canonical form of the output must be the same bytes as `expected`. Then serialize the parsed document to YAML,
   parse that output with the YAML parse operation, and serialize the result to JSON. Its canonical form must also be
   the same bytes as `expected`.
8. `yaml-parse`: parse the YAML input with the YAML parse operation. The parser must report `expected-category`.
9. `element-types`: request the supported element types. The result must equal the list in `expected`, item by item
   and in the same order.
10. `build-resource`: build a resource with `arguments`. Then compare the `uuid` of the resource with `expected-uuid`,
    compare the resource with `expected-element`, or check that the builder reports `expected-category`. When the
    arguments have no `key` and no `identifier`, the builder generates the identifier. `expected-element` then has no
    `uuid`. The runner checks that the `uuid` of the result matches the UUID datatype of the schema, removes `uuid`
    from the result, and compares the rest with `expected-element`.
11. `build-hash`: build a hash with `arguments`. Compare the hash with `expected-element`, or check that the builder
    reports `expected-category`. A hash with no `algorithm` has the algorithm SHA-256.
12. `build-rlink`: build an rlink with `arguments`. Compare the rlink with `expected-element`, or check that the builder
    reports `expected-category`. An omitted `media-type` or `hashes` is absent from the result.
13. `facade`: build the document facade from the input, as `input-form` states:
    1. `input-form` is absent: parse the input with the generic parser, and wrap the result in the facade.
    2. `input-form` is `bytes`: build the facade from the raw bytes of the input.
    3. `input-form` is `path`: build the facade from the input path.

    With `expected`, read the wrapper, the body, the metadata, the OSCAL version, and the body identifier through the
    facade. Let `B` be the value of the `document-type` key of `expected`. These five checks must pass:
    1. The canonical form of the wrapper is the same bytes as `expected`.
    2. The canonical form of the body is the canonical form of `B`.
    3. The canonical form of the metadata is the canonical form of the `metadata` of `B`.
    4. The OSCAL version equals the `oscal-version` of that metadata, as a string.
    5. The body identifier equals the `uuid` of `B`, as a string.

    With `expected-category`, the category is `not-found`, the form is `path`, and the input path does not exist. The
    facade must report the category and name the path, as `parse-file` does.

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
