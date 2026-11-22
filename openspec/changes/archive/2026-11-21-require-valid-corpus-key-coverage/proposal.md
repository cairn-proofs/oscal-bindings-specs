# Proposal

## Why

The valid corpus must let a binding test a round trip of each structure that real OSCAL content
uses (#59, #164). Pull request #164 added `catalog-unused-structures.json` and
`profile-unused-structures.json` for this purpose. No check reads the keys of the valid documents
(#165). A later edit can remove a key from these documents, and every check of the store still
passes. The structure is then untested again.

## What Changes

1. A new file, `corpus/1.2.3/required-keys.json`, lists the key pairs that the valid corpus must
   use. The 23 pairs are the ones that #59 names.
2. A new requirement, SER-006, states that the valid corpus uses each listed pair.
3. `scripts/check-corpus.ts` gets check 19, which reads the file and fails for each pair that no
   JSON document in `documents/valid/` uses. A self-test of the check covers SER-006.01.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `serialization`: the new requirement SER-006 and the scenario SER-006.01.

## Impact

1. `openspec/specs/serialization/spec.md`, `openspec/spec-ids.yaml`: the sync of the delta.
2. `openspec/coverage.json` and `openspec/requirements.json`: regenerated after the sync.
3. `corpus/1.2.3/README.md`: describes the check.
4. `VERSION`: no change. A pending increment (0.10.0, above the release v0.9.0) already covers
   this change.
5. Each binding: no change. The check reads the corpus only.
