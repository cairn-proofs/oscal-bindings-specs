## Why

The store records the bugs of one binding in contract data. Three corpus cases carry `known-defects` entries for
`oscal-bindings-python`, the `defect-twins` array keeps two of those entries consistent, and [PRS-005] names "a known
defect in one Python runtime". This data ties a store release to the bug lifecycle of a binding. For example, a fix for
cairn-proofs/oscal-bindings-python#6 needs a store release only to remove one entry. The cost grows with each new
binding. Dependencies must go in one direction: a binding pins a spec artifact, and a change in a binding causes no
change in the store (#23).

The binding stopped reading `known-defects` in cairn-proofs/oscal-bindings-python#33. That issue is closed, so this
change can ship now. The binding can move its pin to the first release that holds this change, with no code change.

## What Changes

1. Add [VER-006] and [VER-007] to `schema-versioning`. The store holds no content whose correctness depends on the
   state of a binding, and the store can link known implementations. Each binding keeps its own expected conformance
   failures. Issue #23 drafts these rules as one requirement. The change splits them in two, because one requirement
   must state one behavior in 500 characters or fewer.
2. Remove the `known-defects` field from each case in `corpus/1.2.3/cases.json`, and remove the `defect-twins` array.
3. Change `npm run corpus:check` so that it rejects a case that has a `known-defects` field and a corpus that has a
   `defect-twins` field. Remove the validation of the two fields.
4. Add a store check, `npm run binding-links:check`, that fails when a tracked file outside `openspec/changes/` links
   to an individual issue or pull request in a binding repository. Add it to `npm run check`.
5. Update `corpus/1.2.3/README.md`. Remove the `known-defects` field and the clause that excludes a case that names the
   binding. State that each binding keeps its own expected failures.
6. Change [PRS-005]: remove the sentences about the defect in one Python runtime. The requirement does not change.
7. Add a "Known implementations" section to `README.md`. It links the repository and the issue tracker of each binding.
   It has no link to an individual issue.
8. This change does not set `VERSION` and does not tag a release. A later release, which can hold other changes,
   carries it. That release needs at least a minor increment under [VER-003]. The reason is that [VER-006] and
   [VER-007] are newly specified behavior, and no required behavior of a binding changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `schema-versioning`: add [VER-006], the rule that dependencies go from a binding to the store and never back. Add
   [VER-007], the rule that each binding keeps its own expected conformance failures.
2. `document-parsing`: remove the binding-specific defect sentences from [PRS-005]. The rule and its scenarios stay.

## Impact

1. `openspec/specs/schema-versioning/spec.md` and `openspec/specs/document-parsing/spec.md`: after sync.
2. `openspec/spec-ids.yaml`: `VER` `next` goes from 6 to 8 in the sync commit. `openspec/requirements.json` gets the
   [VER-006] and [VER-007] entries from `npm run requirements:write`.
3. `corpus/1.2.3/cases.json`: three `known-defects` entries and the `defect-twins` array go. No input, expected file,
   expected result, or cited requirement changes.
4. `corpus/1.2.3/README.md`: the conformance sentence and the list of case fields.
5. `scripts/check-corpus.ts`: the check rejects the two fields.
6. `scripts/check-binding-links.ts`: a new check with a self-test. `package.json` gets `binding-links:check` and
   `binding-links:self-test` in the `check` chain.
7. `README.md`: the "Known implementations" section and the new check in the check list.
8. `VERSION`: no change. The release that carries this change sets the version.
9. Bindings: no binding code changes. `oscal-bindings-python` keeps its expected failures in its own repository
   (cairn-proofs/oscal-bindings-python#33) and can move its pin to the first release that holds this change.
10. No change to the naming manifest, the schemas, or the CI workflow.
