# Proposal

## Why

Each binding keeps binding-local requirements in its own OpenSpec specs ([SRF-002], [SRF-003]). The store gives a
binding no rules and no tools for the identifiers of those specs. So each binding must write its own `config.yaml`
rules, its own ledger and its own checker, or it has none. A binding with no checker finds a bad identifier only in
CI or in review. That is too late, because an OpenSpec change of the binding already uses the identifier.

Also, no rule stops a binding from using a store prefix. A binding-local requirement `PRS-101` makes a traceability
record entry ambiguous, because `PRS` is the prefix of the document-parsing capability of the store.

## What Changes

1. The spec artifact holds `templates/binding/`. A binding copies these files from the archive that it pins:
   1. `openspec/config.yaml`: the store `openspec/config.yaml`, with each store command and store file replaced
      for a binding, and the rules of [SRF-008] and [SRF-010] added. The store generates it.
   2. `openspec/spec-ids.yaml`: an empty identifier ledger.
   3. `bin/check-binding.mjs`: the binding checker, as one file that runs with Node.js and needs no installed
      package. OpenSpec runs on Node.js, so each binding has Node.js. It holds the spec-ids checker of the store
      and a check of the traceability record.
   4. `hooks/pre-commit`: a POSIX shell git hook. Before each commit, it verifies the pinned archive by its
      sha256, extracts it, and runs the checker of that archive and `openspec validate --all --strict` on the
      staged files.
   5. `openspec/traceability.json`: a traceability record with no operation.
   6. `README.md`: how to install the files.
2. A new requirement, [SRF-008]: the prefix of a binding-local requirement is not a prefix of the store.
3. A new requirement, [SRF-009]: the spec artifact holds `templates/binding/`.
4. A new requirement, [SRF-010]: the checker applies the identifier rules of the store to the specs of a binding. It
   also enforces [SRF-008], and it resolves a citation of a store identifier, such as `[PRS-001]` or
   `[PRS-001.02]`, in the pinned spec artifact.
5. A new requirement, [SRF-011]: the checker checks the traceability record of a binding. The record conforms to
   the JSON Schema ([SRF-007]), each contract identifier resolves ([SRF-004]), each binding-local identifier names a
   requirement of the binding, and each operation name is in one entry only ([SRF-003]).
6. A new requirement, [SRF-012]: the template config follows the store config. The store checks fail when the
   template is stale, and when a store-specific sentence that the template replaces changes.
7. The store checks fail when the committed checker differs from the generator output.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `binding-surface`: adds [SRF-008], [SRF-009], [SRF-010], [SRF-011] and [SRF-012].

## Impact

1. `scripts/check-spec-ids.ts`: `checkSpecIds()` takes the store specs and ledger as an optional argument. The store
   check does not change.
2. A new entry point for the bundle, and `npm run templates:write` and `npm run templates:check`. The two scripts
   generate and check the bundle and the template config. `npm run check` runs the check. A change to
   `openspec/config.yaml` then needs `npm run templates:write` in the same pull request.
3. `package.json`: `esbuild` becomes a direct development dependency at the version that `tsx` installs today.
4. `scripts/build-archive.ts`: `CONTENTS` gets `templates`.
5. `README.md`, `CONTRIBUTING.md` and `AGENTS.md`: how a binding uses the templates, the prefix rule, and the
   generated template files. The archive holds a checker that bindings run. `scripts/` stays out of the archive.
   `.github/CODEOWNERS` gets `/templates/`.
6. `openspec/scenario-checks.yaml`: the `by-design` entries of `SRF-004.01` and `SRF-004.02` go, because self-tests of
   the binding checker cover them. The entries of `SRF-003.01` to `SRF-003.04` stay. Only the language tools of a
   binding can find each public operation.
7. The bundle holds `yaml` and `github-slugger` (ISC), `ajv`, `fast-deep-equal` and `json-schema-traverse` (MIT),
   and `fast-uri` (BSD-3-Clause). The template README lists them from the esbuild metafile.
8. Bindings: a binding that uses a store prefix for a binding-local requirement does not conform after this change.
   It must give the requirement a new identifier with its own prefix. So [SRF-008] is a break ([VER-003]).
9. `VERSION`: `0.10.0+oscal.1.2.3`. The major component is 0, so a minor increment marks the break.

[SRF-002]: ../../specs/binding-surface/spec.md#requirement-srf-002-a-binding-local-operation-adds-no-contract-behavior
[SRF-003]: ../../specs/binding-surface/spec.md#requirement-srf-003-a-binding-records-the-requirement-that-covers-each-public-operation
[SRF-004]: ../../specs/binding-surface/spec.md#requirement-srf-004-contract-identifiers-in-a-traceability-record-resolve-in-the-requirement-index
[SRF-007]: ../../specs/binding-surface/spec.md#requirement-srf-007-the-store-publishes-a-json-schema-for-the-traceability-record
[SRF-008]: ../../specs/binding-surface/spec.md#requirement-srf-008-a-binding-local-requirement-does-not-use-a-store-prefix
[SRF-009]: ../../specs/binding-surface/spec.md#requirement-srf-009-the-spec-artifact-holds-the-binding-templates
[SRF-010]: ../../specs/binding-surface/spec.md#requirement-srf-010-the-binding-checker-applies-the-identifier-rules-to-the-specs-of-a-binding
[SRF-011]: ../../specs/binding-surface/spec.md#requirement-srf-011-the-binding-checker-checks-the-traceability-record
[SRF-012]: ../../specs/binding-surface/spec.md#requirement-srf-012-the-template-config-follows-the-store-config
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
