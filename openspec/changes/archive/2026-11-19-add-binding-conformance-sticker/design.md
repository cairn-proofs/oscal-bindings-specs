# Design

## Context

See [proposal.md](proposal.md) and [issue #149](https://github.com/cairn-proofs/oscal-bindings-specs/issues/149).

Each binding pins the spec artifact by one version string, for example `0.8.0+oscal.1.2.3`
([VER-004]). The text before `+` is the store release. The text after `+oscal.` is the OSCAL release. The
binding holds this string in a source constant. No file in a binding has a format that a badge service can
read.

The store cannot write to a binding repository, and the store holds no binding state ([VER-006]). The
bindings today have one build workflow each. That workflow runs the corpus with the other checks.

## Goals / Non-Goals

**Goals:**

1. A binding shows the pinned store release, the OSCAL release, and a pass or fail status in its README.
2. The badges follow the pin and the workflow result with no manual update.

**Non-Goals:**

1. A workflow or a service that the store runs.
2. A binding that supports more than one OSCAL release at once. [VER-002] allows one release.

## Decisions

1. **Two badges, rendered by Shields.** The version badge uses the Shields dynamic JSON badge. The status
   badge uses the Shields GitHub Actions workflow status badge. Both read public data of the binding
   repository, so the store needs no write access and no secret. Alternative: a badge file that a store
   workflow writes. Rejected: a workflow with no write access has nowhere to publish the file.
2. **One version badge for both versions.** The badge shows the whole pinned string, so it shows the store
   release and the OSCAL release. A JSONPath query cannot split the string, and two badges would need two
   members that can disagree.
3. **A new file `spec-pin.json` with one member `version`.** The Shields JSON badge reads only JSON, TOML,
   YAML and XML, and the current pin constants are source code. A binding can generate its constant from
   the file or check that the two agree. That choice is the binding's.
4. **The status badge names any workflow that runs the corpus.** The bindings have no separate corpus
   workflow today. A separate workflow would be a new requirement on each binding. The badge then reports
   the whole workflow, not the corpus run alone.
5. **The requirements go in `binding-surface`.** The capability already covers what the store publishes for
   bindings and how a binding shows its link to the contract ([SRF-006], [SRF-007]). No new capability is
   needed.
6. **Checks.** A self-test in `scripts/build-archive.ts` covers [SRF-008.01]. A second self-test checks that
   `docs/sticker.md` holds both badge URLs ([SRF-008.02]). The scenarios of [SRF-009] describe the process
   of a binding repository. They go in `openspec/scenario-checks.yaml` as `by-design`.

## Risks / Trade-offs

1. [A third party, Shields, renders the badges.] → The README text still states the pin. The badges only
   show data, and no build step depends on them.
2. [The status badge reports the whole workflow, so an unrelated step can turn it red.] → The conditions
   require a workflow that runs the corpus, and the sticker file tells the binding to choose it.
3. [`spec-pin.json` can differ from the pin constant of the binding.] → [SRF-009.02] makes this a failure
   of the conditions. The store cannot check it. Each binding adds its own check.

[VER-002]: ../../specs/schema-versioning/spec.md
[VER-004]: ../../specs/schema-versioning/spec.md
[VER-006]: ../../specs/schema-versioning/spec.md
[SRF-006]: ../../specs/binding-surface/spec.md
[SRF-007]: ../../specs/binding-surface/spec.md
[SRF-008.01]: specs/binding-surface/spec.md
[SRF-008.02]: specs/binding-surface/spec.md
[SRF-009]: specs/binding-surface/spec.md
[SRF-009.02]: specs/binding-surface/spec.md
