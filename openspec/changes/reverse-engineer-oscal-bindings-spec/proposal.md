## Why

The Python `oscal-bindings` library encodes a large body of OSCAL binding
behavior — type-name derivation, parsing, strict serialization, an error
taxonomy, a uniform document facade, back-matter builders, and element
validation — but that behavior lives only as Python code and prose scattered
across `DEVELOPING.md`, `.agents/summary/`, and the test suite. We want parallel
bindings in TypeScript/JS, Go, Java, and Rust. Without a language-neutral
contract and a shared conformance corpus, each port will re-derive naming rules
and strictness semantics independently and drift from the Python reference
(for example, the five name-collision overrides would resolve to different
names in different languages). This change reverse-engineers the intended
contract — not the Python implementation details — into a form every language
can implement and be checked against.

## What Changes

- Establish a **standalone OpenSpec store** (a separate repo) as the home for
  the language-neutral OSCAL bindings contract, so no single language
  implementation owns the spec. Python becomes one implementation among equals.
- Author a **prose contract** as a set of OpenSpec capabilities covering model
  derivation, document parsing, serialization, the error model, the document
  facade, back-matter builders, element validation, and schema versioning. The
  prose captures *intent*, deliberately excluding Python-only mechanics
  (pydantic internals such as `__pydantic_base_init__`, construct-by-name
  kwargs, the `str | bytes` overload style) and recording the intended behavior
  rather than known upstream quirks (e.g. the pydantic#13275 JSON-mode drop is
  specified as "reject," not reproduced).
- Define a **machine-readable naming manifest** (`names.json`): schema `$id` →
  canonical type name, wrapper → body field, the collision overrides, variant
  renames, and enums. This is the shared source of truth so every port derives
  identical type names. (Generating it from Python's post-processor is a
  follow-up change to this repo, not part of this one.)
- Define a **conformance corpus**: valid documents paired with expected
  canonical round-trip output, invalid documents paired with their expected
  error category, and element-validation cases. Every port runs the same corpus.
- Adopt **Semantic Versioning for the distributed artifact**
  (`MAJOR.MINOR.PATCH+oscal.<release>`): the `MAJOR.MINOR.PATCH` component
  versions the *contract's own compatibility* (a type rename, stricter rule, or
  changed error category is MAJOR), and the OSCAL release rides as SemVer
  **build metadata** (`+oscal.1.2.3`), which SemVer ignores for precedence, so
  it carries provenance without masquerading as a compatibility signal. A
  human-readable two-axis git tag (`oscal-1.2.3/spec-4`) may label the release
  for people, but the artifact's version is SemVer-clean. Distribution is a
  **tarball-at-a-tag model** with a recorded `sha256`, so consumers pin and
  hash-verify the spec artifacts the way this repo already pins its lockfiles.
- Lay out a **phased rollout** in three phases. This change is phase 1. Phases 2 and 3 are separate future changes, each
  with its own proposal:
  1. Phase 1 (this change) creates the store, authors the contract and corpus into it, publishes the first pinned
     artifact, and adds a Python conformance runner. Python keeps its vendored schemas and its post-processor.
  2. Phase 2 adds a manifest emitter to Python's post-processor and brings up a second port that consumes the manifest.
  3. Phase 3 makes the store the schema authority. Python's codegen then reads schema and manifest from the pinned
     spec checkout.

This change keeps this repo's build as it is. `scripts/postprocess_models.py`, `hatch run generate`, and the vendored
`schemas/` directory stay the same. The only addition to this repo is the conformance runner. It reads the pinned corpus
and does not touch any existing build input.

## Capabilities

### New Capabilities
- `model-derivation`: Rules for turning the OSCAL JSON Schema into canonical,
  language-neutral type names — `$id`-suffix naming, scalar-wrapper collapse,
  `*Document` wrapper derivation from each wrapper's single body field, variant
  renames, the fixed set of collision overrides, enum handling, and the codegen
  guards (ambiguous wrapper, wrapper-count mismatch, uncovered collision).
- `document-parsing`: Parsing OSCAL from text or bytes into a typed document,
  the eight typed per-document-type parsers and their wrong-type behavior, and
  strict rejection of unknown fields and name-keyed (non-alias) input.
- `serialization`: Serializing a document back to OSCAL JSON — alias keys only,
  no `null` emitted on any path, canonical key ordering, pretty vs compact, and
  the round-trip equivalence contract.
- `error-model`: The language-neutral error taxonomy (parse error with
  structured validation details, access error, wrong-document-type, unknown
  element type, file-not-found) and which situation maps to which category,
  independent of how each language surfaces errors.
- `document-facade`: A uniform accessor over any document type (metadata, uuid,
  oscal-version, body) plus the assessment-period accessor restricted to
  Assessment Plan / Assessment Results.
- `backmatter-builders`: Constructors for back-matter `hash`, `rlink`, and
  `resource` values, including defaults and validation behavior.
- `element-validation`: Validating a standalone OSCAL element against a named
  element type, the derivation of supported element-type names, and the
  unknown-type behavior.
- `schema-versioning`: The major-version namespace rule, single active OSCAL
  release per binding set, the strict-coverage caveat ("supports the vendored
  release and earlier"), recording the exact release, and the Semantic Versioning of the spec artifacts themselves,
  with the OSCAL release carried as build metadata.

### Modified Capabilities
<!-- None. The project has no existing OpenSpec specs; this is the first change. -->

## Impact

- **New repo (created by this change):** a standalone OpenSpec store that holds `openspec/specs/`, `schemas/<release>/`,
  `manifest/<release>/`, and `corpus/<release>/`. This change moves itself into the store after the store exists, and
  is archived there. The Python repo therefore never holds a second copy of the contract.
- **This Python repo (this change):** a conformance runner over the pinned corpus. No other change to this repo.
- **This Python repo (phases 2 and 3, separate changes):** a manifest emitter in `scripts/postprocess_models.py`. Later,
  `hatch run generate` reads schema and manifest from a pinned spec checkout instead of the vendored `schemas/`
  directory.
- **Future port repos (TS/JS, Go, Java, Rust):** each consumes the pinned spec
  tarball (verified by `sha256`), runs codegen from schema + manifest, and
  passes the conformance corpus.
- **Portability constraints to carry into the specs:** regex-dialect
  differences (XSD/`\p{...}` classes vs Go RE2 vs JS `u`-flag), timezone-aware
  datetime handling, byte-exact-vs-semantic round-trip equivalence, and
  `oneOf` union representation across languages.
