# Tasks

Scope note: these tasks run in the store, `cairn-proofs/oscal-bindings-specs`. A change in a binding
repository is out of scope (design.md, Non-Goals 3). The change edits two specs, the requirement
index, the ledger, `README.md`, the corpus checker, and the corpus index and README. It adds
`docs/back-matter-keys.md`. It does not change `VERSION` (design.md, D9), the manifest, or the JSON
Schemas.

## Task Dependency Graph

```
 1 (branch, plan) ---> 2 (sync) ---> 3 (document, Purpose) ---> 4 (checker) ---> 5 (cases)
```

Group 2 syncs the deltas, so that the namespace, the category, and the identifiers that the cases
cite are in the main specs. Group 3 adds the document, and the Purpose link to it, in one commit.
The namespace check of group 4 reads the document. Group 4 adds the operation to the checker before
group 5 uses it in `cases.json`. The groups run in order.

## 1. Branch and planning commit

- [x] 1.1 Create the feature branch from [#46] with `gh issue develop 46 --base main`, with the
      user's approval, and check it out. Commit the planning artifacts of this change as the first
      commit, with `#46` in the message. Verify `git branch --show-current` is not `main`, `openspec
      list` shows only this change, and `openspec validate derive-resource-identifier-from-key
      --strict` passes.

## 2. Sync

- [x] 2.1 Sync the deltas of this change into `openspec/specs/`, without archiving the change. In
      `backmatter-builders`, [BMB-004] follows [BMB-003]. In `error-model`, [ERR-013] follows
      [ERR-012]. Verify these:
      1. `openspec show backmatter-builders --type spec` lists [BMB-004] and [BMB-004.01] to
         [BMB-004.05], and the heading of [BMB-003.01] keeps its words.
      2. `openspec show error-model --type spec` lists [ERR-013], [ERR-013.01], and [ERR-013.02],
         and [ERR-001] lists eight categories.
- [x] 2.2 In the same commit as task 2.1, set `BMB` `next` to 5 and `ERR` `next` to 14 in
      `openspec/spec-ids.yaml`, and run `npm run requirements:write`. Do not change `VERSION`
      (design.md, D9). Verify `npm run spec-ids` passes, and `openspec/requirements.json` has an
      entry for [BMB-004] and for [ERR-013].
- [x] 2.3 Verify the descriptions of [BMB-003], [BMB-004], [ERR-001], and [ERR-013] in the main
      specs each have 500 characters or fewer, with whitespace normalized. Commit tasks 2.1 and 2.2
      with `#46` in the message. Verify `npm run check` passes before the commit.

## 3. Guidance document and Purpose

- [x] 3.1 Write `docs/back-matter-keys.md` with the title "Back-matter resource keys" and the
      sections of design.md, D6. The namespace section quotes the URL
      `https://oscalregistry.org/ns/oscal/back-matter-resource`, the URL namespace
      `6ba7b811-9dad-11d1-80b4-00c04fd430c8`, and the result `3942257f-e1cf-5e06-9c6f-eeb97ecabe77`.
      The document cites [BMB-004] for the rule, and states that it has no normative rules. Verify
      each value in the document equals the value in design.md, D2.
- [x] 3.2 Add these sentences to the end of the Purpose of
      `openspec/specs/backmatter-builders/spec.md`: "A resource can occur in more than one document.
      A key gives each copy of the resource the same identifier ([Back-matter resource
      keys](../../../docs/back-matter-keys.md))." Verify the link resolves to the file of task 3.1,
      and the Purpose has no historical or temporal words.
- [x] 3.3 In `README.md`, change item 5 of the layout list from "shared rule documents that the
      specs cite" to "shared documents that the specs cite". Verify the item still links
      `docs/canonical-json.md`.
- [x] 3.4 Commit group 3 with `#46` in the message. Verify `npm run check` passes before the commit.

## 4. Checker

- [x] 4.1 In `scripts/check-corpus.ts`, add `build-resource` to `OPERATIONS`. Add `arguments?: {
      key: string; title?: string; identifier?: string }` and `"expected-uuid"?: string` to `Case`.
      Add a UUID version 5 function that uses SHA-1 from `node:crypto`, and no UUID library. Apply
      the case checks and the namespace checks of design.md, D7. Fail an `arguments` or
      `expected-uuid` field on a case of another operation. Add the checks to the header comment of
      the script. Verify `npm run typecheck` and `npm run corpus:check` pass with the unchanged
      `cases.json`.
- [x] 4.2 In `corpus/1.2.3/README.md`, add `build-resource` to Operations: build a resource with
      `arguments`, then compare its `uuid` with `expected-uuid`, or check that the builder reports
      `expected-category`. Add `arguments` to the case fields, and `expected-uuid` to the expected
      results. State that a `build-resource` case has no `input`. Verify the README names each field
      that `Case` holds.
- [x] 4.3 Commit group 4 with `#46` in the message. Verify `npm run check` passes before the commit.

## 5. Cases

- [ ] 5.1 Add `builder-error` to the `categories` list of `corpus/1.2.3/cases.json`. Add the five
      cases of design.md, D8, with the `requirements` identifiers of D8. Write the `é` of the third
      key as the one code point U+00E9. Verify `npm run corpus:check` passes, and reports seven
      error categories.
- [ ] 5.2 Verify that each check of design.md, D7, fails a case that breaks it. On the working copy,
      apply these mutations one at a time, and restore after each:
      1. Change the last digit of `expected-uuid` of `build-resource/key`.
      2. In `build-resource/non-ascii-key`, write the `é` of the key as `e` and U+0301.
      3. Set `arguments.key` of `build-resource/key` to the empty string.
      4. Add `"uuid": "51beb3e9-30bb-535f-ba49-e68d4661aaa9"` to `arguments` of
         `build-resource/key`.
      5. Add `"input": "elements/property-valid.json"` to `build-resource/key`.
      6. Remove `identifier` from `arguments` of `build-resource/key-and-identifier`.
      7. Add an `identifier` to `arguments` of `build-resource/empty-key`.
      8. Add `expected-uuid` to `build-resource/empty-key`.
      9. Set `expected-category` of `build-resource/empty-key` to `parse-error`.
      10. Remove both error cases. Check 2 must report that `builder-error` has no case.
      11. Change one digit of the namespace in [BMB-004] in
          `openspec/specs/backmatter-builders/spec.md`.
      12. In `docs/back-matter-keys.md`, change `/ns/oscal/` in the URL to `/ns/osca1/`.
      Verify `npm run corpus:check` reports a failure for each mutation, and passes after each
      restore.
- [ ] 5.3 Commit group 5 with `#46` in the message. Verify `npm run check` passes before the commit,
      and `git status --short` shows no file under `corpus/`, `docs/`, `scripts/`,
      `openspec/specs/`, or `openspec/changes/`.

## Workflow follow-up

These steps need the merge or the archive, so they are not tracked tasks. The change is archived in
the same pull request.

- Archive this change in the pull request. If a requirement or scenario changed after task 2.1,
  update the ledger and the index in the archive commit. Verify `npm run check` passes and `openspec
  list` shows no active change.
- Open the pull request with `Closes #46`, with the user's approval.
- The release that carries this change is out of scope. `VERSION` stays `0.8.0+oscal.1.2.3`
  (design.md, D9).
- After the release, draft an issue in each repository of Known implementations in `README.md` to
  move the pin. The issue lists the binding changes of proposal.md, Impact item 7. Post each issue
  only after the user approves it.

[#46]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/46
