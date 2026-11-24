# Proposal

## Why

The sticker of [SRF-008] has two badges. One shows the pinned version. The other shows the status of a workflow. A
reader cannot see how much of the contract a binding implements, or how much of that implementation is conformant. The
workflow badge also forces a binding to name a CI workflow, and it turns red for any failing step of that workflow.

A binding already keeps a traceability record ([SRF-003]) and a file `spec-pin.json`. A binding must keep the two in step
on each pin move, and neither says which requirements the binding implements.

## What Changes

1. The sticker is one badge. It shows the pinned version, the share of requirements that the binding implements, and
   the share of corpus cases that the binding passes. The badge reads one member of the traceability record.
2. The record moves to format 2. It holds the pin, the operations, a status for each requirement that applies to a
   binding, the badge text, and an optional corpus result with the failed cases and the expected failures.
   `spec-pin.json` and the workflow badge are removed.
3. The ledger marks each capability as binding-facing or not. The requirement index carries that mark for each
   requirement. A record cannot cite or give a status to a requirement for the contract store only.
4. The binding checker computes the badge text and fails when the committed text differs. It can write the derived
   members of the record.
5. The pre-commit hook and the install script read the pin from the record. A pin move edits one file, then runs the
   install script from the new archive.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `contract-store`: the index, the ledger flag, the sticker, the binding checker and the hook change.
2. `binding-surface`: the record, the statuses, the badge text and the sticker conditions change. [SRF-008] and
   [SRF-009] are retired and replaced.

## Impact

1. `openspec/specs/`, `openspec/spec-ids.yaml`, `openspec/scenario-checks.yaml`, `openspec/requirements.json`,
   `openspec/traceability.schema.json` and `openspec/coverage.json`.
2. `scripts/requirements.ts`, `scripts/check-spec-ids.ts`, `scripts/traceability.ts`, `scripts/binding-check.ts`,
   `scripts/templates.ts` and `scripts/build-archive.ts`.
3. `templates/binding/`: the hook, the install script, the empty record and the generated files.
4. `docs/sticker.md`, `README.md` and `templates/binding/AGENTS.md`.
5. A binding moves its record to format 2 when it moves its pin. It gives a status to each requirement that the index
   marks `binding`. A binding that keeps a list of scenarios that do not apply can derive most statuses from that list.
   Each binding does this through its own issue tracker. That work is outside this change.
