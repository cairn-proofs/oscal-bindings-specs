## Why
[ELV-002] makes each element-type name the kebab-case form of a canonical type name. It does not state which kinds of
canonical type have an element-type name ([#40]). The naming manifest of OSCAL 1.2.3 has 244 types of six kinds: 177
`object`, 44 `enum`, 13 `union`, 8 `document`, 1 `single-or-many`, and 1 `document-union`. The two bindings return
different lists for [ELV-002.01]:
1. cairn-proofs/oscal-bindings-python returns 188 names. They are the names of the 177 objects, the 8 documents,
   `mapping-collection-mappings`, `oscal-document`, and `root-model`. The list has no enum and no union. `root-model`
   is not a canonical type name. So a caller can validate `parameter-with-select` but not `parameter`.
2. cairn-proofs/oscal-bindings-typescript returns the 244 names of the manifest types
   (`src/generated/element-types.ts`, [typescript#7]).
The corpus checks four element-type names and one unknown name, so both bindings pass it.
## What Changes
1. **BREAKING** Change [ELV-002]. Each type of the naming manifest has an element-type name, whatever its kind. The
   kinds are the kinds of [NAM-010]. The requirement excludes no kind, so this states the reading of the current text
   that the TypeScript binding uses. It is a break for a binding that leaves out a kind.
2. Change the body of [ELV-002.01]. The list holds the element-type name of each type of the naming manifest.
3. Add the corpus operation `element-types` and one case of it, which cites [ELV-002.01]. The case compares the list
   of the binding with the expected file `expected/element-types.json`. `npm run corpus:write` generates that file
   from `manifest/1.2.3/names.json`, and `npm run corpus:check` fails when the file differs.
4. Make no change to `VERSION`. It is `0.8.0+oscal.1.2.3`, and no release has that version yet. The change
   `clarify-manifest-consumer-rules` set it for a break, and the next release carries this break too.
## Capabilities
### New Capabilities
None.
### Modified Capabilities
1. `element-validation`: [ELV-002] and the body of [ELV-002.01] change.
## Impact
1. `openspec/specs/element-validation/spec.md`: [ELV-002] and [ELV-002.01].
2. `corpus/1.2.3/cases.json`, `corpus/1.2.3/README.md`, and the new file `corpus/1.2.3/expected/element-types.json`.
3. `scripts/check-corpus.ts`: the new operation.
4. No change to `openspec/spec-ids.yaml` or `openspec/requirements.json`, because no identifier or title changes.
5. Bindings: when a binding moves its pin to the release that carries this change, its corpus runner must run the
   `element-types` operation. The Python binding must add the 44 enums and the 13 unions to its list and remove
   `root-model`. The TypeScript binding returns the expected list now.
6. No change to the manifest, the JSON Schemas, or the CI workflow.
[#40]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/40
[typescript#7]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/7
