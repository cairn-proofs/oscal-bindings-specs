# Tasks

## 1. Sticker file

- [x] 1.1 Write `docs/sticker.md`. It holds the Markdown of the version badge and the Markdown of the status
  badge. The version badge is a Shields dynamic JSON badge. It reads `version` from `spec-pin.json` on the
  default branch. The status badge is a Shields workflow status badge. The file cites the conditions of
  [SRF-009] and does not copy them. It tells the binding to name a workflow that runs the corpus. Verify:
  both badge URLs render with a placeholder repository.
- [x] 1.2 Add a pointer to `docs/sticker.md` in the `docs/` item of the Layout list in `README.md`. Verify:
  the link resolves and `npm run binding-links:check` passes.

## 2. Tests

- [x] 2.1 Add the self-test `SRF-008.01` to `scripts/build-archive.ts`: the archive holds `docs/sticker.md`.
  Verify: `npm run archive:self-test` passes after `docs/sticker.md` is committed.
- [x] 2.2 Add the self-test `SRF-008.02` to `scripts/build-archive.ts`: `docs/sticker.md` holds a URL that
  starts with `https://img.shields.io/badge/dynamic/json` and a URL that starts with
  `https://img.shields.io/github/actions/workflow/status/`. Verify: `npm run archive:self-test` passes.
- [x] 2.3 Add `SRF-009.01` to `SRF-009.04` to `by-design` in `openspec/scenario-checks.yaml`, with the same
  reason as the other scenarios about the process of a binding repository. Verify: `npm run coverage:check`
  passes after `npm run coverage:write`.

## 3. Sync

- [x] 3.1 Sync the delta into `openspec/specs/binding-surface/spec.md`. Update `openspec/spec-ids.yaml`
  (`SRF` `next: 10`). Run `npm run requirements:write` and `npm run coverage:write`. Verify: `npm run check`
  passes.

## Workflow follow-up

- Archive the change in the pull request that implements it.
- After the store release, open a pin-move issue in each binding tracker that does not call
  `pin-move-check.yml`.
- Open an issue in each binding tracker to add `spec-pin.json`, a workflow that runs the corpus, and the sticker.
  Close [issue #149](https://github.com/cairn-proofs/oscal-bindings-specs/issues/149) when the store
  release holds the sticker file.
