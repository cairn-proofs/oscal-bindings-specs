# Proposal

## Why

A binding has no standard way to show on its README that it follows this contract. A reader cannot see
which store release the binding pins, which OSCAL release it covers, or whether it passes the corpus.
[Issue #149](https://github.com/cairn-proofs/oscal-bindings-specs/issues/149) asks for a sticker that
bindings can put at the top of their READMEs.

## What Changes

1. The store publishes a sticker: two README badges and the Markdown that adds them. The first badge
   shows the pinned spec artifact version. That version holds both the store release and the OSCAL
   release, for example `0.8.0+oscal.1.2.3`. The second badge shows the status of the binding workflow
   that runs the corpus. The badge turns red when the workflow fails.
2. The store defines when a binding may show the sticker, and the pin file that the first badge reads.
3. The store ships no workflow and holds no binding state. A badge service reads the pin file and the
   workflow status from the public repository of the binding.
4. `docs/sticker.md` holds the Markdown. The spec artifact already holds `docs/`, so no archive change
   is needed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `binding-surface`: a new requirement states what the store publishes for the sticker and when a
  binding may show it.

## Impact

1. `openspec/specs/binding-surface/spec.md` (through the delta in this change), `openspec/spec-ids.yaml`,
   `openspec/scenario-checks.yaml`, and `openspec/coverage.json`.
2. New file `docs/sticker.md`, and a pointer to it in `README.md`.
3. Each binding adopts the sticker through its own issue tracker. That work is outside this change.
