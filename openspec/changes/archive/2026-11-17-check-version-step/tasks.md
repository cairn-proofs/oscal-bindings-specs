# Tasks

## 1. One version grammar, with no pre-release label

- [x] 1.1 Add `scripts/version-lib.ts` with the grammar, `Version`, `parseVersion()` and `precedence()` of design.md,
      D4. Make `check-version.ts` and `check-releases.ts` import them, and remove their own copies. Verify
      `npm run typecheck` passes.
- [x] 1.2 Change the self-tests of D4: the `check-version.ts` case for `1.0.0-rc.1+oscal.1.2.3` expects a failure and
      its name starts with `VER-003.06`. Remove the `check-releases.ts` test for pre-release precedence.
      Verify `npm run version:self-test`, `npm run version:check`, `npm run releases:self-test` and
      `npm run releases:check` pass.

## 2. The step check

- [x] 2.1 Add the step check of D1, D2 and D3 to `checkReleases()` in `scripts/check-releases.ts`. Update the file
      comment to name VER-008. Verify `npm run releases:check` passes on `main` with `VERSION` at
      `0.9.0+oscal.1.2.3`.
- [x] 2.2 Add one self-test for each scenario of VER-008, as D5 states, and change the existing test of D4, item 3.
      Verify `npm run releases:self-test` passes.
      Set `VERSION` to `0.10.0+oscal.1.2.3`, verify `npm run releases:check` fails and names `v0.8.0+oscal.1.2.3`, and
      undo the edit.

## 3. Documentation

- [x] 3.1 Add the README section "Version" of D6, and the links from the four places that D6 lists. Remove the text
      in those places that the section now states. Verify that each link resolves to the section, and that
      `grep -n VERSION README.md CONTRIBUTING.md .github/pull_request_template.md` shows no rule outside the section
      other than the links.

## 4. Sync, archive and integration

- [x] 4.1 Sync the delta into `openspec/specs/schema-versioning/spec.md`. Set `next` of `VER` to 9 in
      `openspec/spec-ids.yaml`. Change the seven `by-design` reasons of D8 in `openspec/scenario-checks.yaml`. Run
      `npm run requirements:write` and `npm run coverage:write`. Verify `npm run spec-ids` and
      `npm run coverage:check` pass.
- [x] 4.2 Archive the change. Then change the seven scenario headings of D7 in
      `openspec/specs/schema-versioning/spec.md`, and run `npm run requirements:write` and `npm run coverage:write`.
      Verify `npm run spec-ids` passes and each identifier in `openspec/coverage.json` is unchanged.
- [x] 4.3 Run `npm run check`. Verify it passes.

## Workflow follow-up

1. The next release holds this change. `VERSION` stays `0.9.0+oscal.1.2.3` (design.md, D9).
2. Close #48 with the pull request.
