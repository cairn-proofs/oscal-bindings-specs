# OSCAL bindings specs

The language-neutral contract for OSCAL data bindings: OpenSpec capability specs, the vendored NIST OSCAL JSON Schema,
the naming manifest, and the conformance corpus. Each language binding implements the contract and passes the corpus.

This repo is an [OpenSpec store](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md).

## Why this exists

[OSCAL](https://pages.nist.gov/OSCAL/) is a standard format from NIST for writing down security and compliance
information in a form computers can read: what a system is, which security controls it uses, and how well it meets
them. Organizations exchange these documents with auditors, agencies, and each other.

The standard is published as a schema, which is a technical description of what a valid document looks like. A schema
is not a ready-made tool. Each team that wants to read or write OSCAL in its own programming language has to build a
library from it, and that causes three problems:

1. **The same document gets different answers.** One library accepts a document and another rejects it, or both accept
   it and read it differently. Two organizations then disagree about whether the same compliance record is correct.
2. **The same thing gets different names.** Each library invents its own names for the parts of a document. Code and
   knowledge do not carry from one language to another, and every team learns the standard again from the start.
3. **Nobody can prove a library is right.** Without a shared yardstick, "this library follows OSCAL" is a claim that
   the author makes and the user must trust.

This repo fixes this by holding the rules once, in a form that does not depend on any programming language:

1. **A written contract** that says what every library must do and how it must report problems.
2. **One naming list** that gives each part of OSCAL a single name that every library uses.
3. **A shared set of test documents** with the expected result for each. A library passes when it gives these results.
4. **A copy of the official NIST schema**, unchanged, so everyone works from the same source.

The repo holds no software that reads or writes OSCAL. The libraries that do (see
[Known implementations](#known-implementations)) follow this contract and prove it by passing the test documents.
Releases are numbered and signed, so a library can name the exact version of the rules it follows and anyone can check
it (see [Verify a release](#verify-a-release)).

## Layout

1. `openspec/`: the capability specs (`specs/`), the changes (`changes/`), the config, the identifier ledger
   `spec-ids.yaml`, and the requirement index `requirements.json`. `npm run requirements:write` generates the index
   from the main specs. It lists the identifier, capability, and title of each requirement. `traceability.schema.json`
   is the JSON Schema of the traceability record that each binding keeps (see
   [binding-surface](openspec/specs/binding-surface/spec.md)).
   The requirements of each spec are in reading order, not in identifier order. A reader finds a requirement by its
   identifier with search or `openspec/requirements.json`.
2. `schemas/<release>/`: the NIST OSCAL JSON Schema files of one release, byte-for-byte, with `sha256` sums.
3. `metaschema/<release>/`: the NIST OSCAL Metaschema modules of one release and the Metaschema datatypes XSD,
   byte-for-byte, with `sha256` sums. The constraint manifest comes from these files.
   The directories of the store group files by the kind of content that they hold, not by the repository that the
   content comes from. The modules in `metaschema/<release>/` and the JSON Schema files in `schemas/<release>/` come
   from the same OSCAL release. The datatypes XSD comes from `usnistgov/metaschema`. `SOURCE.md` in each directory
   records the source of each file.
4. `manifest/<release>/`: the manifests. `names.json` is the generated naming manifest. It holds the canonical name,
   kind, and schema pointers of each type. `overrides.json` is the hand-edited naming input. `constraints.json` is the
   generated constraint manifest. It holds the Metaschema constraints that the JSON Schema cannot state, as queries
   that a binding runs. `constraint-exclusions.json` is the hand-edited list of the constraints that the manifest
   leaves out. `manifest/*.schema.json` are the JSON Schemas of these files (see
   [manifest/1.2.3/README.md](manifest/1.2.3/README.md)).
5. `corpus/<release>/`: the conformance corpus.
6. `docs/`: shared documents that the specs cite, such as
   [canonical JSON for conformance comparison](docs/canonical-json.md). It also holds the
   [README sticker for bindings](docs/sticker.md).
7. `scripts/`: the store tooling.

## Use the store

1. Clone this repo.
2. Register it: `openspec store register <path>`.
3. In a binding repo, add the store to `openspec/config.yaml`:

   ```yaml
   references:
     - { id: oscal-bindings-specs, remote: "https://github.com/cairn-proofs/oscal-bindings-specs.git" }
   ```

A reference is planning context only. Builds and conformance runs use the tagged archive, pinned by its `sha256`.

The archive holds `templates/binding/`: an OpenSpec config, an empty identifier ledger, an empty traceability record,
the binding checker, a pre-commit hook, and an agent guide (`AGENTS.md`) that states how a binding relates to the
store. The hook verifies the pinned archive by its `sha256`, and runs the binding
checker and `openspec validate --all --strict` on the staged files before each commit. So a binding finds a bad
identifier, citation or record entry before it commits it. `templates/binding/README.md` gives the install steps.

To get an issue when a newer release is published, a binding calls the reusable workflow
[`pin-move-check.yml`](.github/workflows/pin-move-check.yml) on a schedule and passes the version that it pins. The
workflow opens one issue, "Move the spec pin to v<version>", in the binding's tracker. It runs with the binding's own
`GITHUB_TOKEN` and needs no secret. The header of the workflow file shows the caller.

## Known implementations

1. `oscal-bindings-python`, in Python: [repository](https://github.com/cairn-proofs/oscal-bindings-python),
   [issue tracker](https://github.com/cairn-proofs/oscal-bindings-python/issues).
2. `oscal-bindings-typescript`, in TypeScript: [repository](https://github.com/cairn-proofs/oscal-bindings-typescript),
   [issue tracker](https://github.com/cairn-proofs/oscal-bindings-typescript/issues).

Each binding keeps its own expected conformance failures, in its own repository. This store holds no data about the
state of a binding (see [schema-versioning](openspec/specs/schema-versioning/spec.md)). `npm run binding-links:check`
reads this list.

## Develop

[CONTRIBUTING.md](CONTRIBUTING.md) describes how to change a requirement and how a binding adds or promotes an
operation.

[mise](https://mise.jdx.dev) pins Node and the OpenSpec CLI. `package-lock.json` pins the npm dependencies.

1. `mise install`
2. `npm ci`
3. `npm run check`

`npm run check` runs these checks one after another, and it is the gate to run before a pull request. `npm run check:parallel`
runs the same steps at the same time, and CI runs it on each pull request. It reads the steps from the `check` script of
`package.json`, so the list exists in one place. A step that fails stops the start of new steps, and the output of the
failed step is the first thing that the run prints. `npm run check:parallel -- --jobs <n>` limits the steps that run at
once, and `npm run check:parallel:self-test` runs its self-test. The longest step, `npm run constraints:check`, sets the
wall time of a parallel run.

1. The TypeScript typecheck.
2. The identifier checker and its self-test.
3. The requirement index generator self-test, which also checks the traceability record JSON Schema on sample
   records, and `npm run requirements:check`: it fails when `openspec/requirements.json` differs from the generator
   output.
4. The `VERSION` check and its self-test. See [Version](#version).
5. The schema `sha256` check, the metaschema `sha256` check, and the self-test of the metaschema check
   (`npm run metaschema:self-test`).
6. The canonical JSON self-test.
7. The YAML reader self-test. `scripts/yaml-reader.ts` is the reference reader that the corpus check uses for YAML
   inputs.
8. The corpus check (see [corpus/1.2.3/README.md](corpus/1.2.3/README.md)).
9. The archive self-test, `npm run archive:self-test`. It builds the archive from `HEAD` and checks that it holds each
   file of `metaschema/<release>/`, `openspec/requirements.json`, `openspec/traceability.schema.json`, and the other
   paths of `CONTENTS`.
10. The binding link check and its self-test, `npm run binding-links:check`. It fails when a tracked file outside
    `openspec/changes/` links an individual issue or pull request in a binding repository. The binding repositories are
    the repositories in [Known implementations](#known-implementations) and each `oscal-bindings-*` repository other
    than this store.
11. The names generator self-test, and `npm run names:check`: it validates each manifest file and fails when
    `names.json` differs from the generator output.
12. The release checks and their self-test, `npm run releases:check`. A released name that changes needs a breaking
    `VERSION` increment, and a released `schemas/<release>/` file must not change. `VERSION` must also meet the step
    rule in [Version](#version). These checks read git tags and history, so they fail in a shallow clone or a clone
    without tags. They also list each name change against the base ref (`SPEC_IDS_BASE`, default `HEAD`), and CI
    writes that list to the job summary.
13. The scenario coverage checks, `npm run coverage:check`, and their self-tests. `npm run coverage:check` fails when
    `openspec/coverage.json` differs from the generator output, or when a scenario has no corpus case, no self-test, and
    no entry in `openspec/scenario-checks.yaml`. `npm run coverage:faults` runs the corpus against faulty evaluators and
    lists the cases that detect each fault. A fault that no case detects fails the run. See
    [CONTRIBUTING.md](CONTRIBUTING.md#change-a-requirement).
14. `openspec validate --all --strict`.

To change a canonical name, edit `manifest/<release>/overrides.json`, run `npm run names:write`, and commit both
files.

To add, rename, or remove a requirement in the main specs, run `npm run requirements:write`, and commit the index with
the specs.

### Version

`VERSION` holds the spec artifact version. The version is `MAJOR.MINOR.PATCH+oscal.<release>`, for example
`0.1.0+oscal.1.2.3`. It follows [Semantic Versioning 2.0.0][VER-003], has no pre-release label, and holds the OSCAL
release as [build metadata][VER-004].

1. A reviewer decides if a change is a break, an addition or a fix ([VER-003]). Semantic Versioning 2.0.0 gives the
   increment for each kind.
2. A change that needs an increment sets `VERSION` to the version of the next release. Do this also when no release
   follows at once. Changes between two releases share one increment.
3. `VERSION` must be the latest release, or one patch, minor or major step above it ([VER-008]). The latest release is
   the release tag on `main` with the highest precedence, for all OSCAL releases. `npm run releases:check` fails
   when `VERSION` is not one of these versions. It cannot find an increment that is too small, so the reviewer
   checks that too.
4. For the steps after the merge, see [Release](#release).

[VER-003]: openspec/specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-004]: openspec/specs/schema-versioning/spec.md#requirement-ver-004-the-oscal-release-is-recorded-as-semantic-versioning-build-metadata
[VER-008]: openspec/specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it

## Threat model

This repo's threat model is a [Threat Composer](https://github.com/awslabs/threat-composer) `.tc.json` file, kept in
a separate private repo, `oscal-bindings-specs-threat-models`, rather than in this repo. Access to it is optional: you
do not need it to build, test or contribute.

If you have access, clone it **beside** this repo, not inside it:

```
gh repo clone cairn-proofs/oscal-bindings-specs-threat-models ../oscal-bindings-specs-threat-models
```

Open the `.tc.json` file there with the Threat Composer VS Code extension or web app.

## Release

1. Merge the pull request that sets the new version in `VERSION`. See [Version](#version).
2. Push the tag `v<VERSION>` on that commit of `main`, for example `v0.1.0+oscal.1.2.3`.
3. CI runs `npm run check:parallel`, builds the archive with `npm run archive`, and attaches the archive and `SHA256SUMS` to a
   draft GitHub release. CI fails when the tag is not on `main` or does not match `VERSION`.
4. Review the draft and publish it.
5. Each binding that calls `pin-move-check.yml` gets its pin-move issue on its next scheduled run. Open the issue by
   hand for a binding that does not call it.

## Verify a release

Pin the archive by the `sha256` in `SHA256SUMS`, not by the tag. Before you pin or update a pin, check the archive you
downloaded. In the commands below, `<version>` is the release version, for example `0.8.0+oscal.1.2.3`.

1. The archive matches `SHA256SUMS`:

   ```
   shasum -a 256 -c SHA256SUMS
   ```

2. This repo's CI built the archive from the tag (SLSA build provenance, logged in the public Sigstore transparency
   log):

   ```
   gh attestation verify oscal-bindings-specs-<version>.tar.gz --repo cairn-proofs/oscal-bindings-specs \
     --cert-identity "https://github.com/cairn-proofs/oscal-bindings-specs/.github/workflows/build.yml@refs/tags/v<version>"
   ```

3. The archive is the asset published in the release (GitHub release attestation):

   ```
   gh release verify-asset v<version> oscal-bindings-specs-<version>.tar.gz --repo cairn-proofs/oscal-bindings-specs
   ```

4. The archive holds exactly the tagged files. In a clone of this repo with its tags, run
   `scripts/verify-release.sh v<version>`. It rebuilds the archive with `git archive` from the tag, compares it with
   the published archive, and runs checks 1 to 3, skipping a check the release cannot pass (see below). It runs no
   code from the tag. It needs `gh` signed in.

Older releases cannot pass every check. Releases up to and including `v0.7.0+oscal.1.2.3` were built before CI
attested provenance, so check 2 fails for them. `v0.1.0+oscal.1.2.3` and `v0.2.0+oscal.1.2.3` are not immutable
releases, so check 3 fails for them. Checks 1 and 4 pass for every release.

These checks show that the archive matches the tagged commit. They do not show that the tagged commit is free of
unwanted changes.
