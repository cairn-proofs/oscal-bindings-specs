# OSCAL bindings specs

The language-neutral contract for OSCAL data bindings: OpenSpec capability specs, the vendored NIST OSCAL JSON Schema,
the naming manifest, and the conformance corpus. Each language binding implements the contract and passes the corpus.

This repo is an [OpenSpec store](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md).

## Layout

1. `openspec/`: the capability specs (`specs/`), the changes (`changes/`), the config, and the identifier ledger
   `spec-ids.yaml`.
2. `schemas/<release>/`: the NIST OSCAL JSON Schema files of one release, byte-for-byte, with `sha256` sums.
3. `manifest/<release>/`: the naming manifest. `names.json` is generated and holds the canonical name, kind, and
   schema pointers of each type. `overrides.json` is the hand-edited naming input. `manifest/*.schema.json` are the
   JSON Schemas of both files (see [manifest/1.2.3/README.md](manifest/1.2.3/README.md)).
4. `corpus/<release>/`: the conformance corpus.
5. `docs/`: shared rule documents that the specs cite, such as
   [canonical JSON for conformance comparison](docs/canonical-json.md).
6. `scripts/`: the store tooling.

## Use the store

1. Clone this repo.
2. Register it: `openspec store register <path>`.
3. In a binding repo, add the store to `openspec/config.yaml`:

   ```yaml
   references:
     - { id: oscal-bindings-specs, remote: "https://github.com/cairn-proofs/oscal-bindings-specs.git" }
   ```

A reference is planning context only. Builds and conformance runs use the tagged archive, pinned by its `sha256`.

## Develop

[mise](https://mise.jdx.dev) pins Node and the OpenSpec CLI. `package-lock.json` pins the npm dependencies.

1. `mise install`
2. `npm ci`
3. `npm run check`

`npm run check` runs these checks. CI runs the same command on each pull request.

1. The TypeScript typecheck.
2. The identifier checker and its self-test.
3. The `VERSION` check and its self-test.
4. The schema `sha256` check.
5. The canonical JSON self-test.
6. The corpus check (see [corpus/1.2.3/README.md](corpus/1.2.3/README.md)).
7. The names generator self-test, and `npm run names:check`: it validates each manifest file and fails when
   `names.json` differs from the generator output.
8. The release checks and their self-test, `npm run releases:check`. A released name that changes needs a breaking
   `VERSION` increment, and a released `schemas/<release>/` file must not change. These checks read git tags and
   history, so they fail in a shallow clone or a clone without tags. They also list each name change against the
   base ref (`SPEC_IDS_BASE`, default `HEAD`), and CI writes that list to the job summary.
9. `openspec validate --all --strict`.

To change a canonical name, edit `manifest/<release>/overrides.json`, run `npm run names:write`, and commit both
files.

`VERSION` holds the spec artifact version: a Semantic Version with the OSCAL release as build metadata, for example
`0.1.0+oscal.1.2.3`.

## Release

1. Set the new version in `VERSION`, and merge the pull request.
2. Push the tag `v<VERSION>` on that commit of `main`, for example `v0.1.0+oscal.1.2.3`.
3. CI runs `npm run check`, builds the archive with `npm run archive`, and attaches the archive and `SHA256SUMS` to a
   draft GitHub release. CI fails when the tag is not on `main` or does not match `VERSION`.
4. Review the draft and publish it.

A consumer pins the archive by the `sha256` in `SHA256SUMS`, not by the tag.
