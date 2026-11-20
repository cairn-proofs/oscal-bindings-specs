# Proposal

## Why

An agent that works in a binding repository does not know how the binding relates to the store. It can edit a
contract file in the binding, read the `main` branch of the store instead of the pinned archive, or put a contract
change in the binding. The store has an `AGENTS.md` for its own repository, but that file is written for the store.
No binding has an `AGENTS.md` today.

## What Changes

1. `templates/binding/AGENTS.md`: an agent guide for a binding. It states what the store holds and what the binding
   holds, how the binding reads the store, the contract rules that a binding follows, where each kind of change goes,
   and the checks before each commit. It ends with a "Binding notes" section that the binding owns.
2. [SRF-009] lists the agent guide, and a new scenario [SRF-009.05] makes the store checks fail when the guide cites a
   store identifier that is neither live nor retired.
3. The generated template README lists the guide and its install step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `binding-surface`: [SRF-009] adds the agent guide and the scenario [SRF-009.05].

## Impact

1. `templates/binding/AGENTS.md`: new, hand-written. It cites store requirements by identifier only, with no link,
   because a link cannot name the version that a binding pins.
2. `scripts/templates.ts`: the README lists the guide, and a self-test for [SRF-009.05].
3. `scripts/build-archive.ts`: the self-test of [SRF-009.01] expects seven files.
4. `AGENTS.md` and `README.md` of the store: the guide in the template list.
5. `VERSION`: no change. `0.10.0+oscal.1.2.3` is not released yet.

[SRF-009]: ../../specs/binding-surface/spec.md#requirement-srf-009-the-spec-artifact-holds-the-binding-templates
[SRF-009.01]: ../../specs/binding-surface/spec.md#requirement-srf-009-the-spec-artifact-holds-the-binding-templates
[SRF-009.05]: ../../specs/binding-surface/spec.md#requirement-srf-009-the-spec-artifact-holds-the-binding-templates
