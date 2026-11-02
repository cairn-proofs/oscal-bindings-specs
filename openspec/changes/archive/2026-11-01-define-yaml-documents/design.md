## Context

See [proposal.md](proposal.md#why) for the motivation. These facts shape the approach:

1. Six properties of the vendored OSCAL 1.2.3 complete schema have a type that is not a string. They are `as-is`
   (boolean), the `start` and `end` of a port range (non-negative integer), `period` (positive integer), and the
   mapping `percentage` and `target-coverage` (decimal). Each other scalar is a string.
2. [SRF-001] blocks YAML operations in a binding until a contract requirement defines them. The Python binding plans
   YAML in cairn-proofs/oscal-bindings-python#7. The TypeScript binding validates with ajv.
3. `scripts/check-corpus.ts` proves each corpus case with the vendored schema and ajv, without a binding. The store
   already depends on the `yaml` package, version 2.9.1, which reads YAML 1.2 and has a `failsafe` schema.
4. The corpus copies seven JSON examples from `usnistgov/oscal-content` at commit `78650f02`. Each of them has a YAML
   twin in the same commit. The corpus wrote its own mapping collection, so it has no NIST twin. A prototype of the
   reader in D4 read each YAML twin. Each result had the same canonical form as the `expected/` file of the JSON twin.

## Goals / Non-Goals

**Goals:**

1. Two bindings that offer YAML accept the same YAML inputs and read each one to the same JSON value.
2. The contract decides only what a caller can see. Each binding chooses its YAML library and its output style.
3. The corpus checker proves each YAML case without a binding, as it does for the JSON cases.

**Non-Goals:**

1. Output that a YAML 1.1 reader or a reader with implicit typing reads to the same value. Risks 1 has the reason.
2. A minimum resource limit that every binding accepts. [D8](#d8-decisions-after-review), item 1, has the reason.
3. A non-raising validity check for YAML, and a corpus case for the YAML not-found condition. [YML-006] states the
   not-found rule by reference to [PRS-002], which the JSON corpus already tests.
4. XML.
5. A change to a binding. The Python and TypeScript work is in their own repositories.

## Decisions

### D1. The schema decides the type of a scalar

[YML-004] reads each scalar as text, then takes the type that the schema allows at its location. A string comes first,
so a number form or a boolean form at a string location stays text. This is the decision of the explore session for
#16.

Alternatives:

1. YAML is JSON syntax, with a fixed resolver such as the YAML 1.2 JSON schema. This is the NIST position, and the
   spec is smaller. It rejects the unquoted `version: 1.0`, which people write often.
2. YAML is JSON syntax, with a YAML 1.1 resolver. This also rejects `version: 1.0`. Its timestamp type also loses the
   seventh fraction digit of a datetime in some libraries, against [PRS-008].
3. Each binding decides. That is the problem that #16 reports.

### D2. Non-string text uses the JSON grammar

At a number location, the text must match the number grammar of RFC 8259. At a boolean location, the text must be
`true` or `false`. The rule therefore accepts no number or boolean that the JSON path rejects. The alternative, the
lax conversion of a language library, gives different results in each binding. For example, Pydantic lax mode accepts
`yes` and `on` as booleans, and the `coerceTypes` option of ajv uses other rules.

### D3. The tag, the style, and the null forms do not change a value

1. A tag such as `!!int` or `!!omap` does not change the value ([YML-009]), so tagged YAML from other tools still
   parses. A parse error for a tag is the alternative, and it is less friendly (explore session).
2. The scalar style does not change the type, so `"443"` and `443` both give the number 443 at a port-range `start`.
   This follows from D1: the text decides the value, and the schema decides the type. A rule that a quoted scalar is
   always a string makes each binding read the scalar style, and some YAML libraries do not expose it.
3. `null`, `~`, and an empty scalar are text. A rule that maps them to an absent field accepts documents that the JSON
   path rejects. A rule that makes them a parse error needs the scalar style. The schema rejects `""` only where a field
   has a pattern, such as a property `value`. Fields such as `remarks` accept `""`.
4. The key `<<` is an ordinary key, as YAML 1.2 defines. Some libraries apply it as a YAML 1.1 merge key by default, so
   [YML-009] states the rule, and a corpus case tests it.

### D4. The corpus checker has a reference reader

A new module, `scripts/yaml-reader.ts`, reads a YAML input as [YML-002] to [YML-004] and [YML-009] define:

1. Decode the bytes as UTF-8 with `fatal: true`. Parse with `parseAllDocuments` of the `yaml` package, with the
   `failsafe` schema, unique keys, and `resolveKnownTags: false`, so that a tag such as `!!omap` does not change a
   node. More or fewer than one document, or any parse error, is a parse error. A warning, such as an unresolved tag,
   is not an error.
2. Build a tree of text from the content (`Scalar.source`) of each scalar node. Resolve each alias to its anchored node,
   and report a parse error for an alias inside its own anchored node. A key that is not a scalar is a parse error.
   The unique-keys check compares the key text, so `title` and `"title"` are a duplicate.
3. Validate the tree with ajv and the vendored schema. For each `type` error at a string where the schema expects a
   number, an integer, or a boolean, convert the text by the grammar of D2. Text that does not match is a parse error
   at that location. Repeat until no `type` error can be converted. Each repeat converts at least one string, so the
   loop ends.
4. Write the JSON text of the tree, with each converted number as the text of its scalar ([YML-005]). The checker
   canonicalizes that text, as it does a JSON input.

Each parse error carries a reason code, for example `two-documents` or `number-grammar`. The self-test checks the code
of each self-test input, so a case cannot pass for a fault other than the one that it names.

Step 3 follows the order of [YML-004] for each location in OSCAL 1.2.3. In that schema, no `type` keyword names two
types, and no union allows both a string and another scalar type at one location. For such a location, [YML-004]
gives a string, and the schema can then reject it, for example for a pattern. The ajv method can convert the text to
a number instead. The reader checks this fact when it
starts, and it fails when a later schema breaks it. The reader is store tooling only. The contract does not require a
binding to use this method.

The alternative is a walker that finds the schema type at each location. A walker has to resolve `$ref`, `allOf`,
`anyOf`, and `oneOf` itself. The ajv method reuses the validator that the checker already has.

### D5. Two new corpus operations

1. `yaml-round-trip`: parse the input with the YAML parse operation. Serialize the document to JSON. The canonical form
   must be the same bytes as `expected`. Then serialize the document to YAML, parse that output with the YAML parse
   operation, and serialize to JSON. That canonical form must also be the same bytes as `expected`.
2. `yaml-parse`: parse the input with the YAML parse operation. The operation must report `expected-category`.

A `yaml-round-trip` case has a `document-type`, and the checker checks the root key, as for `round-trip`. A binding
does not run the non-raising validity check for a YAML case, because [ERR-002] applies to JSON input only.

A binding that offers no YAML skips each operation whose name starts with `yaml-` ([YML-001]). The checker uses the
reader of D4. For `yaml-round-trip`, the canonical form of the reader output must be the same bytes as `expected`. For
`yaml-parse`, the reader must reject the input. A YAML case that copies a NIST example uses the
`expected/` file of its JSON twin, so `npm run corpus:write` does not generate it from the reader.

### D6. The corpus fixtures

YAML files go in the existing `documents/valid/` and `documents/invalid/` directories, with the `.yaml` extension.

1. `yaml-round-trip` cases for the seven NIST YAML examples in Context 4. Each case has a `source` with the `sha256`
   and the `expected/` file of its JSON twin.
2. `yaml-round-trip/string-scalars`: a minimal catalog with these scalars:
   1. In the metadata: `version: 1.0`, `title: yes`, `remarks: null`, and
      `last-modified: 2024-01-02T03:04:05.1234567Z`.
   2. Two metadata properties with the values `1.10` and `!!int 7`, and the remarks `~` and an empty scalar.
   3. One back-matter resource with `rlinks: !!omap [{href: "https://example.com/a"}]`.

   Its new `expected/` file holds `"1.0"`, `"yes"`, `"null"`, all seven fraction digits, `"1.10"`, `"7"`, `"~"`, `""`,
   and an array with one rlink.
3. `yaml-round-trip/number-scalars`: a minimal component definition with these scalars:
   1. A port range with `start: &n "443"` and `end: 443`.
   2. A second port range with `start: 443.0` and `end: 443`.
   3. A component property with `value: *n`.

   The expected file holds the number 443 in each `start` and `end`, and the string `"443"`.
4. `yaml-round-trip/boolean-scalar`: a minimal profile with `merge: {as-is: true}`.
5. `yaml-parse` cases with `expected-category: parse-error`:
   1. `yaml-syntax-error`: a flow sequence with no closing bracket.
   2. `yaml-two-documents` and `yaml-no-document` (a comment only).
   3. `yaml-utf-16`: the minimal catalog in UTF-16 with a byte order mark, with `input-form: bytes`.
   4. `yaml-duplicate-key` (`title` two times) and `yaml-same-text-keys` (`title` and `"title"`).
   5. `yaml-non-scalar-key`, `yaml-alias-cycle`, and `yaml-merge-key`.
   6. `yaml-unknown-field`.
   7. `yaml-boolean-form` (`as-is: yes`), `yaml-number-form` (`start: 0x1BB`, with `expected-min-failures: 1`), and
      `yaml-plus-sign` (`start: +443`). Lax converters of some libraries accept `+443`.

Each invalid fixture has one fault. The case `notes` name the fault, and the reader reports its reason code.

The expected files of items 2 to 4 are new. `npm run corpus:write` generates them with the reader, and the task checks
each value by hand, so that a defect in the reader does not set the expectation.

### D7. Release as a minor increment

The change adds an optional capability and new corpus cases. [VER-003] lists both as a minor increment. The change to
[ERR-001] adds YAML to the parse-error category and does not change the category of a JSON input. The changes to
[SRF-001.02] and [SRF-002.02] change only the example. The version is `0.5.0+oscal.1.2.3`.


### D8. Decisions after review

The user chose these after the adversarial review of this change:

1. **Resource limits ([YML-011]).** A binding can limit alias expansion and other resources, documents each limit, and
   reports an input over a limit as a parse error. The alternatives were a minimum expansion that each binding
   accepts, and no limits. A minimum needs a number that the store cannot justify yet. No limits leaves each binding
   open to a "billion laughs" input.
2. **Number identity ([YML-005]).** The YAML parse operation gives the result of the JSON parse operation for a JSON
   text. In that text, each number token is the text of its scalar. YAML then reads `443.0`, `-0`, and `1e400` as the
   JSON path reads them. The alternative left these values open.
3. **Unions ([YML-004]).** A scalar takes the first named type whose grammar its text matches. At a location that
   allows a number and a boolean, `true` is then a boolean, as in JSON. The alternative, the first named type, rejected
   `true` there.
4. **Grammar errors ([YML-010]).** A grammar error is a schema-conformance failure at the location of the scalar, with
   one structured entry, as [PRS-006] requires.
5. **Typed YAML parsers ([YML-007]).** A binding offers typed YAML parsers for all eight document types or for none,
   as [PRS-003] does for JSON. The alternative allowed any subset.

## Risks / Trade-offs

1. [A binding writes the string `"1.0"` as the plain scalar `1.0`. A tool that reads YAML with implicit typing, such as
   a YAML 1.1 library, then reads a number.] → Accepted. [YML-008] requires only that this contract reads the output
   back to the same document. A binding can quote such strings. A later change can require it if users report the
   problem.
2. [A binding accepts YAML that NIST convert-then-validate tooling rejects, such as `version: 1.0`.] → Accepted. This
   is the purpose of D1.
3. [A later OSCAL release adds a location where a union allows both a string and another scalar type.] → [YML-004]
   decides that case: the string comes first. The reader of D4 can disagree when the string branch fails for another
   reason, such as a pattern. The start-up check of D4 fails in that case, so the store sees the problem before a
   release. A binding can also implement [YML-004] wrongly for such a location, and no 1.2.3 corpus case can catch it.
4. [The reader of D4 has a defect, and a generated expected file carries it.] → The NIST cases use the expected files
   of their JSON twins. For the hand-written cases, the tasks check each value of the expected file by hand.
5. [A YAML library that a binding uses accepts a duplicate key, applies merge keys, or types scalars by itself.] → The
   `yaml-duplicate-key`, `yaml-merge-key`, `yaml-boolean-form`, `yaml-number-form`, and `yaml-plus-sign` cases fail
   for that binding. Each binding chooses how to fix it.

## Migration Plan

1. Merge the change, then tag `v0.5.0+oscal.1.2.3` on `main`. CI builds the archive and the draft release. The user
   publishes it.
2. A binding that does not offer YAML moves its pin and needs no other change. A binding that offers YAML implements
   [YML-001] to [YML-011] and runs the YAML cases. For the Python binding this is cairn-proofs/oscal-bindings-python#7.
3. Rollback: a binding keeps its old pin. The new release changes no released name or schema file.
