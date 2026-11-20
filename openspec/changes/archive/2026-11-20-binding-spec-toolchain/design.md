# Design

## Context

`scripts/check-spec-ids.ts` checks the main specs of the store. `checkSpecIds(files, base)` takes the Markdown files
of `openspec/` and `docs/`, and the main specs at the base ref. It reads the ledger from `files`. A citation is a
citation only when its prefix is in the ledger, so `[CM-8]` is not a citation. The functions depend on the `yaml` and
`github-slugger` packages.

The store has two bindings, one in Python and one in TypeScript. Each binding runs OpenSpec, which runs on Node.js.
The Python binding has no `package.json`.

A binding can rely only on the paths in the spec artifact ([VER-005]). `scripts/` is not in the artifact.

## Goals / Non-Goals

**Goals:**

1. One checker implementation. The store check and the binding checker run the same code.
2. A binding runs the checker before a commit, with only Node.js and the files of the pinned archive.
3. One command checks the specs, the ledger and the traceability record of a binding.

**Non-Goals:**

1. A reusable CI workflow. A binding can run the hook command in CI, but a CI failure comes too late for an OpenSpec
   change.
2. A check that each public operation has a record entry. Only the language tools of a binding can find each public
   operation, so `SRF-003.01` to `SRF-003.04` stay `by-design` in `openspec/scenario-checks.yaml`.

## Decisions

### 1. The store checks give the store specs to `checkSpecIds()` as an optional argument

`checkSpecIds(files, base, store?)` gets `store`: the ledger of the store and the identifiers in its main specs. With
`store`, the function:

1. Fails with `[store-prefix]` for each prefix of the binding ledger that is in the store ledger ([SRF-010]).
2. Treats a bracketed identifier with a store prefix as a citation. The citation resolves when it names a live
   heading of the store specs, or an identifier that the store ledger retires.

Without `store`, the function does what it does today. The store check does not pass `store`.

`scripts/check-spec-ids.ts` runs its check and calls `process.exit` at the top level, so an import of it runs the
store check. The main code of the file goes into a guard on the script name, as in `scripts/build-archive.ts`. The
new `scripts/traceability.ts` has the same guard.

The checker reads the store specs from `openspec/specs/` of the archive, not from `openspec/requirements.json`. The
index holds requirements only, so it cannot resolve a scenario citation such as `[PRS-001.02]`. The index is
generated from the same specs and ledger, so a requirement citation gets the same result.

Alternative: write a separate checker for bindings. Rejected, because two implementations of one rule set drift.

### 2. The binding checker is a bundle that the store generates and commits

A new entry point, `scripts/binding-check.ts`, reads the arguments, reads the store from the archive directory, and
calls `checkSpecIds()` and `checkRecord()`. `npm run templates:write` bundles it with esbuild into
`templates/binding/bin/check-binding.mjs`: one ES module, platform `node`, target `node22`, with `yaml`,
`github-slugger` and `ajv` inside it. The `node` build of `yaml` is CommonJS and calls `require`, which an ES module
does not have. So the bundle starts with a banner that defines `require` with `createRequire(import.meta.url)`. A
trial bundle with esbuild 0.28.2 runs with this banner, and fails at start without it. `npm run templates:check`
bundles to memory and fails when the bytes differ from the committed file ([SRF-011.02]). `npm run check` runs it.

`esbuild` becomes a direct development dependency at the exact version that `tsx` installs today (0.28.2). The exact
version keeps the bundle bytes stable.

Alternatives:

1. Put the TypeScript source in the archive, and run it with `tsx`. Rejected, because the binding then needs
   `npm install`, and the Python binding has no `package.json`.
2. Write the checker with no dependency. Rejected, because it needs a YAML parser and a slugger of its own, and it
   cannot share code with the store check.

### 3. The checker command

```text
node check-binding.mjs --store <dir> [--record <path>]
```

