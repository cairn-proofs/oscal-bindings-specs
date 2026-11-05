# Design

## Context

See [proposal.md](proposal.md#why) for the motivation. These facts shape the approach:

1. OpenSpec 1.15.0 measures the text between the requirement heading and the first scenario. The count includes list
   markers, indentation, and line breaks. The limit is 500 characters (`MAX_REQUIREMENT_TEXT_LENGTH` in
   `dist/core/validation/constants.js`). `openspec show <spec> --type spec --json` gives the same text as `text`.
2. With 1.15.0, `openspec validate --all --strict` flags 25 requirements in 8 specs. #18 lists 24. [YML-005] is the
   added one. It is 515 characters.
3. Five requirements that this change does not touch are near the limit: [PRS-010] (491), [VER-006] (494), [YML-003]
   (494), [YML-004] (493), and [BMB-003] (471).
4. OpenSpec 1.15.0 does not apply a MODIFIED block that drops a scenario that the main spec has. `openspec validate`
   reports it as an error, and `openspec archive` refuses it, also with `--no-validate`. A requirement in both ADDED
   and REMOVED is also an error. When the main specs already match the deltas, the change validates, and
   `openspec archive` reports "Specs already in sync".
5. `corpus/1.2.3/cases.json` cites [ERR-001.01] to [ERR-001.06] in 9 `requirements` fields. The self-test labels in
   `scripts/names.ts` and `scripts/check-releases.ts` name scenarios such as `MDL-007.04` and `NAM-008.03`. No spec,
   doc, or script cites a list item of an affected requirement by number.
6. [SRF-003] requires a traceability record entry to hold "the identifiers of the contract requirements that define
   the operation". [SRF-004] resolves an identifier only when it is live in the index of the pinned version. A record
   holds requirement identifiers, not scenario identifiers.
7. The working tree already sets 1.15.0 in `mise.toml`. `mise.lock` and the sidecar
   `.mise/locks/npm-fission-ai-openspec/1.13.0/` still name 1.13.0. CI installs from the lockfile with `--locked`.

## Goals / Non-Goals

**Goals:**

1. `npm run check` passes with OpenSpec 1.15.0, and CI installs 1.15.0.
2. Each affected requirement keeps its meaning, its identifier, and its title.
3. A reader of a changed or new requirement never meets a citation of a requirement below it.
4. A reviewer can trace each sentence that leaves a requirement to the place where it now is.

**Non-Goals:**

1. A change of behavior. A new requirement or scenario states only what the old text stated.
2. A margin under the limit for requirements that this change does not touch (Context, item 3).
3. The forward citations in requirements that this change does not touch. A simulated sync found 11: [SRF-001] cites
   [SRF-002], [SRF-003] cites [SRF-007], [SRF-004] cites [SRF-006], [PRS-006] cites [PRS-012], [MDL-003] cites
   [MDL-012], [YML-001] cites [YML-005], [YML-006], and [YML-008], [YML-003] cites [YML-004] and [YML-009], and
   [YML-004] cites [YML-010]. #31 covers them, with a rule and a check.
4. A rename of a requirement title. A title change would change `openspec/requirements.json` for no behavior.
5. The release and the `VERSION` increment.
6. A change to a binding.

## Decisions

### D1: `openspec validate --strict` with 1.15.0 is the test for length

The change uses the CLI as the oracle, not a local count. Each modified and added requirement is 500 characters or
less. The longest is [NAM-007], at 495.

Alternative: a target such as 450 characters for margin. Rejected, because it forces splits that the behavior does
not call for.

### D2: Shorten first, then split each separate rule

For each requirement, the change applies these steps in order:

1. Remove an example that a scenario of the requirement already shows.
2. Move an example or an edge case into a new scenario of the same requirement.
3. Remove a sentence that explains a rule but states no rule, and replace a restatement with a citation. A
   descriptive sentence never becomes a SHALL or a MUST, because that adds an obligation.
4. Move each separate rule into a new requirement. A rule is separate when it carries its own obligation and has, or
   needs, its own scenario. A list that is one rule as a whole stays in one requirement, for example the six entry
   kinds of [NAM-010] or the six manifest outputs of [MDL-009].

Steps 1 to 3 were enough for 10 of the 25 requirements: [PRS-007], [PRS-009], [MDL-002], [MDL-005], [MDL-006],
[MDL-010], [VER-003], [VER-004], [SER-004], and [YML-005]. [MDL-010] also got a moved scenario. The other 15 needed
step 4: [FAC-004], [ERR-001], [MDL-001], [MDL-007], [MDL-009], [MDL-011], [MDL-013], and [NAM-001] to [NAM-008].
[MDL-012] is not one of the 25. It changes only to remove its citation of the enum naming rule.

The five error categories show the test. Each category carries its own obligation, for example "names the path" or
"names the expected type", and each had its own scenario. So each category is its own requirement, [ERR-004] to
[ERR-008].

Alternative: one new requirement for each group of rules, sized to the limit. Rejected, because the grouping then
follows the character count, not the behavior.

### D3: References point backward, and scenarios go with their rule

These rules apply to each requirement that the change modifies or adds:

1. An existing requirement does not cite a requirement that this change adds.
2. A new requirement is placed below each requirement in its spec that it cites, as near to its source as that allows.
   OpenSpec does not require identifier order in a spec file, and `npm run spec-ids` does not check it.
3. A scenario is under the requirement whose rule its THEN clause tests. When that rule moves, the scenario moves with
   it, and gets the next free identifier of its new requirement. The text of a moved scenario does not change.

The sync places the new requirements in this order. Other specs add their new requirements at the end.

| Spec | Requirement order after the sync |
|---|---|
| `model-derivation` | 001, 014, 015, 016, 017, 002, 003, 005, 006, 007, 008, 009, 010, 011, 018, 012, 013, 019, 020, 021 |
| `naming-manifest` | 001, 009, 002, 010, 011, 003, 012, 004, 013, 014, 005, 015, 006, 016, 007, 017, 008, 018, 019 |
| `document-facade` | 001, 002, 003, 004, 005, 006 |
| `error-model` | 001, 002, 003, 004, 005, 006, 007, 008 |

[MDL-014], the local name of a place, is directly after [MDL-001], because [MDL-002] to [MDL-012] use local names.
[MDL-021], the guards for a missing singular name, an ambiguous branch, and an unequal merge, is last. It cites
[MDL-006], [MDL-013], [MDL-014], and [MDL-019].

A simulated sync in a scratch copy gave no citation from a changed or new requirement to a requirement below it.

Alternative: keep each scenario under its old requirement, and let the old requirement cite the new one. Rejected by
the user, because a forward reference makes a reader jump ahead to understand a rule.

### D4: Where each removed sentence goes

| Requirement | Sentences that leave the text | New place |
|---|---|---|
| [FAC-004] | The aggregation of task timing, and empty bounds | [FAC-005] |
| [FAC-004] | The aggregation of result dates, and empty bounds | [FAC-006] |
| [PRS-007] | "Target languages differ" examples | Removed (step 3), and [PRS-007.03] for the Unicode flag |
| [PRS-009] | "because the document does not conform", "in the ... capability" | Removed (step 3) |
| [ERR-001] | The meaning of each category | [ERR-004] to [ERR-008] |
| [ERR-001] | "Each situation listed in the following scenarios MUST map to exactly one category" | Removed (D5) |
| [ERR-001] | "A schema-conformance parse error carries structured per-location detail" | [ERR-004] cites [ERR-003] |
| [MDL-001] | The local name of a place | [MDL-014] |
| [MDL-001] | The canonical name of a definition | [MDL-015] |
| [MDL-001] | The canonical name of the root schema | [MDL-016] |
| [MDL-001] | The status of an override name | [MDL-017] |
| [MDL-001] | "The rules for the other kinds of type are in [MDL-002], ..." | Removed (step 3, a forward citation) |
| [MDL-002] | The eight wrapper names | [MDL-002.03] |
| [MDL-005] | The `control-implementation` example, and "as the naming-manifest capability defines" | Removed (steps 1 and 3) |
| [MDL-006] | The examples, and "the naming manifest can replace a branch name" | Removed (step 1), [MDL-017] |
| [MDL-007] | Guards 4, 5, and 6, and "report every failure at once" | [MDL-021] |
| [MDL-009] | "machine-readable", and "The naming-manifest capability defines the format" | Removed (step 3). [NAM-002] states the format. |
| [MDL-009] | "Casing conventions remain language-specific", and "a binding consumes one entry per canonical type" | Removed (step 3) |
| [MDL-010] | The `status` example, and "an override name therefore also changes" | Removed (steps 1 and 3) |
| [MDL-011] | "The complete schema holds each enum inside a property" | Removed (step 3) |
| [MDL-011] | The canonical name of an enum, the owner type, a direct enum | [MDL-018] |
| [MDL-011] | "The values come from the schema. Member names are language-specific." | [NAM-011] |
| [MDL-012] | The `mappings` example, and the citation of [MDL-011] for the owner type | Removed (step 1), stated |
| [MDL-013] | The examples `property`, `link`, and `hash`, background on how the schema defines and copies types, the enum example | Removed (steps 1 and 3) |
| [MDL-013] | "Structurally identical", and "[MDL-007] defines the failure" | [MDL-019]. [MDL-021] cites [MDL-019] for the failure. |
| [MDL-013] | A merge is not a name collision | [MDL-020] |
| [NAM-001] | The pointer constraints, and the definition of a scalar definition | [NAM-009], which cites [MDL-003] for the definition |
| [NAM-002] | The kinds and their data | [NAM-010] |
| [NAM-002] | "does not record field names, enum values, or enum member names" | [NAM-011] |
| [NAM-003] | Format version and OSCAL release rules | [NAM-012] |
| [NAM-003] | "A final newline ... breaks the rule" | Removed (step 1, [NAM-003.03]) |
| [NAM-004] | The constraints of the JSON Schemas | [NAM-013] |
| [NAM-004] | How a consumer writes a manifest string into code | [NAM-014] |
| [NAM-005] | The resolve and effect checks of the override file | [NAM-015] |
| [NAM-006] | The check of the previous manifest before use | [NAM-016] |
| [NAM-007] | The report of dropped names | [NAM-017] |
| [NAM-008] | The latest released artifact | [NAM-018] |
| [NAM-008] | The failure when the tags cannot be read | [NAM-019] |
| [VER-003] | The examples of each increment | [VER-003.03], [VER-003.04], [VER-003.05] |
| [VER-004] | The example `2.4.1+oscal.1.2.3` | [VER-004.04] |
| [SER-004] | The summary of the canonical form | Removed (step 3), and [SER-004.03] |
| [YML-005] | No sentence. The wording is shorter. | None |

These rows need a reviewer's check, because the new text is not a copy of the old text:

1. [MDL-010]: "An override name of a type therefore also changes the canonical names of the inline types that it
   holds." The kept sentence "The canonical name of the parent includes any override name of the parent" gives the
   same result, and [MDL-010.05] shows it.
2. [MDL-006]: "The naming manifest can replace a branch name with an override name." [MDL-017] states this for each
   rule-derived name, and a branch name is a rule-derived name.
3. [NAM-016] cites [NAM-003], [NAM-012], [NAM-004], and [NAM-013]. The old text cited [NAM-003] and [NAM-004], which
   then held the rules that [NAM-012] and [NAM-013] now hold. So the check keeps its scope.

### D5: [ERR-001] states the taxonomy, and each category states its own rule

[ERR-001] keeps the five categories and the rule that a category does not depend on how a language surfaces an error.
Its sentence "Each situation listed in the following scenarios MUST map to exactly one category" did two jobs. It made
the scenarios normative, and it kept the categories exclusive. The scenarios now are under the requirement of their
category, so the first job goes. The second job stays: [ERR-001] states "Each error situation MUST map to exactly one
category, except that a document-type mismatch is also a parse error."

Two points need a reviewer's check:

1. The old rule covered "each situation listed in the following scenarios". The new rule covers each error situation.
   The old scenarios covered each category, so the intent was the whole taxonomy.
2. The old text required exactly one category, and also said that a document-type mismatch is a parse error. Those
   two statements disagreed. The new text states the mismatch as the one exception, and [ERR-005] states it again.

### D6: Moved scenarios retire their old identifier

Each of the 29 moved scenarios gets a new identifier under its new requirement. The sync commit adds a `retired` entry
for each old identifier, with `replaced_by` the new identifier and a reason. In the same commit, the 9 corpus citations
and the self-test labels change to the new identifiers. `npm run spec-ids` checks that each `replaced_by` is live.

Alternative: keep the old identifier on the scenario under the new requirement. Rejected, because the identifier
rules require the scenario prefix to be the identifier of its requirement, and `npm run spec-ids` rejects a scenario
under another requirement.

### D7: A manual sync, in one commit with the planning artifacts

OpenSpec 1.15.0 cannot apply the deltas of this change, because 12 MODIFIED blocks drop a moved scenario (Context,
item 4). So the sync edits `openspec/specs/` by hand to match the deltas, and places the new requirements as D3 states.
Until the sync, `openspec validate split-long-requirements` fails, because the main specs still hold the moved
scenarios. The planning artifacts and the sync therefore go in one commit, so that each commit passes `npm run check`.

`openspec validate` checks only that no MODIFIED block drops a scenario. It does not compare text, so it cannot show
that the manual sync matches the deltas. `openspec archive` compares the text, and prints "Specs already in sync; no
files changed" only when each block matches. The sync runs it in a scratch copy as its test (tasks 1.2 and 1.8).

The commits of the pull request are in this order:

1. The planning and sync commit: the change, the main specs, `openspec/spec-ids.yaml`, `openspec/requirements.json`,
   the corpus citations, and the self-test labels. It passes `npm run check` with 1.13.0 and with 1.15.0.
2. The pin commit: `mise.toml`, `mise.lock`, and the sidecar. `mise lock` regenerates `mise.lock` and writes the
   sidecar under `.mise/locks/npm-fission-ai-openspec/1.15.0/`. The 1.13.0 sidecar goes.
3. The archive commit. `openspec archive` reports "Specs already in sync" and changes no spec.

A simulation in a scratch copy gave these results after the manual sync: `openspec validate --all --strict` passed 12
of 12 items, `npm run spec-ids` passed with the 29 `retired` entries, `corpus:check` passed with the changed
citations, and `openspec archive` changed no spec.

Alternative: keep each moved scenario under its old requirement, so that `openspec archive` applies the deltas.
Rejected, because it keeps the forward references of D3.

Alternative: a planning commit before the sync commit. Rejected, because that commit fails `openspec validate`.

### D8: A traceability record does not have to cite a new identifier

Each old requirement identifier stays live. An entry that holds the old identifier therefore still names a
requirement that defines the operation ([SRF-003]), and it still resolves ([SRF-004]). A binding can add a new
identifier when it moves its pin. A record holds no scenario identifiers, so a moved scenario does not affect it.

Alternative: require each binding to cite each new identifier. Rejected by the user. It makes each binding change its
record for a release that changes no behavior.

### D9: The release decides the version increment

This change does not set `VERSION`. It changes no behavior. It adds 26 requirement identifiers, moves 29 scenarios,
and adds new scenarios. [VER-003] has a minor increment for "newly specified behavior" and a patch increment for "a
prose clarification". The release that carries this change chooses between them, with these facts.

### D10: A pass over the threat model follows the sync

The private threat model in `./threat-models/` cites requirement identifiers in threat statements and comments. A
citation stays live, because the change retires no requirement identifier, but it can name a requirement whose rule
moved. At planning time the model cites [NAM-008], [PRS-010], [SRF-001], [VER-005], [VER-005.02], [VER-006], and
[VER-007]. Only [NAM-008] is in D4. Threat 22 cites it as the source of the release baseline, and [NAM-018] now holds
that rule.

The pass runs after the sync, against the synced main specs, so that it checks the final text. It uses the
threat-composer tools, so that the model stays valid. The model is a separate repository on its own branch, and
`/threat-models/` is ignored here, so its commit is separate from the pull request of this change.

Alternative: update the model before the sync, from the deltas. Rejected, because a later edit of a delta can move a
rule again.

## Risks / Trade-offs

1. [A reader takes a new requirement as new behavior] → D4 maps each moved sentence to its new place. The proposal
   states that no behavior changes.
2. [A reader expects identifier order in a spec file] → D3 places a new requirement by its citations, so
   `model-derivation` and `naming-manifest` are not in identifier order. `openspec/requirements.json` stays in
   identifier order.
3. [The manual sync differs from the deltas] → `openspec validate` does not compare the text of a MODIFIED block with
   the main spec. A test changed MUST to MAY in a synced main spec, and validate still passed. Only
   `openspec archive` compares the text. So tasks 1.2 and 1.8 run it in a scratch copy and require "Specs already in
   sync; no files changed".
4. [A binding test names a moved scenario] → The `replaced_by` entries name each new identifier. The release notes can
   list them.
5. [A binding reads [SRF-003] as "cite each requirement that defines part of the operation"] → D8 states the reading.
   If a binding asks, a follow-up change can state it in [SRF-003].
6. [A later edit pushes a requirement over 500 characters] → `npm run check` runs `openspec validate --strict`, so the
   pull request fails. Context, item 3, lists the requirements with the least margin.
7. [#13 also edits `mise.toml` and `mise.lock`] → The pull request that merges second resolves the conflict and runs
   `mise lock` again.

## Migration Plan

1. After the merge, a binding that moves its pin needs no change to its traceability record. A binding test or a
   binding document that names a moved scenario can use the `replaced_by` identifier.
2. Rollback: revert the pull request. The revert also restores the ledger, the index, the corpus citations, and the
   pin.
