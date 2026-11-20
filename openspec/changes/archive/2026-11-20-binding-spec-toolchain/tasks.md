# Tasks

## 1. The store specs as an argument of the checker

- [x] 1.1 In `scripts/check-spec-ids.ts`, put the main code in a guard on the script name, as
      `scripts/build-archive.ts` does, so that an import runs no check. Add the optional `store` argument to
      `checkSpecIds()`, as
      [design.md, decision 1](design.md#1-the-store-checks-give-the-store-specs-to-checkspecids-as-an-optional-argument)
      states. Add the `[store-prefix]` rule. Treat an identifier with a store prefix as a citation that resolves in
      the store. Name each rule in the comment above its code. Verify `npm run spec-ids` passes with no change to
      its output.
- [x] 1.2 Add one self-test for each scenario identifier, with a name that starts with that identifier, because
      `scripts/coverage.ts` credits a name to the first identifier only: `SRF-010.01` and `SRF-012.01` (each: a
      binding ledger with `PRS` fails with `[store-prefix]`), `SRF-010.02` (`PYB` passes), `SRF-012.02` (citations
      `[PRS-001]` and `[PRS-001.01]` resolve), `SRF-012.03` (`[PRS-999]` fails with `[citation]`), and `SRF-012.04`
      (a heading at or above `next` in a binding ledger fails with `[next]`). Add a self-test for a binding
      repository with no commit: the base specs are empty, and the vanished-scenario rule reports nothing. Verify
      `npm run spec-ids:self-test` passes.

## 2. The traceability record check

- [x] 2.1 Add `scripts/traceability.ts` with `checkRecord()`, as
      [design.md, decision 4](design.md#4-the-record-check) states, and a `--self-test` mode in a guard on the script
      name. Verify
      `npx tsx scripts/traceability.ts --self-test` runs.
- [x] 2.2 Add one self-test for each scenario identifier, with a name that starts with that identifier:
      `SRF-013.01` (an entry with both kinds of
      identifier fails with `[record-schema]`), `SRF-013.02` and `SRF-004.02` (each: `MDL-004` fails with
      `[record-contract]`), `SRF-013.03` (`PYB-009` with no heading fails with `[record-local]`), `SRF-013.04` (two
      entries with one name fail with `[record-duplicate]`), and `SRF-013.05` and `SRF-004.01` (each: a record with
      `PRS-001` and a live `PYB-001` passes). Use the committed `openspec/requirements.json` and
      `openspec/traceability.schema.json` as the store. Add `traceability:self-test` to `package.json` and to
      `npm run check`. Verify it passes.
- [x] 2.3 In `openspec/scenario-checks.yaml`, remove the `by-design` entries of `SRF-004.01` and `SRF-004.02`. Keep
      `SRF-003.01` to `SRF-003.04`. Verify `npm run coverage:write` lists the self-tests of 2.2 for both scenarios.

## 3. The bundled binding checker

- [x] 3.1 Add `esbuild` 0.28.2 to `devDependencies` in `package.json` with an exact version. Run `npm install`.
      Verify `package-lock.json` changes only for the direct dependency entry.
- [x] 3.2 Add `scripts/binding-check.ts`, the entry point of
      [design.md, decision 3](design.md#3-the-checker-command). It runs `checkSpecIds()` with the store, then
      `checkRecord()`. It fails with a message when `--store` is missing, when the directory has no
      `openspec/spec-ids.yaml`, `openspec/specs/`, `openspec/requirements.json` or
      `openspec/traceability.schema.json`, or when the record is missing. Verify
      `npx tsx scripts/binding-check.ts --store .` reports `[store-prefix]` for each prefix, because the store is its
      own store.
- [x] 3.3 Add `scripts/templates.ts` with `--write` and a default check mode, as
      [design.md, decision 2](design.md#2-the-binding-checker-is-a-bundle-that-the-store-generates-and-commits)
      states. It writes `templates/binding/bin/check-binding.mjs`, and `templates/binding/openspec/config.yaml` as
      [design.md, decision 6](design.md#6-the-store-generates-the-template-configyaml-from-its-own-configyaml) states.
      Add `templates:write`, `templates:check` and `templates:self-test` to `package.json`, and add the check and the
      self-test to `npm run check` and to `scripts/check-parallel.ts` if it lists the steps. Run
      `npm run templates:write`. Verify `npm run templates:check` passes.
- [x] 3.4 Add self-tests to `scripts/templates.ts`: `SRF-011.02` (a changed bundle fails the check) and
      `SRF-011.03` (copy the bundle to a temporary directory with no `node_modules`, run it with `node` against a
      binding fixture and the store root, and get exit code 0 for a valid fixture, and 1 for a fixture with a store
      prefix and for a fixture with a duplicate operation name). Add a self-test that the package list of the
      template README matches the esbuild metafile. Verify `npm run templates:self-test` passes.

## 4. The templates

- [x] 4.1 Add `templates/binding/openspec/spec-ids.yaml` with an empty `prefixes` map and an empty `retired` list,
      and `templates/binding/openspec/traceability.json` with format 1 and an empty `operations` list. Verify the
      bundle passes on a fixture that uses these two files, the generated config and one spec with a prefix of its
      own. Verify `openspec validate --all --strict` passes in the fixture.
- [x] 4.2 Add self-tests to `scripts/templates.ts`: `SRF-014.01` (a changed rule in an in-memory store config gives
      a template that differs from the committed one, and the check fails), `SRF-014.02` (a store config without the
      find text of one edit fails, and the failure names the text), and `SRF-014.03` (the generated template holds
      no `npm run` and no `CONTRIBUTING.md`, and holds the binding checker in each of the three entries). Verify
      `npm run templates:self-test` passes.
- [x] 4.3 Add `templates/binding/hooks/pre-commit`, as
      [design.md, decision 5](design.md#5-the-pre-commit-hook) states, with the executable bit set in git. Verify
      `sh -n` passes and `checkbashisms` (if installed) reports nothing. In a fixture repository, verify the hook
      exits 1 when the staged spec has a store prefix and the unstaged copy has no error, and exits 0 in the reverse
      case. Verify it exits 0 for the first commit of a repository and for a record at a path that is not the
      default. Add the self-test `SRF-011.04` to `scripts/templates.ts`: the hook, with an archive that
      `npm run archive` builds and a wrong sha256, exits 1 and runs no checker.
- [x] 4.4 Add `templates/binding/README.md`: the files, the install steps of
      [design.md, Migration Plan](design.md#migration-plan), the checker command, each bundled package with its
      license (generated, as decision 2 of the design
      states), and the step to copy the template config again and add the entries of the binding on each pin
      move. Verify each command in it runs as written on a fixture.

## 5. Archive and documentation

- [x] 5.1 Add `"templates"` to `CONTENTS` in `scripts/build-archive.ts`. Keep the array a literal of double-quoted
      strings that ends with `];`. Add the self-test `SRF-011.01`: the archive holds the six files of
      `templates/binding/`. The self-test reads `HEAD`, so commit the templates first. Verify
      `npm run archive:self-test` passes.
- [x] 5.4 Add `/templates/ @dfkunstler` to `.github/CODEOWNERS`, and name the binding templates in its header
      comment. The bundle and the hook run in each binding, so they need code-owner review. Verify the line is
      present.
- [x] 5.5 In `AGENTS.md`: in "What this store is", state that the archive holds `templates/binding/`, with a
      generated checker that bindings run, and that `scripts/` stays out of the archive. In the "Find your way"
      table, add `templates/binding/bin/check-binding.mjs`, `templates/binding/openspec/config.yaml` and
      `templates/binding/README.md` (no, run `npm run templates:write`) and the other template files (yes). Add a
      rule to the numbered list: a change to `openspec/config.yaml` or to the identifier checks needs
      `npm run templates:write`. Verify `npm run binding-links:check` passes.
- [x] 5.2 In `README.md`, section "Use the store", add how a binding installs the templates. In `CONTRIBUTING.md`,
      section "Add an operation to a binding", state that a binding-local requirement uses a prefix of the binding,
      not of the store ([SRF-010]), and that the binding checker checks the record ([SRF-013]). In
      `CONTRIBUTING.md`, state that a change to `openspec/config.yaml` needs `npm run templates:write` ([SRF-014]).
      Verify `npm run spec-ids` and `npm run binding-links:check` pass.
- [x] 5.3 Set `VERSION` to `0.10.0+oscal.1.2.3`. Verify `npm run version:check` passes.

## 6. Sync, archive and integration

- [x] 6.1 Sync the delta into `openspec/specs/binding-surface/spec.md`. Put [SRF-010] directly below [SRF-002], and
      [SRF-011], [SRF-012], [SRF-013] and [SRF-014] at the end. In `openspec/spec-ids.yaml`, set `next` of `SRF`
      to 15. Run
      `npm run requirements:write` and `npm run coverage:write`. Verify `npm run spec-ids`,
      `npm run requirements:check` and `npm run coverage:check` pass, and that `openspec/coverage.json` gives a
      self-test for each new scenario and for `SRF-004.01` and `SRF-004.02`.
- [x] 6.2 Archive the change. Verify `openspec list --json` shows no active change with this name.
- [x] 6.3 Run `npm run check`. Verify it passes.

## Workflow follow-up

1. The next release holds this change, as `v0.10.0+oscal.1.2.3`. After the release, each binding gets a pin-move
   issue. The issue includes the install of `templates/binding/`, a new identifier for each binding-local
   requirement that uses a store prefix, and a first run of the record check.

[SRF-002]: ../../specs/binding-surface/spec.md#requirement-srf-002-a-binding-local-operation-adds-no-contract-behavior
[SRF-010]: ../../specs/binding-surface/spec.md#requirement-srf-010-a-binding-local-requirement-does-not-use-a-store-prefix
[SRF-011]: ../../specs/binding-surface/spec.md#requirement-srf-011-the-spec-artifact-holds-the-binding-templates
[SRF-012]: ../../specs/binding-surface/spec.md#requirement-srf-012-the-binding-checker-applies-the-identifier-rules-to-the-specs-of-a-binding
[SRF-013]: ../../specs/binding-surface/spec.md#requirement-srf-013-the-binding-checker-checks-the-traceability-record
[SRF-014]: ../../specs/binding-surface/spec.md#requirement-srf-014-the-template-config-follows-the-store-config