`<dir>` is the root of the extracted spec artifact. The checker reads `<dir>/openspec/spec-ids.yaml` and
`<dir>/openspec/specs/`. It fails when either is missing. It checks the repository in the current directory, as
`npm run spec-ids` does. Then it checks the record of decision 4. `--record` is relative to the current directory. The
default is `openspec/traceability.json`, the path of the template record. A missing record is a failure, because
[SRF-003] states that a binding keeps one record. `SPEC_IDS_BASE` sets the base ref, as for the store check. When the
base ref is `HEAD` and the repository has no commit, the base specs are empty, so the first commit of a binding
passes the vanished-scenario rule. Each failure starts with the rule name. The exit code is 1 on a failure, 0 otherwise.

### 4. The record check

`scripts/traceability.ts` holds `checkRecord(record, schema, index, files, storePrefixes)`. It returns one failure for
each item of [SRF-013], and each failure starts with the rule name:

1. `[record-schema]`: ajv validates the record against `<dir>/openspec/traceability.schema.json` with the options
   that the self-test of `scripts/requirements.ts` uses (`allErrors`, `strict`). When the record does not conform,
   the function stops after the schema failures.
2. `[record-contract]`: a contract identifier has no entry in `<dir>/openspec/requirements.json`. [SRF-004] names the
   index, so the check reads the index and not the store specs.
3. `[record-local]`: a binding-local identifier names no live requirement heading in the main specs of the binding,
   or starts with a store prefix.
4. `[record-duplicate]`: an operation name is in more than one entry.

The entry point of decision 3 calls it after `checkSpecIds()`. It reads the main specs of the binding once for both.

Alternative: put the record check in a second command. Rejected, because the hook and the README then name two
commands for one gate.

### 5. The pre-commit hook

`templates/binding/hooks/pre-commit` is a POSIX `sh` script with no Bash feature. Three variables at its top give
the path of the pinned archive file (`.tar.gz`), its pinned sha256, and the path of the record (default
`openspec/traceability.json`). The binding sets them when it installs the hook, and again on each pin move.

On each run, the hook computes the sha256 of the archive with `sha256sum`, or with `shasum -a 256` when
`sha256sum` is not present. It fails when the hash differs from the pinned hash ([VER-005]). Then it extracts the
archive to a temporary directory with `tar -xzf`. The archive holds one top directory, and that directory is the
`--store` of the checker. The hook runs the checker of the archive, `templates/binding/bin/check-binding.mjs`, so the
checker and the store data always come from the pinned version. A stale extraction cannot pass, because the hook
makes no extraction that outlives the run.

Alternative: compare `--expect-version` with `VERSION` of an extraction that the binding keeps. Rejected, because a
changed extraction with the right `VERSION` still passes, and the hash check of [VER-005] stays a separate step.

The hook checks the staged files, not the working tree. It writes the index to a temporary directory with
`git checkout-index --all --prefix=<tmp>/`, and runs the checker and `openspec validate --all --strict` in that
directory, with `GIT_DIR` set to the repository so that the checker reads the base ref. It makes the two paths
absolute first. It removes both temporary directories on exit. It stops at the first failure. A binding installs it with
`git config core.hooksPath` or by a copy into `.git/hooks/`. The template README describes both.

### 6. The store generates the template `config.yaml` from its own `config.yaml`

`npm run templates:write` writes `templates/binding/openspec/config.yaml` from `openspec/config.yaml` ([SRF-014]).
The generator reads the store config with the `yaml` document model, and changes it in three steps:

1. It applies a table of edits in `scripts/templates.ts`. Each edit has an exact text to find in a string of the
   config, and its replacement. The table holds the four store-specific spots of the store config today:
   1. In `rules.specs`, "`npm run spec-ids` checks the identifier rules on the main specs." becomes "The binding
      checker checks the identifier rules on the main specs."
   2. In `rules.specs`, "`npm run spec-ids` checks the citations on the main specs." becomes "The binding checker
      checks the citations on the main specs."
   3. In the `archive` guidance, "Then run `npm run spec-ids`." becomes "Then run the binding checker."
   4. In the `archive` guidance, the generator removes ", as CONTRIBUTING.md describes".
