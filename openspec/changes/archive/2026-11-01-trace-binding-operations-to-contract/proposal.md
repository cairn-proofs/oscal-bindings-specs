## Why

No contract rule limits the public operations of a binding. cairn-proofs/oscal-bindings-python#7 planned a YAML API in
the Python binding before the contract defined YAML (#16). If each binding adds operations by itself, the bindings
implement those operations differently, and nobody sees that the contract forks. This change adds the rule and the
data that a binding needs to check the rule mechanically (#17).

## What Changes

1. Add a contract rule: a binding exposes a public operation only when a contract requirement defines it, or when the
   operation is binding-local. A binding-local operation composes contract operations with language-specific
   adaptation only. It decides nothing about accepted input, produced output, or reported errors, and it gives no
   alternative behavior for a contract operation.
2. Exclude the generated model types and their members from the rule. The naming manifest and the `model-derivation`
   requirements already govern them.
3. Require each binding to keep a traceability record. The record lists each public operation and the contract
   requirements or the one binding-local requirement that covers it.
4. Add the promotion rule. When the contract defines an operation that a binding declared binding-local, that binding
   makes the operation conform or deprecates it.
5. Generate a requirement index, `openspec/requirements.json`, from the main specs. Each entry holds the requirement
   identifier, the capability, and the title. `npm run check` fails when the committed index differs from the
   generator output. The spec artifact holds the index.
6. Publish a JSON Schema for the traceability record, so that every binding keeps the record in one shape.
7. Document the promotion path for contributors in a new `CONTRIBUTING.md`.
8. Release the spec artifact as `0.4.0+oscal.1.2.3`, a minor increment (design.md, D5).

## Capabilities

### New Capabilities

1. `binding-surface`: the operations that a binding can expose, the traceability record, the promotion rule, the
   requirement index, and the JSON Schema of the record.

### Modified Capabilities

None.

## Impact

1. `openspec/specs/binding-surface/spec.md`: a new capability with the prefix `SRF`, after sync.
2. `openspec/requirements.json`: a new generated file. `openspec/traceability.schema.json`: a new JSON Schema.
3. `scripts/`: a new generator for the index with a check mode and a self-test. `scripts/build-archive.ts` adds the
   index and the record schema to the archive. `package.json` adds the new check to `npm run check`.
4. `README.md` and the new `CONTRIBUTING.md`: the new files and the promotion path.
5. `VERSION`: `0.3.0+oscal.1.2.3` to `0.4.0+oscal.1.2.3`.
6. Bindings: each binding adds a traceability record and a check of its public surface. The check is out of scope
   here. The Python binding exports 34 names in `oscal_bindings.v1.__all__`. 10 of them are generated model types,
   so its record has about 24 entries.
7. Contributors: a change that adds, renames, or retires a requirement also regenerates the index.
8. No change to the naming manifest, the schemas, or the corpus.
