# Proposal

## Why

OpenSpec 1.15.0 reports a requirement text over 500 characters as a `WARNING`, and `openspec validate --all --strict`
fails on a warning (#18). OpenSpec 1.13.0 reports the same finding as `INFO`. With 1.15.0, 25 requirements in 8 of the
11 main specs are over the limit, so `npm run check` fails. CI passes only because it installs the pinned 1.13.0. A
long requirement also states more than one behavior, so a binding cannot cite one behavior by its identifier.

## What Changes

1. Shorten each of the 25 requirements to 500 characters or less, with no change of meaning. The requirements are
   [FAC-004], [PRS-007], [PRS-009], [ERR-001], [MDL-001], [MDL-002], [MDL-005], [MDL-006], [MDL-007], [MDL-009],
   [MDL-010], [MDL-011], [MDL-013], [NAM-001] to [NAM-008], [VER-003], [VER-004], [SER-004], and [YML-005]. The
   issue lists 24. [YML-005] went over the limit after the issue was written.
2. Move examples and edge cases into scenarios. Move each separate rule into a new requirement with its own scenarios
   (design.md, D2). The change adds 26 requirements: [FAC-005], [FAC-006], [ERR-004] to [ERR-008], [MDL-014] to
   [MDL-021], and [NAM-009] to [NAM-019].
3. References point backward only (design.md, D3). An existing requirement does not cite a requirement that this
   change adds. Each new requirement is placed below each requirement that it cites, as near to its source as that
   allows.
4. Each scenario is under the requirement whose rule its THEN clause tests. 29 scenarios move to a new requirement,
   with a new identifier. Each old scenario identifier is retired with `replaced_by`. Each existing requirement
   identifier and title stays.
5. Change [MDL-012], so that it names the owner type directly and does not cite the enum naming rule.
6. Update the citations of the moved scenarios in the corpus and in the labels of the script self-tests.
7. Move the pin of the OpenSpec CLI from 1.13.0 to 1.15.0 in `mise.toml`, `mise.lock`, and the `.mise/locks`
   sidecar, in the same pull request, after the split.
8. A binding traceability record ([SRF-003]) does not have to cite a new identifier. Each existing requirement
   identifier stays live.
9. This change does not set `VERSION`. The release that carries the change decides the increment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-facade`: shorten [FAC-004] to the accessor and its restriction. Add [FAC-005], the period of an
   Assessment Plan, and [FAC-006], the period of Assessment Results.
2. `document-parsing`: shorten [PRS-007] and [PRS-009].
3. `error-model`: shorten [ERR-001] to the five categories. Add one requirement for each category: [ERR-004] parse
   error, [ERR-005] document-type mismatch, [ERR-006] not-found, [ERR-007] access error, and [ERR-008] unknown element
   type.
4. `model-derivation`: shorten [MDL-001], [MDL-002], [MDL-005], [MDL-006], [MDL-007], [MDL-009], [MDL-010],
   [MDL-011], [MDL-012], and [MDL-013]. Add [MDL-014] to [MDL-021].
5. `naming-manifest`: shorten [NAM-001] to [NAM-008]. Add [NAM-009] to [NAM-019].
6. `schema-versioning`: shorten [VER-003] and [VER-004].
7. `serialization`: shorten [SER-004].
8. `yaml-documents`: shorten [YML-005].

## Impact

1. `openspec/specs/`: the 8 specs above. The sync is a manual edit, because OpenSpec 1.15.0 does not apply a delta
   that removes a scenario from a requirement that stays (design.md, D7).
2. `openspec/spec-ids.yaml`: in the sync commit, `next` becomes 7 for `FAC`, 9 for `ERR`, 22 for `MDL`, and 20 for
   `NAM`. 29 `retired` entries, one for each moved scenario, each with `replaced_by`.
3. `openspec/requirements.json`: `npm run requirements:write` adds 26 entries. No title changes.
4. Corpus: `corpus/1.2.3/cases.json` cites [ERR-001.01] to [ERR-001.06] 9 times. Each citation changes to the new
   scenario identifier. No case changes its input or its expected result.
5. Scripts: the labels of self-tests in `scripts/names.ts` and `scripts/check-releases.ts` name moved scenarios. The
   labels change. No check changes.
6. `mise.toml`, `mise.lock`, and `.mise/locks/npm-fission-ai-openspec/`: the pin moves to 1.15.0. CI installs 1.15.0
   from the lockfile.
7. Bindings: no change is necessary. A binding can cite a new identifier when it moves its pin. A binding test that
   names a moved scenario can use its new identifier.
8. `VERSION`: no change. The release decides the increment under [VER-003].
9. #13 also edits `mise.toml` and `mise.lock`. The pull request that merges second resolves the conflict.
10. Threat model: the private model in `./threat-models/` cites [NAM-008] for the release baseline, which moves to
    [NAM-018]. A pass after the sync updates each citation whose rule moved. The model is a separate repository, so
    its commit is not in the pull request of this change.
11. No change to the naming manifest or the schemas.
