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
   `many-failures.json`, has the faults that the case counts. The other JSON inputs are minimal catalogs. A YAML input is a minimal document of the type that its fault needs.
   The directory `documents/invalid/constraints/` holds one document for each reportable entry of
   the constraint manifest. Each document conforms to the schema and fails that entry. The command
   `npm run corpus:cases` writes these documents and the `parse/constraint/` cases that use them.
   Do not edit them by hand.
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
      in the canonical form of [Canonical JSON for conformance comparison](../../docs/canonical-json.md#datetimes), or
      `null` for an empty bound. A bound is empty when the facade returns no datetime for it. Both keys are always
      present.
   5. `expected-uuid`: the identifier that the resource builder derives from the key, in lowercase, for a
      `build-resource` case.
   6. `expected-element`: the JSON of the element that a builder returns. The canonical form of the JSON of the result
      must be the same bytes as the canonical form of `expected-element`.
6. `arguments`: for a builder case, an object with these keys:
   1. `build-hash`: `value` (a string, required) and `algorithm` (a string).
   2. `build-rlink`: `href` (a string, required), `media-type` (a string), and `hashes` (an array of hash objects).
   3. `build-resource`: `key`, `title`, and `identifier` (each a string), `rlinks` (an array of rlink objects), and
      `document-ids` (an array of document-id objects).

   For an item of `hashes`, `rlinks`, or `document-ids`, the runner gives the builder the element
   of the binding with the same JSON. The runner does not validate the item. The builder must
   report the error of an invalid item.
7. Optional fields:
   1. `document-type`: the root key of the document type, for a round trip or a typed parse.
   2. `element-type`: the element-type name, for element validation.
   3. `input-form`: how the input reaches the binding. The value is `bytes` or `path`. See
      [Input forms](#input-forms).
   4. `expected-min-failures`: the lowest number of structured failure entries that the parse error carries.
   5. `expected-max-failures`: the highest number of structured failure entries that the parse error carries. It
      applies only to a `parse` case. Its value is an integer of 1 or more, and not less than `expected-min-failures`.
      An input whose root keys name one document type is not valid against the schema of that document type, so the
      fault is in that type
      ([PRS-013](../../openspec/specs/document-parsing/spec.md#requirement-prs-013-the-root-key-selects-the-document-type-of-the-parse-failures)).
      An input with two or more root keys has no `expected-max-failures`, because PRS-013 sets no rule for its
      failures.
   6. `expected-constraints`: a list that holds one object for each constraint failure that the input gives. Each
      object has two strings: `id` is the `id` of the manifest entry that fails, and `location` is the location of the
      failure as the Normalized Path of [CNS-024](../../openspec/specs/constraint-validation/spec.md#requirement-cns-024-the-location-of-a-node-says-when-two-selections-are-the-same-node). The list is in any order. Two failures with the same `id` and
      the same location are two objects, because one location can have more than one failure. The runner compares the
      list of pairs with the failures of the binding as multisets. A failure at another location than the list gives
      is a different failure. The field applies to a `parse`, `validate-element`, or builder case
      ([CNS-020](../../openspec/specs/constraint-validation/spec.md#requirement-cns-020-the-corpus-has-a-failing-case-for-each-reportable-entry)).
      The location of a failure follows these rules:
      1. For a `parse` case, the location is the Normalized Path in the document, for example
         `$['catalog']['controls'][0]['props'][0]['name']`.
      2. For a `validate-element` case with an element that is one item, the location is the Normalized Path in an
         array that holds only the element, so it starts with `$[0]`, for example `$[0]['value']`.
      3. For an element that is a list of items, the location of a failure in item k is `$[0][k]`, followed by the
         part of its location after `$[0]` in an array that holds only the item.
      4. For an `is-unique` or `index` entry, the nodes with the same key are in the order of their locations
         ([CNS-026](../../openspec/specs/constraint-validation/spec.md#requirement-cns-026-locations-are-in-a-fixed-order)).
         The first node gives no failure. Each other node gives one failure, at its location.

      The input conforms to the JSON Schema. These cases have the field:
      1. A `parse` case whose input conforms to the schema.
      2. A `validate-element` case with `expected-valid` `false` whose input conforms to the schema.
      3. A builder case whose element conforms to the schema and fails the constraint manifest.

      A case whose input does not conform to the schema has no `expected-constraints`.
      An input conforms to the schema only when each of its values also meets the datatype rules of
      [PRS-016](../../openspec/specs/document-parsing/spec.md#requirement-prs-016-the-patterns-of-the-schema-decide-a-value-not-its-format-keyword).
   7. `source`: the repository, commit, path, and `sha256` of a document copied from another repository.
   8. `notes`: an explanation for people. For a `yaml-parse` case, the notes name the fault code of the reference
      YAML reader in backticks, for example `` `grammar` ``.
   9. `expected-absent-keys`: for a `yaml-round-trip` case, the keys that the serialized YAML must not hold at any
      depth ([YML-008](../../openspec/specs/yaml-documents/spec.md#requirement-yml-008-serialize-an-oscal-document-to-yaml)).
      Each key is absent from the input, so a serializer that writes it has written an absent field.

## Operations

A case has three parts that do not depend on each other: the operation, the form of the input, and the expected
result. A new case can combine parts that this file defines, and a runner that supports each part needs no change for
that case. A runner reports a case as not run, and not as passed, when it does not support the operation of the case,
the `input-form` of the case, or a field of the case whose name starts with `expected`.

### Input forms

The `input-form` of a case states how the input reaches the binding. It does not change the expected result.

1. No `input-form`: the runner reads the input file as UTF-8 text and gives the text to the binding.
2. `bytes`: the runner gives the bytes of the input file to the binding, and does not decode them first
   ([PRS-001](../../openspec/specs/document-parsing/spec.md#requirement-prs-001-parse-an-oscal-document-from-text-or-bytes)).
3. `path`: the runner gives the input path to the binding, and the binding reads the file
   ([PRS-002](../../openspec/specs/document-parsing/spec.md#requirement-prs-002-parse-an-oscal-document-from-a-file-path)).

These operations can have an `input-form`. A case of any other operation has none.

| Operation | `bytes` | `path` |
|---|---|---|
| `round-trip` | Yes | Yes |
| `parse` | Yes | No |
| `yaml-round-trip` | Yes | Yes |
| `yaml-parse` | Yes | No |
| `facade` | Yes | Yes |

An operation whose name ends with `-file` always gives the input path to the binding, and its cases have no
`input-form`.

For a `round-trip` case, the form applies to the generic parse. With `bytes`, the generic parser gets the bytes. With
`path`, the parse-from-file operation gets the path and takes the place of the generic parser. The typed parser of
`document-type` gets the text of the input for each form. The descriptions of `yaml-round-trip` and `facade` state
what each form means for them.

### Operation list

1. `round-trip`: parse the input with the generic parser and with the typed parser of `document-type`. Both must
   succeed. Serialize the parsed document. The canonical form of the output must be the same bytes as `expected`. The
   canonical form is defined in [Canonical JSON for conformance comparison](../../docs/canonical-json.md).
2. `parse`: parse the input with the generic parser. The parser must report `expected-category`. The parse error must
   carry no more structured entries than `expected-max-failures`. The non-raising validity check must return false for
   the same input. With `expected-constraints`, the pairs of `id` and location of the constraint failures in the parse error
   must equal the list, with each repeat. The exception is a parse error that identifies a limit of
   [PRS-010](../../openspec/specs/document-parsing/spec.md#requirement-prs-010-a-binding-can-limit-the-resources-that-a-parse-uses).
3. `parse-typed`: parse the input with the typed parser of `document-type`. The parser must report
   `expected-category`.
4. `parse-file`: parse the file at the input path. For the not-found category, the path does not exist.
   For the read-error category, the path is a directory. The parser must report `expected-category` and name the
   path.
5. `assessment-period`: wrap the parsed input in the document facade and request the assessment period. The facade
   must report `expected-category`, or return the start and the end of `expected-period`. The runner normalizes each
   bound that the facade returns as [Canonical JSON for conformance comparison](../../docs/canonical-json.md#datetimes)
   states, and then compares it with the value in `expected-period`. An empty bound that the facade returns matches
   `null`. The runner does not normalize an empty bound. A datetime does not match `null`, and an empty bound does not
   match a datetime. The binding chooses how the facade returns an empty bound, for example as a null value or an
   absent optional value. A string with no characters is not an empty bound.
6. `validate-element`: validate the input against `element-type`. The result must be `expected-valid`, or the
   operation must report `expected-category`. With `expected-constraints`, the pairs of `id` and location of the
   constraint failures in the result must equal the list, with each repeat, unless the result
   identifies a limit of
   [ELV-004](../../openspec/specs/element-validation/spec.md#requirement-elv-004-a-binding-can-limit-the-resources-that-element-validation-uses).
7. `yaml-round-trip`: parse the YAML input with the YAML parse operation. Serialize the parsed document to JSON. The
   canonical form of the output must be the same bytes as `expected`. Then serialize the parsed document to YAML,
   parse that output with the YAML parse operation, and serialize the result to JSON. Its canonical form must also be
   the same bytes as `expected`.
   With `input-form` `bytes`, the runner gives the YAML parse operation the raw bytes of the input, not text. With
   `input-form` `path`, the runner gives the YAML parse-from-file operation the path of the input. The second parse
   uses the same form as the first: with `bytes`, the runner gives the parse operation the UTF-8 bytes of the
   serialized YAML, and with `path`, the runner writes the serialized YAML to a file and gives the parse-from-file
   operation the path of that file. With no `input-form`, the second parse gets the serialized YAML as text.
   With `expected-absent-keys`, the runner also reads the serialized YAML as generic YAML, with no schema, and no
   mapping at any depth may have a key in the list. The runner can use any YAML reader for this check. The reader
   does not need to be part of the binding.
8. `yaml-parse`: parse the YAML input with the YAML parse operation. The parser must report `expected-category`.
9. `yaml-parse-file`: the YAML form of `parse-file`. Parse the YAML file at the input path with the YAML
   parse-from-file operation. The parser must report `expected-category` and name the path. The only category of a
   case is not-found, and the path does not exist, because
   [YML-006](../../openspec/specs/yaml-documents/spec.md#requirement-yml-006-parse-an-oscal-document-from-a-yaml-file-path) names no other category. The
   case has no `input-form`.
10. `yaml-parse-typed`: the YAML form of `parse-typed`. Parse the YAML input with the typed YAML parser of
    `document-type`. The parser must report `expected-category`. The case has no `input-form`.
11. `element-types`: request the supported element types. The result must equal the list in `expected`, item by item
   and in the same order.
12. `build-resource`: build a resource with `arguments`. Then compare the `uuid` of the resource with `expected-uuid`,
    compare the resource with `expected-element`, or check that the builder reports `expected-category`. When the
    arguments have no `key` and no `identifier`, the builder generates the identifier. `expected-element` then has no
    `uuid`. The runner checks that the `uuid` of the result matches the UUID datatype of the schema, removes `uuid`
    from the result, and compares the rest with `expected-element`.
13. `build-hash`: build a hash with `arguments`. Compare the hash with `expected-element`, or check that the builder
    reports `expected-category`. A hash with no `algorithm` has the algorithm SHA-256.
14. `build-rlink`: build an rlink with `arguments`. Compare the rlink with `expected-element`, or check that the builder
    reports `expected-category`. An omitted `media-type` or `hashes` is absent from the result.
15. `facade`: build the document facade from the input, as `input-form` states:
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

For a builder case with `expected-constraints`, the runner checks only that the builder reports
the validation error. It does not compare the `id` values or the locations of the failures.

For each case with `expected-category`, the runner also tests the category tree of
[ERR-009](../../openspec/specs/error-model/spec.md#requirement-err-009-error-categories-form-a-tree). A test for a
category is true when the category is `expected-category` or an ancestor of it, and false for each other category in
`categories`. The only parent in the tree is parse-error, which is the parent of document-type-mismatch. For example,
a `parse-typed` error of the category document-type-mismatch is also in the parse-error category. A `parse` error of
the category parse-error is not in the document-type-mismatch category. An error of the category not-found or
read-error is not in the parse-error category.

For each `round-trip` input, the non-raising validity check must return true. The check does not apply to a
`yaml-round-trip` input.

An operation whose name starts with `yaml-` is the YAML form of the operation with the rest of the name. It uses the
YAML operations of the binding in place of the JSON operations, and its entry in the operation list states each
step. A binding that offers no YAML skips each operation whose name starts with `yaml-`. The yaml-documents capability makes YAML optional. A binding that offers YAML and no
typed YAML parser also skips `yaml-parse-typed`, because
[YML-007](../../openspec/specs/yaml-documents/spec.md#requirement-yml-007-a-typed-yaml-parser-behaves-as-a-typed-json-parser) makes the typed YAML parsers
optional.

## How the corpus is checked

`npm run corpus:check` checks the corpus without any binding. It uses the vendored schema and an independent JSON
Schema validator. For a YAML input, it uses the reference YAML reader, `scripts/yaml-reader.ts`. For example, it
confirms that each valid document is valid, that each invalid document fails in the stated way, and that each expected
file is the canonical form of its input. It also runs the reference evaluator of the constraint manifest, as
[CNS-020](../../openspec/specs/constraint-validation/spec.md#requirement-cns-020-the-corpus-has-a-failing-case-for-each-reportable-entry) states:

1. For each input with `expected-constraints`, the evaluator gives the failures that the field lists, each with its
   `id` and its location.
2. Each reportable entry of `manifest/1.2.3/constraints.json` has a case whose input fails it.
3. No input that a case expects to be valid, and no element that a builder case expects, fails an
   entry.

A YAML input that copies a NIST example uses the expected file of its JSON twin. Each document in
`documents/valid/` that has a `source` is a public-domain example from NIST `usnistgov/oscal-content`.
The other documents were written for this corpus.
