# Tasks

## 1. The agent guide

- [x] 1.1 Add `templates/binding/AGENTS.md`, as [proposal.md, What Changes](proposal.md#what-changes) item 1 states.
      Cite store requirements as `[PREFIX-NNN]` with no link. Verify each cited identifier is in
      `openspec/requirements.json`.
- [x] 1.2 In `scripts/templates.ts`, list the guide in the generated README, with its install step and its pin-move
      step. Add the self-test `SRF-011.05`: a guide that cites `[PRS-999]` fails and names it, and the committed
      guide passes. Run `npm run templates:write`. Verify `npm run templates:check` and
      `npm run templates:self-test` pass.
- [x] 1.3 In `scripts/build-archive.ts`, the self-test `SRF-011.01` expects `templates/binding/AGENTS.md` too. In the
      store `AGENTS.md` and `README.md`, add the guide to the template list. Verify `npm run binding-links:check`
      passes.

## 2. Sync, archive and integration

- [x] 2.1 Sync the delta into `openspec/specs/binding-surface/spec.md`. Do not change `next` of `SRF` in
      `openspec/spec-ids.yaml`, because the change adds no requirement. Run `npm run requirements:write` and
      `npm run coverage:write`. Verify `npm run spec-ids`, `npm run requirements:check` and `npm run coverage:check`
      pass.
- [ ] 2.2 Archive the change. Commit. Verify `npm run check` passes.

## Workflow follow-up

1. The release `v0.10.0+oscal.1.2.3` holds this change with `binding-spec-toolchain`.
