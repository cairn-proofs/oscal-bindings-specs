# Dependencies

## Toolchain

| Tool | Pinned in | Use |
|---|---|---|
| Node | `mise.toml`, `package.json` `engines` | Runtime for all scripts and the binding checker |
| OpenSpec CLI (`@fission-ai/openspec`) | `mise.toml`, `mise.lock` | `openspec validate --all --strict`, store registration |
| mise | `build.yml` (`version:`) | Installs the toolchain from the lockfile |
| `gh` | not pinned | `verify-release.sh`, `pin-move-check.yml`, release creation |

## npm packages

Exact versions, no install scripts (`.npmrc`).

| Package | Used by | Why |
|---|---|---|
| `ajv` | corpus, names, constraints, exclusions, requirements, traceability, YAML reader, datatype rules | JSON Schema validation, independent of any binding |
| `@xmldom/xmldom` | `metaschema.ts` | Parse the vendored Metaschema XML |
| `json-p3` | `jsonpath.ts` | RFC 9535 queries in strict mode |
| `iregexp-check` | `constraints-regex.ts`, `constraints.ts` | Check that generated regexes are RFC 9485 I-Regexp |
| `github-slugger` | `spec-markdown.ts` | GitHub-compatible anchors for spec links |
| `yaml` | `spec-ids.ts`, `coverage.ts`, `templates.ts`, `yaml-reader.ts` | Read the ledger and scenario checks; reference YAML reader |
| `esbuild` (dev) | `templates.ts` | Bundle `binding-check.ts` into `check-binding.mjs`, with a metafile for license listing |
| `tsx`, `typescript`, `@types/node` (dev) | all | Run and type check the scripts |

The bundle in `templates/binding/bin/check-binding.mjs` includes its packages. `templates/binding/README.md` lists them
with their licenses.

## External data

| Data | Where | Integrity |
|---|---|---|
| NIST OSCAL JSON Schema | `schemas/<release>/` | `SHA256SUMS`, `SOURCE.md`, immutable after release |
| NIST OSCAL Metaschema (resolved modules) | `metaschema/<release>/` | `SHA256SUMS`, `SOURCE.md` |
| Metaschema datatypes XSD (`usnistgov/metaschema`) | `metaschema/<release>/` | Same |
| Corpus inputs from `usnistgov/oscal-content` | `corpus/<release>/documents/valid/` | `source.commit` and `source.sha256` in each case |
| `usnistgov/oscal-content` clone | outside the repo | Only for `npm run content:evaluate` |

## GitHub Actions

All actions are pinned by full commit SHA with a version comment: `actions/checkout`, `jdx/mise-action`,
`actions/upload-artifact`, `actions/download-artifact`, `actions/attest`.
