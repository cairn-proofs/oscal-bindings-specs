# Tasks

## 1. The install script

- [x] 1.1 Add `templates/binding/bin/install.sh`, with the executable bit set in git. Verify `sh -n` and `dash -n`
      pass.
- [x] 1.2 In `scripts/templates.ts`, give the script as the install step of the generated README, and add self-tests:
      a first install writes each template file and sets `core.hooksPath`, another hash changes no file, and a pin
      move keeps the ledger, the record and the binding notes and writes the new hash into the hook. Run
      `npm run templates:write`. Verify `npm run templates:check` and `npm run templates:self-test` pass.
- [x] 1.3 The store `AGENTS.md` and the agent guide name the script. Verify `npm run binding-links:check` passes.

## 2. Sync, archive and integration

- [x] 2.1 Sync the delta into `openspec/specs/binding-surface/spec.md`. Do not change `openspec/spec-ids.yaml`. Run
      `npm run requirements:write` and `npm run coverage:write`. Verify `npm run spec-ids`,
      `npm run requirements:check` and `npm run coverage:check` pass.
- [x] 2.2 Archive the change. Commit. Verify `npm run check` passes.

## Workflow follow-up

1. The release `v0.10.0+oscal.1.2.3` holds this change.
