## Context

See [proposal.md, Why](proposal.md#why) for the motivation. These facts constrain the approach.

1. Each document type has one wrapper, and each wrapper holds exactly one body field and the `$schema` directive
   ([MDL-002]). The naming manifest records the body field of each `document` entry as `body-field`. The complete schema
   has a root `oneOf` with one closed branch for each wrapper.
2. [PRS-012] requires one entry for each failure. [ERR-003] requires each entry to identify the failing location. No
   requirement says what "a failure" is when the input could be one of eight document types.
3. `npm run corpus:check` checks each case with Ajv (`allErrors`) against the complete schema. For a `parse` case, it
   checks that the input is not valid and, with `expected-min-failures`, that Ajv reports at least that many errors.
4. Ajv errors are not binding entries. For the single-fault inputs of the corpus, Ajv reports these counts:

   | Input | Ajv, whole schema | Ajv, branch of the root key | Python binding with [python#44] |
   |---|---|---|---|
   | `invalid-uuid.json` | 16 | 1 | 1 |
   | `missing-required-field.json` | 16 | 1 | 1 |
   | `name-keyed-field.json` | 16 | 1 | 1 |
   | `unknown-field-nested.json` | 16 | 1 | 1 |
   | `unknown-field-top.json` | 16 | 1 | 1 |
   | `datetime-without-timezone.json` | 17 | 2 (`pattern`, `format`) | 1 |
   | `two-failures.json` | 17 | 2 (both at `/catalog/metadata`) | 2 |
   | `closed-enum-out-of-set.json` | 18 | 3 (nested `anyOf`) | 2 (nested union) |
   | `unknown-root.json` | 17 | no root key | 1 |

   Ajv reports a missing field at the parent location, and it reports each failed keyword. A binding can report a
   missing field at the field, and one entry for a value that fails two keywords.

## Goals / Non-Goals

**Goals:**

1. Make the failures of a parse error those of one document type, for every binding.
2. Make an input that names no document type a parse error that says so, with no failure of any document type.
3. Make both rules testable in the corpus, with no binding in the store.
4. Leave each binding free to choose how it finds the document type and how it reports the result.

**Non-Goals:**

1. Rules for the nested unions of the schema, for example the parameter and group unions ([python#43]). A nested union
   can still give more than one entry for one fault. The change puts no maximum on a case whose fault is in a nested
   union.
2. A rule for an object with two or more root keys. [PRS-004] already makes it a parse error, because each branch of
   the schema is closed.
3. A rule for the typed parsers of [PRS-003]. A typed parser can read the input directly as its own document type.
   [PRS-003] already defines the error for a document of another type.
4. A rule for the text of a message, for an error type identifier, or for the number and location of the entries for
   an input that names no document type.
5. A change in a binding repository.

## Decisions

### D1. [PRS-013] states the observable result, not a method

[PRS-013] states what the parse error carries. It does not state how a binding finds the document type. A binding can
use one of these methods, or another:

1. Look at the root keys before it checks the body.
2. Use a discriminated union, for example a zod discriminated union or a pydantic callable discriminator.
3. Read the input as a stream, for example with a serde enum and a custom deserializer.
4. Switch on the decoded root keys, for example in Go.
5. Check the input against each type, and then drop the failures of the other types.

The rule also does not set a speed. The usual methods give the speed gain of [python#41], but the contract does not
need it.

Alternative: "the parse operation checks the input only against the document type of the root key". It names one
method, and a binding that checks and then filters would not conform, with the same result for the caller.

### D2. The rule applies to the generic parse operation only

The fan-out comes from the eight-way choice of the generic parse operation of [PRS-001]. The operations that the
contract defines through it have the same choice, for example the parse of a file, the YAML parse, and the facade
constructors. A typed parser has one document type, so it has no choice to make (Non-Goals 3).

### D3. An input that names no document type has one rule for its content and none for its form

The input names no document type, so each failure of a document type is noise. [PRS-013] item 2 requires the parse
error to say that the input names no OSCAL document type, and it forbids failures of a document type. It sets no form.
A binding can report one entry at the root, as the Python binding does. It can also report one entry for each
unknown root key, as a serde unknown-variant error does. [PRS-012] still requires one entry for each failure, so a
binding does not report the same problem twice.

[PRS-005] rejects a field-name key as an unknown field. A root key in the form of a field name, for example
`component_definition`, leaves the input with no root key. One entry for each unknown root key rejects it as an
unknown field. One entry at the root that states that the input names no document type also rejects it, with the
cause. [PRS-005] needs no change for either form.

Alternative: require exactly one entry at the root, which names each key of the object. It rules out the
unknown-variant form, and it sets the content of a message.

### D4. `expected-max-failures` is a case field that the checker checks for consistency, not by count

Context item 4 shows that an Ajv count is not an entry count. So `npm run corpus:check` cannot derive the maximum. It
checks that each value is consistent with the contract:

1. The case operation is `parse`, and the value is an integer of 1 or more, and not less than `expected-min-failures`.
2. When the input is an object whose root keys name exactly one document type, Ajv reports the input as not valid
   against the branch of that root key. Thus the fault is in the selected document type.
3. When the input is an object with two or more root keys, the case has no `expected-max-failures`, because the
   contract does not say which failures that parse error carries (Non-Goals 2).

The corpus author sets the value to the number of faults of the input. A conformance runner checks that the parse
error carries no more entries than the value.

Alternative: an exact `expected-failures` field. It fixes the count for a binding that reports fewer entries, for
example one entry for two missing fields of one object. [PRS-012] does not require that count, so the field states a
maximum.

### D5. The maximums go on existing cases

The existing cases already cover a fault at the top of a catalog, a deep fault, and an input with no root key. So the
change adds no input. The changed cases:

| Case | `expected-max-failures` | Added to `requirements` |
|---|---|---|
| `parse/unknown-root` | 1 | [PRS-013.02] |
| `parse/name-keyed-field` | 1 | [PRS-013.01] |
| `parse/invalid-uuid` | 1 | [PRS-013] |
| `parse/missing-required-field` | 1 | [PRS-013] |
| `parse/unknown-field-nested` | 1 | [PRS-013] |
| `parse/unknown-field-top` | 1 | [PRS-013] |
| `parse/datetime-without-timezone` | 1 | [PRS-013] |
| `parse/two-failures` | 2 | [PRS-013] |

`parse/unknown-root` has one key, so both forms of D3 give one entry. `parse/closed-enum-out-of-set` gets no maximum
(Non-Goals 1). `parse/not-json` and `parse/invalid-utf8` get no maximum, because a binding reports them before it finds
a document type.

### D6. The release is a minor increment, under the 0.y.z rule

A binding that reports the failures of more than one document type fails the new maximums, and [VER-003] calls a
stricter parse rule a major increment. The version is `0.6.0+oscal.1.2.3`, and Semantic Versioning lets a `0.y.z`
version change anything. The store made the same choice for [PRS-010] in `v0.6.0+oscal.1.2.3`. The Python binding
already meets [PRS-013] ([python#44]).

## Risks / Trade-offs

1. [A binding reports one entry for two faults in one object] → The field is a maximum, not an exact count (D4).
2. [A corpus author sets a maximum below the real fault count] → The conformance runs of the bindings fail on the
   case. The checker cannot catch it (D4), so the review of `cases.json` checks each maximum against the input.
3. [A binding reports a nested-union fan-out for a fault that the cases reach] → No case with a maximum has its fault
   in a nested union (D5). A later change for nested unions can add such cases.
4. [A caller cannot see which key made the input unknown] → The contract does not require the keys (D3). A binding can
   name them, as the Python binding does.

## Migration Plan

1. Sync the delta, update the ledger and the requirement index, and change the checker and the corpus in one pull
   request with the archive of this change.
2. Release the next minor version.
3. Each binding moves its pin, reads `expected-max-failures` in its conformance runner, and cites [PRS-013] in its
   traceability record where it implements it.

[python#41]: https://github.com/cairn-proofs/oscal-bindings-python/issues/41
[python#42]: https://github.com/cairn-proofs/oscal-bindings-python/issues/42
[python#43]: https://github.com/cairn-proofs/oscal-bindings-python/issues/43
[python#44]: https://github.com/cairn-proofs/oscal-bindings-python/pull/44
