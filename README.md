# OSCAL bindings specs

The language-neutral contract for OSCAL data bindings: OpenSpec capability specs, the vendored NIST OSCAL JSON Schema,
the naming manifest, and the conformance corpus. Each language binding implements the contract and passes the corpus.

This repo is an [OpenSpec store](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md).

## Layout

1. `openspec/`: the capability specs (`specs/`), the changes (`changes/`), the config, and the identifier ledger
   `spec-ids.yaml`.
2. `schemas/<release>/`: the NIST OSCAL JSON Schema files of one release, byte-for-byte, with `sha256` sums.
3. `manifest/<release>/`: the naming manifest.
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
7. `openspec validate --all --strict`.

`VERSION` holds the spec artifact version: a Semantic Version with the OSCAL release as build metadata, for example
`0.1.0+oscal.1.2.3`.
