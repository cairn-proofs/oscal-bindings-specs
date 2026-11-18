# Tasks

## 1. The rule on target queries

- [x] 1.1 In `checkManifest()` of `scripts/constraints.ts`, add a failure for each target query that can select the
      array that holds the context node ([CNS-007], item 3). On an array, only a query with no segment (`$`)
      selects the array itself. Each segment selects only the context node or nodes in it. Name the rule in the
      comment above the new code. Verify `npm run constraints:check` passes on `manifest/1.2.3/constraints.json`.
- [x] 1.2 Add a self-test whose name starts with `CNS-007`: a manifest with the target query `$` fails
      `checkManifest()`, and the same manifest with `$[0]` passes. Verify `npm run constraints:self-test` passes.

## 2. Sync, archive and integration

- [x] 2.1 Sync the delta into `openspec/specs/constraint-validation/spec.md`. Do not change `openspec/spec-ids.yaml`,
      because the change adds no requirement and no scenario. Run `npm run requirements:write` and
      `npm run coverage:write`. Verify `npm run spec-ids`, `npm run requirements:check` and `npm run coverage:check`
      pass.
- [x] 2.2 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [ ] 2.3 Run `npm run check`. Verify it passes.

## Workflow follow-up

1. Close #126 with the pull request.
2. Add a comment to #76: the scenario for the location of a node in a list item belongs with the work of #76 for
   [CNS-023].
3. The next release holds this change. `VERSION` stays `0.9.0+oscal.1.2.3`. After the release, each binding gets a
   pin-move issue.

[CNS-007]: ../../specs/constraint-validation/spec.md#requirement-cns-007-each-entry-selects-context-nodes-and-target-nodes
[CNS-023]: ../../specs/constraint-validation/spec.md#requirement-cns-023-the-element-queries-of-a-single-or-many-type-are-those-of-its-item-type
