# Design

## Context

See [proposal.md](proposal.md#why) for the motivation. These facts shape the approach:

1. A delta cannot state the order of requirements in a spec file. `openspec archive` replaces a MODIFIED block in
   its place and adds an ADDED block at the end of the spec. OpenSpec does not require identifier order in a spec
   file. `model-derivation` and `naming-manifest` are not in identifier order since #18.
2. `openspec archive` compares the text of each MODIFIED block with the main spec. When each block matches, it prints
   "Specs already in sync; no files changed". The order of the requirements does not affect this result.
3. A new identifier is always the next number of its prefix, and an identifier is never reused. So identifier order
   can match reading order only when no requirement needs a requirement with a higher number.
4. `npm run spec-ids` (`scripts/check-spec-ids.ts`) checks the identifier rules, citations, and spec links of the
   main specs. Each failure starts with the name of its rule. A self-test runs each rule on in-memory specs.
5. Citations between spec files form cycles. For example, `document-parsing` cites `error-model`, and `error-model`
   cites `document-parsing`. Spec files have no order relative to each other.
6. Agents read the spec files, and an agent can stop at the first rule that seems to answer its question. A reader
   finds a requirement by its identifier with `grep`, `openspec show`, a heading anchor, or
   `openspec/requirements.json`, in any order of the file.

## Goals / Non-Goals

**Goals:**

1. In each spec, no requirement cites a requirement below it, and `npm run check` fails on a new forward citation.
2. In each spec, each term is defined before its first use.
3. A rule that has an exception states that the exception exists.
4. Each requirement keeps its meaning, its identifier, its title, and its scenarios.

**Non-Goals:**

1. Identifier order in a spec file.
2. An order for the spec files, or a rule for citations between spec files.
3. A viewer that shows the specs in another order.

## Decisions

### D1: Reading order, not identifier order

The order of a spec is the order in which a reader meets its rules. A requirement goes below each requirement of its
spec that it cites, and below each requirement that defines a term that it uses. The identifiers do not decide the
order (Context, item 3).

The four moves of [proposal.md](proposal.md#what-changes), item 2, each meet this rule:

| Move | Terms and citations above the moved requirement |
|---|---|
| `binding-surface`: 002, 001, 003, 005, 006, 004, 007 | [SRF-002] defines "binding-local", [SRF-003] defines the traceability record, and [SRF-006] defines the requirement index. Each term first occurs in the requirement that defines it. |
| [PRS-006] below [PRS-010] | [PRS-010] defines a limit. [PRS-007] to [PRS-010] use no term of [PRS-006]. [PRS-011] and [PRS-012], which refine [PRS-006], follow it directly. |
| [MDL-003] below [MDL-012] | [MDL-012] defines the single-or-many kind. No requirement from [MDL-005] to [MDL-012] uses a term of [MDL-003]. |
| [NAM-022] below [NAM-013] | [NAM-022] orders the checks of [NAM-004] and [NAM-013]. [NAM-004] and [NAM-013] do not use "consumer" or "format version". |

Alternative: identifier order, with the text rewritten so that no requirement needs a higher number. Rejected,
because a rule could then state its exception only with a forward citation, or not at all. `model-derivation` and
`naming-manifest` would also need new identifiers for about a dozen requirements each.

Alternative: identifier order in the files, and a viewer that shows reading order. Rejected, because agents and
reviewers read the files (Context, item 6). A viewer also sees citations only, not the use of a term.

### D2: Each rule is stated once, in the requirement whose scenarios test it

In a citation loop, a rule cites its refinement, and the refinement cites the rule back. When the refinement already
states the rule, the rule is stated twice. The change removes the forward pointer. When the rule is stated twice, the
change keeps the statement in the requirement whose scenarios test it:

| Rule | Stays in | Because | Leaves |
|---|---|---|---|
| Structured entries cover each failure | [PRS-006] | [PRS-006.01] tests it | [PRS-012], item 1 |
| An error is in each ancestor of its category | [ERR-009] | [ERR-009.01] and [ERR-009.02] test it | [ERR-001] |

These pointers state no rule, and the change removes them:

1. [YML-001] lists the three YAML operations of [YML-005], [YML-006], and [YML-008]. Each of these requirements
   states "SHALL provide", and [YML-001] requires a binding with YAML support to conform to each requirement of the
   capability. [YML-001.02] still holds. [YML-001] stays first, because it defines that the capability is optional,
   and [YML-007] uses "a binding that offers YAML".
2. [YML-003] item 3 drops "as [YML-004] defines". [YML-003] item 4, "An alias gives a value as [YML-009] defines",
   goes. [YML-009] states the alias rule in full.
3. [YML-004] and [YML-004.07] drop "as [YML-010] defines". [YML-004.07], [YML-004.08], and [YML-004.10] test the
   parse error of [YML-004]. [YML-010] states its location and its structured entry.
4. [SRF-003] drops "that conforms to the JSON Schema of [SRF-007]". [SRF-007] states "The record SHALL conform to
   it", and cites [SRF-003] for the record. Without this, the record and its JSON Schema would each need to come
   first.

### D3: A rule with an exception states it, with a backward citation

An agent can stop at a rule that seems absolute (Context, item 6). So a rule that has an exception states that the
exception exists. The definition that the exception needs comes first, so that the rule cites it backward:

1. [PRS-006]: "The detail SHALL cover each failure, unless the parse error identifies a limit of [PRS-010]."
   [PRS-006] moves below [PRS-010] (D1). [PRS-011] and [PRS-012] then state the conditions of the exception.
2. [ELV-001]: "The list covers each failure, unless the result identifies a documented limit, as [PRS-010]
   defines." [ELV-004] cannot go above [ELV-001], because it limits the operation that [ELV-001] defines. So [ELV-001]
   cites the definition of a documented limit in `document-parsing`, which [ELV-004] also builds on. [ELV-004] does
   not change.
3. [MDL-003] keeps its text. It names the single-or-many kind as an exception, and it moves below [MDL-012], which
   defines that kind (D1).

Alternative: the rule states no exception, and the later requirement opens with "As an exception to [X]". Rejected,
because a reader who stops at the rule does not learn of the exception.

Alternative: allow a forward citation in the form "except as [X] permits". Rejected, because the rule then has an
exception, and reading order makes it unnecessary.

### D4: The `forward-citation` check

`checkSpecIds` gets one more rule, `forward-citation`. It reads each main spec, as the other rules do:

1. The unit is a requirement block: from its heading to the next requirement heading. The block includes the
   scenarios.
2. A citation counts when it names a requirement of the same spec file, or a scenario of one. A scenario citation
   counts as a citation of its requirement. A citation of the requirement's own identifier or its own scenarios
   does not count.
3. A citation fails when its requirement is below the citing requirement in the file.
4. Code spans and fenced code do not count, as for the `citation` rule.
5. The failure names the file, the line, the citing requirement, and the cited identifier, for example
   `[forward-citation] openspec/specs/x/spec.md:12: WID-001 cites WID-002, which is below it.`

The self-test adds these scenarios:

1. A backward citation passes.
2. A forward citation in the requirement text fails.
3. A forward citation in a scenario fails.
4. A forward citation of a scenario identifier fails.
5. A citation of the requirement's own scenario passes.
6. A citation of another spec passes.
7. A forward citation in a code span passes.
8. A backward citation of a requirement with a higher identifier passes.

The tasks also verify that `npm run check` fails when a main spec holds a forward citation.

The check does not test the use of a term, or whether a rule states its exception. Authors and reviewers apply those
parts of the rule.

Alternative: check the requirement text only. Rejected, because a reader of a scenario meets the same forward jump.

Alternative: count citations of other spec files. Rejected, because spec files have no order (Context, item 5).

### D5: The rule in `openspec/config.yaml`

The `specs` rules get one rule. It states these points:

1. A requirement, with its scenarios, cites only requirements above it in its spec file.
2. A requirement uses a term only below the requirement that defines it.
3. A rule that a later requirement makes an exception to states that the exception exists, and cites a requirement
   above it for the condition.
4. Requirements are in reading order. Identifier order does not matter.
5. `npm run spec-ids` checks point 1 on the main specs.

A delta does not get the check. Its order is fixed only at the sync (Context, item 1). An ADDED requirement goes to
the end, so it cites backward. A MODIFIED requirement that cites a requirement below it fails `npm run check` in the
sync commit. The sync commit can move a requirement to meet the rule.

### D6: A manual sync, before the archive

The sync commit edits `openspec/specs/` by hand. It applies the MODIFIED blocks and the moves of D1. The new check,
its self-tests, and the new rule in `openspec/config.yaml` are in the same commit, because the check fails on the main
specs before the moves. The archive commit follows. It must report "Specs already in sync" and change no spec.

A simulation in a scratch copy gave these results:

1. `openspec archive` applied the 9 MODIFIED blocks. Then 8 forward citations remained, all of them fixed by the moves.
2. After the moves, a scan found no forward citation.
3. `openspec validate --all --strict` passed 11 of 11 specs. Each changed requirement is 500 characters or less.
   `npm run spec-ids`, `requirements:check`, `corpus:check`, and `binding-links:check` passed.
4. After a manual sync with the moves, `openspec archive` printed "Specs already in sync; no files changed".

Alternative: archive first, and then move by hand. Rejected, because the archive would then not be the last commit.
`CONTRIBUTING.md` puts the sync before the archive.

## Risks / Trade-offs

1. [The manual sync differs from the deltas] → The archive commit must print "Specs already in sync; no files
   changed". The sync commit tests this in a scratch copy first.
2. [A move passes the check and still puts a term after its first use] → The check sees citations only. Each move in
   D1 was checked for term use by hand, and the rule of D5 asks the same of each later author.
3. [A reader expects identifier order] → `binding-surface` and `document-parsing` join `model-derivation` and
   `naming-manifest` in another order. A reader finds an identifier by search, not by position (Context, item 6).
