# Proposal

## Why

A forward citation makes a reader jump ahead to understand a rule. The main specs hold 15 citations from a
requirement to a requirement below it in the same spec file. No rule or check prevents a new one. #18 applied the rule
"references point backward" only to the requirements that it changed. #31 lists 11 forward citations. Four more came
in after #31 was written: [ELV-001] cites [ELV-004], [ERR-001] cites [ERR-009], and [NAM-022] cites [NAM-004] and
[NAM-013].

## What Changes

1. The order of a spec is its reading order. Identifier order does not matter. In each spec, a requirement cites
   only requirements above it, and uses a term only after the requirement that defines it (design.md, D1).
2. Move requirements in four specs. A move by itself changes no text:
   1. `binding-surface`: the order becomes 002, 001, 003, 005, 006, 004, 007.
   2. `document-parsing`: [PRS-006] moves directly below [PRS-010].
   3. `model-derivation`: [MDL-003] moves directly below [MDL-012].
   4. `naming-manifest`: [NAM-022] moves directly below [NAM-013].
3. Change the text of 9 requirements, with no change of meaning (design.md, D2 and D3):
   1. [SRF-003] drops its citation of the JSON Schema of [SRF-007]. [SRF-007] states that the record of [SRF-003]
      conforms to the JSON Schema.
   2. [PRS-006] replaces "except as [PRS-012] permits" with "unless the parse error identifies a limit of
      [PRS-010]". [PRS-012] drops item 1, which repeats the coverage rule of [PRS-006].
   3. [ELV-001] replaces "except as [ELV-004] permits" with "unless the result identifies a documented limit, as
      [PRS-010] defines".
   4. [ERR-001] drops its last sentence, which repeats the ancestor rule of [ERR-009].
   5. [YML-001] drops its list of three operations. "Conform to each requirement of this capability" already
      requires them.
   6. [YML-003] drops its pointers to [YML-004] and [YML-009]. [YML-004] and its scenario [YML-004.07] drop the
      pointer to [YML-010].
4. Add the rule to the `specs` rules of `openspec/config.yaml` (design.md, D5).
5. Add a `forward-citation` check to `npm run spec-ids`, with self-test scenarios (design.md, D4). The check covers
   the requirement text and the scenarios. It does not count a citation of another spec.
6. No identifier changes. No scenario moves. No requirement or scenario is retired.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `binding-surface`: [SRF-003] and [SRF-007], and the order of the spec.
2. `document-parsing`: [PRS-006] and [PRS-012], and the place of [PRS-006].
3. `element-validation`: [ELV-001].
4. `error-model`: [ERR-001].
5. `yaml-documents`: [YML-001], [YML-003], and [YML-004].

`model-derivation` and `naming-manifest` change only their order. A delta cannot state an order, so these specs have
no delta (design.md, Context).

## Impact

1. `openspec/specs/`: the seven specs above. A manual sync applies the MODIFIED blocks and the moves, in one commit
   with the new check (design.md, D6).
2. `openspec/spec-ids.yaml` and `openspec/requirements.json`: no change. No identifier or title changes, and the
   index is in identifier order.
3. `openspec/config.yaml`: one new `specs` rule. `README.md` states that the specs are in reading order.
4. `scripts/check-spec-ids.ts`: the new check and its self-test scenarios.
5. Corpus: no change. No case cites a moved or retired identifier.
6. Bindings: no change is necessary. No requirement changes its meaning, and each identifier and heading anchor stays.
7. `mise.toml`, `mise.lock`, and `.mise/locks/npm-fission-ai-openspec/`: the pin of the OpenSpec CLI moves from
   1.15.0 to 2.0, in its own commit of the same pull request. The change validates with both versions.
8. `VERSION`: no change. `VERSION` already names the next release, 0.8.0.
9. Threat model: no change is necessary. The private model cites requirement identifiers, and no identifier moves.
