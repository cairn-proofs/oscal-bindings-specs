# Proposal

## Why

The sticker of [SRF-008] has two badges. The first shows the pinned version. The second shows the status of a
workflow. A reader cannot see how much of the contract a binding implements. The workflow badge also forces a
binding to name a CI workflow that runs the corpus, and it turns red for any failing step of that workflow.

A binding already keeps a traceability record ([SRF-003]). The record and `spec-pin.json` are two files that a
binding must keep in step on each pin move.

## What Changes

1. The sticker is one badge. It shows the pinned version, the share of traceable contract requirements that the
   record cites, and the share of corpus cases that the binding passes.
2. The traceability record moves to format 2. It holds the pin (version, archive path, `sha256`), the operations,
   an optional corpus result, and the badge text. `spec-pin.json` and the workflow badge are removed.
3. The requirement index marks each requirement that has a corpus case. This is the set of requirements that a
   record can cite. The mark comes from `openspec/coverage.json`, so the contract store keeps no new list.
4. The binding checker computes the badge text and fails when the committed text differs. It can write the derived
   members of the record.
5. The pre-commit hook and the install script read the pin from the record. A pin move edits one file, then runs
   the install script from the new archive.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `binding-surface`: the sticker, the sticker conditions, the record schema, the requirement index, the binding
   checker, and the hook change. [SRF-008] and [SRF-009] are retired and replaced.

## Impact

1. `openspec/specs/binding-surface/spec.md`, `openspec/spec-ids.yaml`, `openspec/scenario-checks.yaml`,
   `openspec/requirements.json`, `openspec/traceability.schema.json`, and `openspec/coverage.json`.
2. `scripts/requirements.ts`, `scripts/traceability.ts`, `scripts/binding-check.ts`, `scripts/templates.ts`, and
   `scripts/build-archive.ts`.
3. `templates/binding/`: the hook, the install script, the empty record, and the generated files.
4. `docs/sticker.md`, `README.md`, and `templates/binding/AGENTS.md`.
5. A binding that adopted `spec-pin.json` or a record of format 1 moves to format 2 when it moves its pin. Each
   binding does this through its own issue tracker. That work is outside this change.