2. It adds two `rules.specs` entries after the identifier rules: a prefix of the binding ledger is never a prefix of
   the store ([SRF-010]), and a binding spec cites a store identifier as `[PRS-001]`, which resolves in the pinned
   spec artifact.
3. It adds the `references` entry of the store, as the README of the store shows it.

Every other entry, the whole `context` included, goes into the template without change.

`npm run templates:check` generates the config in memory. It fails when:

1. The committed template differs from the output ([SRF-014.01]).
2. The find text of an edit is not in the store config ([SRF-014.02]). So a change to a store-specific sentence
   makes a contributor review its edit, and an edit cannot stop applying without a failure.

Alternative: a hand-written template and a check that each store entry occurs in it. Rejected, because the check
then needs the same table of edits to compare the adapted entries, and a contributor still copies each new rule by
hand.

## Risks / Trade-offs

1. [The bundle holds third-party code] → A trial bundle holds `yaml`, `github-slugger` (ISC), `ajv`,
   `fast-deep-equal`, `json-schema-traverse` (MIT) and `fast-uri` (BSD-3-Clause). The bundle keeps their license
   comments (esbuild `legalComments: "inline"`). `npm run templates:write` writes the package list of the template
   README from the esbuild metafile, with the license of each package from its `package.json`, so the list cannot
   go stale. `npm run templates:check` compares it too.
2. [A new store-specific sentence goes into the store config] → The generator copies it into the template, and no
   check finds it. A reviewer of a change to `openspec/config.yaml` reads the diff of the template config in the
   same pull request, and adds an edit to the table when the template needs one.
3. [A binding adds entries of its own to its config] → On each pin move, the binding copies the new template config
   and adds its own entries again. The template README states this step.
4. [A binding uses a store prefix today] → The check of [SRF-010] fails for it after the pin move. The pin-move issue
   of that binding covers the new identifiers.

## Migration Plan

1. A binding keeps the pinned archive file at a path that it chooses. It already fetches the file for builds.
2. It copies `templates/binding/openspec/config.yaml`, `spec-ids.yaml` and `traceability.json` into its
   `openspec/`, and adds its own prefixes to the ledger. A binding that already has a record keeps its record and
   sets the record path of the hook.
3. It installs the hook and sets its three variables: the archive path, the pinned sha256 and the record path.

[SRF-003]: ../../specs/binding-surface/spec.md#requirement-srf-003-a-binding-records-the-requirement-that-covers-each-public-operation
[SRF-004]: ../../specs/binding-surface/spec.md#requirement-srf-004-contract-identifiers-in-a-traceability-record-resolve-in-the-requirement-index
[SRF-010]: ../../specs/binding-surface/spec.md#requirement-srf-010-a-binding-local-requirement-does-not-use-a-store-prefix
[SRF-011.02]: ../../specs/binding-surface/spec.md#requirement-srf-011-the-spec-artifact-holds-the-binding-templates
[SRF-013]: ../../specs/binding-surface/spec.md#requirement-srf-013-the-binding-checker-checks-the-traceability-record
[SRF-014]: ../../specs/binding-surface/spec.md#requirement-srf-014-the-template-config-follows-the-store-config
[SRF-014.01]: ../../specs/binding-surface/spec.md#requirement-srf-014-the-template-config-follows-the-store-config
[SRF-014.02]: ../../specs/binding-surface/spec.md#requirement-srf-014-the-template-config-follows-the-store-config
[VER-005]: ../../specs/schema-versioning/spec.md#requirement-ver-005-spec-artifacts-are-distributed-pinned-and-hash-verified
