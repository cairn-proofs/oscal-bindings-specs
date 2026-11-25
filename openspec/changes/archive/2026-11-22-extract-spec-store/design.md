# Design

## Context

See [proposal.md](proposal.md). The classification of each requirement is the map from old identifier to new identifier in the deltas.

## Goals / Non-Goals

**Goals:**

1. The capability of a requirement says who it applies to: the store, or a binding.
2. No requirement changes meaning.

**Non-Goals:**

1. The ledger field `binding` and its check. A later change adds them.
2. A corpus check of the generated names.

## Decisions

1. **One rule for the move.** A requirement moves when the actor is the store: it publishes, generates, checks
   or builds. It stays when the actor is a binding or a consumer.
2. **One new capability for the store.** The requirements that move are of different kinds, but one capability is
   enough, because the ledger can hold a flag for each capability later. A split later needs no change to the
   rule.
3. **The identifiers change.** The title of a scenario cannot change in place, and the identifier of a
   requirement is permanent. Each moved requirement is removed, and the new requirement has a new identifier. The
   ledger retires the old identifier with `replaced_by`. A scenario keeps its number: `CNS-001.02` becomes
   `STO-006.02`.
4. **The order in `spec-store` follows the citations.** A requirement cites only requirements above it in its file.
   The order is by source capability, and a requirement moves down when it cites a requirement of a later group.
5. **`generated-models` holds the consumer rules.** NAM-012, NAM-014 and NAM-022 are rules for the program that
   reads the manifest. A binding generates types with such a program.
6. **MDL-008 is retired.** Its only scenario, MDL-008.01, is PRS-004.01. The sentence "supports OSCAL 1.x means
   the vendored release and earlier" is in [VER-002].
7. **The old capabilities are removed.** Both hold no requirement after the move. The `MDL` and `NAM` prefixes
   stay in the ledger, because a prefix is permanent.
8. **Mechanical edit.** A script wrote the deltas. It copies each moved requirement without change, and replaces
   each citation by the map from the old identifier to the new identifier. The checks of the store find a missed
   citation.

## Risks / Trade-offs

1. [The classification can be wrong for a requirement that serves both sides.] → The ledger field of a later
   change makes the audience of each capability visible. A requirement can move again.
2. [A binding spec cites a moved identifier.] → The identifier resolves as retired. The binding checker accepts a
   retired identifier in a citation ([SRF-012]).
3. [A wide diff.] → Each change is an identifier, so a reviewer checks the map and not each line.
