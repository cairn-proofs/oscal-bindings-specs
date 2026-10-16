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
5. `scripts/`: the store tooling.

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

`npm run check` runs the TypeScript typecheck, the identifier checker self-test, the identifier checker, the schema
`sha256` check, and `openspec validate --all --strict`. CI runs the same command on each pull request.
