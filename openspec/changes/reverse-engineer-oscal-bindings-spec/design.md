## Context

See proposal.md — Why. The behavior to be specified exists today only as Python
code and prose (`DEVELOPING.md`, `.agents/summary/`, `tests/`). The constraints
that shape this design:

- The Python repo pins and hash-locks every build input (Hatch envs via
  `hatch-pip-compile`, toolchain via mise). Any distribution model for the spec
  artifacts should preserve that "every input is hash-locked" property rather
  than poke a hole in it.
- OSCAL schemas are NIST's; the manifest and corpus are ours. The repo's
  existing rule — change the schema or the post-processor, never the generated
  output — must survive across five language repos.
- The naming rules currently live as Python code: `derive_document_renames`,
  `VARIANT_RENAMES`, and `COLLISION_OVERRIDES` in `scripts/postprocess_models.py`,
  plus the three codegen guards (ambiguous wrapper, wrapper-count mismatch,
  uncovered collision).
- OSCAL regex patterns assume an XSD-flavored engine (`\p{L}`-style classes);
  target languages disagree (Go RE2 rejects some constructs, JS needs the `u`
  flag). Datetime handling (timezone-aware) and `oneOf` union representation
  also vary by language.

## Goals / Non-Goals

**Goals:**

- A language-neutral contract that a TS/JS, Go, Java, or Rust author can
  implement from, plus a mechanism that proves a given port conforms.
- A single source of truth for type naming (`names.json`) so collision
  overrides and wrapper names resolve identically in every language.
- A distribution and versioning model that matches the Python repo's
  pinned-and-hashed discipline and is uniform across all five languages.
- A rollout that starts without breaking the Python repo. The disruptive step is making the store the schema authority.
  The rollout defers it until a second consumer exists to prove the manifest format.
- Phase 1 of that rollout, delivered by this change and one local change in the Python repo (D8):
  1. Create and register the standalone store.
  2. Move the capability specs and this change into the store.
  3. Vendor the active schema bundle into the store with a recorded hash.
  4. Build the conformance corpus.
  5. Publish the first pinned, hash-verified artifact.
  6. In the Python repo's local change: add a Python conformance runner that passes against that artifact, with the
     known gap recorded.

**Non-Goals:**

- Phases 2 and 3. Each is a separate future change with its own proposal (see Migration Plan).
- Any edit to the Python repo's `scripts/postprocess_models.py`, `hatch run generate`, or `schemas/` layout. Those
  belong to phases 2 and 3.
- A finalized `names.json` format. Phase 1 ships a manifest placeholder. Phase 2 fixes the format against two real
  consumers (D6).
- Specifying Python-only mechanics. The contract records intent; pydantic
  internals and the `str | bytes` overload style stay out of the spec.

## Decisions

### D1 — Standalone OpenSpec store, not the Python repo's `openspec/`

Host the contract in a separate repo registered as an OpenSpec store, shared by
all five language repos.

- **Why:** five language repos depending on the Python repo for their spec would
  make Python an awkward owner and imply Python is privileged. A standalone
  store makes Python one implementation among equals, checked against the corpus
  like the others. The user owns the ports now but others will get involved, so
  a neutral home matters.
- **Alternative considered:** keep the spec in the Python repo's `openspec/`. Simplest
  short-term, but entrenches Python as the owner and forces cross-repo coupling.
  Rejected.

### D2 — Three artifacts: prose spec, naming manifest, conformance corpus

The contract is not just prose. It is prose (OpenSpec capabilities) + a
machine-readable `names.json` + a data corpus.

- **Why:** prose alone drifts. A port can read "derive the wrapper name from its
  body field" and still produce a different name than Python's. `names.json`
  removes that freedom; the corpus catches behavioral drift (strictness,
  round-trip, error category) that prose can't enforce. The repo already has a
  corpus fetcher and round-trip property tests — turning those into data files
  is most of the corpus work.
- **Alternative considered:** prose-only, each port re-derives names from the
  rules. Rejected: guarantees the collision overrides diverge.

### D3 — Contract records intent, not Python quirks

The spec states the intended behavior and omits implementation workarounds.

