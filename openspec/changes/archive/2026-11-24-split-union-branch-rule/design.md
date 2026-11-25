# Design

## Context

See [proposal.md](proposal.md). The identifier STO-040 is new in the same unreleased change that moved the requirement
from the naming-manifest capability, so no released artifact holds it.

## Decisions

1. **Split by reader.** The first sentence of [STO-040] says what the manifest records. The consequence for an object
   says what a binding accepts. A requirement has one reader.
2. **A new requirement for the binding rule.** [PRS-024] is in `document-parsing`, next to [PRS-014], which selects a
   branch when an object holds a distinguishing property.
3. **The scenario of [STO-040] changes by hand.** A scenario title cannot change in place. The delta keeps the title and
   states the manifest rule. A task renames the title after the archive.
4. **A self-test checks the manifest rule.** The self-test of [STO-039] already derives names for a group union. The new
   test checks that each variant records its property when the property is optional.

[STO-017]: ../../specs/contract-store/spec.md
[STO-039]: ../../specs/contract-store/spec.md
[STO-040]: ../../specs/contract-store/spec.md
[PRS-014]: ../../specs/document-parsing/spec.md
[PRS-024]: specs/document-parsing/spec.md