- **Why:** some current Python behavior is a pydantic workaround, not desired
  behavior. The clearest case: pydantic 2.13.x silently drops a name-keyed field
  in JSON mode (pydantic#13275) instead of rejecting it. The spec says "reject a
  name-keyed field in every input mode" — the intent — and does not enshrine the
  drop. Likewise `__pydantic_base_init__`, construct-by-name kwargs, and the
  `str | bytes` overloads are Python mechanics, not contract.
- **Trade-off:** the Python reference will have a known, documented gap against
  its own spec (tracked in cairn-proofs/oscal-bindings-python#6) until pydantic
  fixes it. That is correct: the gap is a bug, and the spec should name it as
  one rather than normalize it.

### D4 — SemVer the artifact; OSCAL release as build metadata

The distributed artifact is versioned with Semantic Versioning, with the OSCAL
release carried as SemVer build metadata:

```
2.4.1+oscal.1.2.3
^^^^^ ^^^^^^^^^^^
  |         +-- build metadata: which NIST release (informational,
  |             ignored for SemVer precedence)
  +------------ the contract's own SemVer (compatibility)
```

- **`MAJOR.MINOR.PATCH` versions the contract's own compatibility**, which is the
  question a port author actually asks ("will this break my implementation?"):
  - MAJOR — a breaking change to the contract: a type rename in `names.json`, a
    stricter parse rule, a changed error category.
  - MINOR — backward-compatible additions: a new corpus case, a new optional
    capability, specifying previously-unspecified behavior.
  - PATCH — fixes that don't change the contract: a corpus fixture typo, a prose
    clarification.
- **The OSCAL release is build metadata (`+oscal.<release>`).** SemVer defines
  build metadata as ignored when determining version precedence, so it records
  provenance (the `__oscal_schema_version__` equivalent, in the version string)
  without pretending to be a compatibility signal.
- **An OSCAL release change maps onto SemVer by its actual impact, not by NIST's
  numbering:**
  - A compatible OSCAL bump (e.g. 1.2.3 → 1.2.4: new optional fields, no
    removals) adds names to the manifest and breaks nothing a port implemented →
    MINOR: `2.4.1+oscal.1.2.3` → `2.5.0+oscal.1.2.4`.
  - A breaking OSCAL bump (1.x → 2.0: new type names, removed fields) → MAJOR:
    `3.0.0+oscal.2.0.0`. This aligns with the repo's existing rule that OSCAL 2.0
    is the trigger for a second version package (`v2`).
- **The two-axis idea survives as a human-readable git tag.** A tag like
  `oscal-1.2.3/spec-4` may label the release for people; it need not equal the
  SemVer artifact version. The tag is a label, the artifact version is the
  contract (and, with D5's sha256, the hash is the pin).

- **Why not encode the OSCAL release into the SemVer digits** (e.g. artifact
  version `1.2.3` = OSCAL 1.2.3)? It reads like SemVer but lies about
  compatibility: a backward-compatible OSCAL 1.2.3 → 1.2.4 would look like a
  version bump driven by NIST's numbering rather than our compatibility, and a
  breaking change to *our* contract against the same OSCAL release would have
  nowhere to go. The two concerns fight for the same digits. Rejected.
- **Why not a bespoke single two-axis string** (`oscal-1.2.3/spec-4`) as the
  artifact version? It captures provenance but states no compatibility promise,
  and package registries (D5's deferred packages path) can't consume it.
  Retained only as an optional human-facing tag, not as the artifact version.

### D5 — Distribution: tarball at a tag, pinned by recorded sha256

Consumers fetch a `.tar.gz` for a given tag and verify a recorded `sha256`.
Codegen pulls only `schemas/` + `names.json`; the conformance runner pulls the
full corpus.

- **Why:** this matches the Python repo's pinned-and-hashed discipline exactly and is
  uniform across all five languages. The tag is a label; the sha256 is the lock
  (a git tag can be force-moved, so the hash is what actually pins). A small
  `hatch run` fetch-verify script is the kind of thing the Python repo already does.
- **Not an OpenSpec reference:** a code repo can also declare the store in its `openspec/config.yaml` under
  `references`. That gives the repo's planning read-only access to the store's main specs. It is not a build input:
  OpenSpec never clones or pulls, and it reads the local checkout as-is, with no pin. Use both. The reference serves
  planning. The tarball serves builds and conformance runs.
- **Alternatives considered:**
  - *Git submodule* — identical mechanism everywhere, but invisible to the
    lockfile discipline (nothing in `requirements.txt`/`mise.lock` pins it) and
    drags the whole corpus into a codegen step that needs two files. Rejected as
    the one option that breaks the hash-locked guarantee.
  - *Published packages (PyPI/npm/crates/Maven)* — best native fit per language
    and native lockfile hashing, but five publish pipelines and version-string
    skew across ecosystems for what is one set of data files. Deferred: revisit
    per-language once the format is stable; a hybrid (packages where the registry
    is pleasant, tarball elsewhere) is acceptable later. The D4 SemVer artifact
    version is what makes this path viable at all — registries require a
    SemVer-ish version, and the `+oscal.<release>` build metadata is the bridge
    that keeps provenance in the version string without breaking that
    requirement.

### D6 — Manifest generator starts in Python, may move later

In phase 2 the Python post-processor emits `names.json`; the rules stay Python
code for now. Only in phase 3 does the generator move to the spec repo and the
post-processor become a consumer of the manifest.

- **Why:** designing the manifest format against two real consumers (Python plus
  a second port) beats guessing at it from one. Moving the rules out of Python
  before a second consumer exists is premature.

### D7 — Capability decomposition

Eight capabilities (see proposal.md — Capabilities): `model-derivation`,
`document-parsing`, `serialization`, `error-model`, `document-facade`,
`backmatter-builders`, `element-validation`, `schema-versioning`.

- **Why this split:** it follows the natural layering (derivation → runtime
  contract → convenience) and keeps each capability independently portable. The
  error model is its own capability because every language surfaces errors
  differently (Go `(T, error)`, Rust `Result`, Java exceptions) and the taxonomy
  must stand apart from any one representation.

### D8 — Each code repo implements the contract in its own local change

This change holds the contract and the store work only. Work in a code repo goes into a local OpenSpec change in that
repo. The code repo declares the store under `references` in its `openspec/config.yaml`. The local change cites the
store's main specs and lists only that repo's tasks. Each local change is applied, reviewed, and archived in its own
repo.

- **Why:** OpenSpec does not route the tasks of a store change to code repos. A store change that lists code-repo
  tasks cannot be applied in the code repo, and its review mixes two repos. The OpenSpec stores guide recommends this
  pattern for shared contracts.
- **Phase 1:** the Python repo gets one local change, created after the contract is in the store's main specs. It
  adds the conformance runner, records the conformance result, verifies the clean-checkout path, and decides the
  future of the parked Python identifier checker.
- **Alternative considered:** keep the Python tasks in this change. Rejected for the reasons above.

## Risks / Trade-offs

- **Regex dialect divergence** → The spec must carry an explicit pattern-portability
  rule (which constructs are in-contract, how `\p{...}` classes map, Go RE2
  limits, JS `u` flag), not just "validate the pattern." Captured as a
  requirement in `document-parsing`/`element-validation`.
- **Round-trip definition ambiguity** → Byte-exact round-trip is unachievable
  across serializers (key order, float formatting). Decision: conformance means
  **semantic equality plus canonical key order**, not byte-identical. The corpus
  stores canonicalized expected output. Specified in `serialization`.
- **`oneOf` unions are awkward in Go/Java** → Mitigated by making the
  `document-facade` capability a required part of the contract, so consumers get
  uniform access without each hand-rolling union dispatch.
- **Timezone-aware datetimes** → Each port needs the same rule: reject
  datetimes lacking a required timezone, and define whether the original offset
  survives a round trip. Specified in `document-parsing`/`serialization`.
- **Python reference lags its own spec (pydantic#13275)** → Accepted and
  documented (D3); the conformance corpus will include the name-keyed-rejection
  case, which Python's JSON path currently fails. The gap is tracked upstream,
  not hidden.
- **Manifest format churn before phase 2** → Mitigated by D6: don't freeze the
  format until a second consumer exercises it.

## Migration Plan

Three phases. This change is phase 1. Phases 2 and 3 are separate changes, each proposed only after the phase before it
lands, because each depends on what the earlier phase produced.

1. **Phase 1 (this change)** — Stand up the spec store with the prose capabilities, the vendored schema bundle, and the
   conformance corpus. Move this change into the store once the store exists, and archive it there. The Python repo
   then never holds a second copy of the specs. Python keeps its vendored `schemas/` and its post-processor as they
   are. A local change in the Python repo adds a conformance runner over the pinned corpus (D8).
2. **Phase 2 (separate changes)** — Likely three changes in three repos:
   1. A manifest-format change in the store (a minor spec increment).
   2. A `names.json` emitter in `scripts/postprocess_models.py`, in the Python repo.
   3. A second-port bootstrap (likely TS) that consumes schema and manifest, in its own repo.

   The manifest format is finalized against these two consumers.
3. **Phase 3 (separate changes)** — Make the store the schema authority. Python's `hatch run generate` reads schema and
   manifest from a pinned, sha256-verified spec checkout and drops its own vendored copy. The post-processor applies
   the manifest rather than holding the naming rules. If the manifest generator still belongs in the store, moving it
   is a store-side change.

**Rollback:** each phase is additive and independently revertible. Phase 1 adds
a repo and a test runner (no change to Python's build). Phase 2's manifest
emitter is a new script output. Only phase 3 changes `generate`'s inputs; until
it lands, the vendored `schemas/` remain authoritative, so reverting phase 3 is
a one-line revert of the `generate` source path.

## Open Questions

- Per-language distribution beyond the tarball (which ecosystems, if any, get a
  published package in a later phase) — deferrable; does not change the specs or
  the phase-1/2 approach.
- Exact canonical-JSON rules (key sort locale, number formatting) for the
  round-trip comparison — needs pinning before the corpus is built in phase 1,
  but does not change the capability specs' requirements, only the corpus
  tooling.
- Per-language OpenSpec tooling. Each binding repo will probably need OpenSpec tools in its own language. One example
  is a check that each spec citation in that repo, such as `[PRS-001]`, names a live identifier in the pinned spec
  artifact. The store's tooling is TypeScript (tasks 1.6 and 1.7). A Python identifier checker is parked in the
  Python repo, and the Python repo's local change decides its future (D8). Deferrable: it does not change the specs,
  and phase 1 needs only the store's checker.
