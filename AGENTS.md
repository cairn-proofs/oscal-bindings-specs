# AGENTS.md

This file tells an agent what this store is, how language bindings consume it, and where each kind of change goes.
[README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md) hold the details. This file points to them and does not
copy them. A longer knowledge base is in `.agents/summary/index.md` when it is present.

## Contents

1. [What this store is](#what-this-store-is): the contract, and no runtime code.
2. [Who consumes the store](#who-consumes-the-store): the bindings, and the two ways they read the store.
3. [The boundary between the store and a binding](#the-boundary-between-the-store-and-a-binding): what the store must
   not hold.
4. [Where a change goes](#where-a-change-goes): store, binding tracker, or pin-move issue.
5. [Find your way](#find-your-way): directories, generated files, and the checks that surprise agents.
6. [Custom Instructions](#custom-instructions): maintained by people and agents.

## What this store is

<!-- tags: scope, contract, openspec-store -->

This repository is an OpenSpec store. It holds the language-neutral contract for OSCAL data bindings:

1. The capability specs, in `openspec/specs/`.
2. The vendored NIST OSCAL JSON Schema, in `schemas/<release>/`.
3. The naming manifest, in `manifest/<release>/`.
4. The conformance corpus, in `corpus/<release>/`.

The store holds no runtime code and no binding. The TypeScript in `scripts/` is store tooling only. It checks and
generates contract files, and it is not part of the release archive. Do not add an implementation of an operation
here.

## Who consumes the store

<!-- tags: consumers, bindings, pinning -->

The consumers are the bindings in [Known implementations](README.md#known-implementations). That list is the only list
of bindings. Do not copy it. `scripts/check-binding-links.ts` reads it.

A binding reads the store in two ways ([README.md, Use the store](README.md#use-the-store)):

1. For planning context, the binding adds an OpenSpec `references` entry for this store in its `openspec/config.yaml`.
   This pins no version.
2. For builds and conformance runs, the binding pins the tagged release archive by its `sha256` ([VER-005]).
   `scripts/build-archive.ts` (`CONTENTS`) lists the paths in the archive. A binding can rely on those paths only.

See also [Where a change goes](#where-a-change-goes) for what follows a release.

## The boundary between the store and a binding

<!-- tags: boundary, binding-state, ver-006, ver-007 -->

Dependencies go from a binding to the store, never back ([VER-006]). The store must not hold binding state:

1. Known defects, expected conformance failures, or conformance results of a binding.
2. The versions that a binding supports, or the status of a binding.
3. A link to an individual issue or pull request in a binding repository.

Each binding keeps these in its own repository:

1. Its expected conformance failures ([VER-007]). The corpus states one expected result for every binding.
2. Its traceability record. The record conforms to `openspec/traceability.schema.json` ([SRF-003], [SRF-007]).

`npm run binding-links:check` fails when a tracked file outside `openspec/changes/` links a binding issue or pull
request. This rule applies to this file. The store can link a binding repository or its issue tracker. An OpenSpec
change can name a binding issue.

## Where a change goes

<!-- tags: routing, workflow, releases -->

1. A change to the contract goes through an OpenSpec change in `openspec/changes/` in this store. One pull request
   carries the change from proposal to archive. See [CONTRIBUTING.md](CONTRIBUTING.md#change-a-requirement).
2. Work that is specific to one binding goes to the issue tracker of that binding. Examples: a defect, an expected
   failure, a binding-local operation that meets [SRF-002], or a pin update. Do not edit a binding from this
   repository.
3. A binding operation that the contract does not define follows
   [CONTRIBUTING.md](CONTRIBUTING.md#add-an-operation-to-a-binding). To promote an operation that two bindings share,
   open an issue in this store ([CONTRIBUTING.md](CONTRIBUTING.md#promote-a-binding-local-operation)).
4. After a store release, open a pin-move issue in the tracker of each binding. The binding moves its pin and applies
   the new release. Put this step in `## Workflow follow-up` of the change's `tasks.md`, not in a tracked task.

The release steps are in [README.md, Release](README.md#release).

## Find your way

<!-- tags: navigation, generated-files, checks, gotchas -->

| Path | What it holds | Edit by hand? |
|---|---|---|
| `openspec/specs/<capability>/spec.md` | The normative requirements | Only through an OpenSpec change |
| `openspec/config.yaml` | Authoring rules for OpenSpec artifacts | Yes. Read it before you write a change. This file does not copy its rules. |
| `openspec/spec-ids.yaml` | Identifier ledger | Yes, in the commit that syncs or archives a change |
| `openspec/requirements.json` | Requirement index | No. Run `npm run requirements:write`. |
| `manifest/<release>/overrides.json` | Naming input | Yes |
| `manifest/<release>/names.json` | Naming manifest that bindings read | No. Run `npm run names:write`. |
| `corpus/<release>/cases.json`, `documents/`, `elements/` | Corpus cases and inputs | Yes |
| `corpus/<release>/expected/` | Canonical expected outputs | No. Run `npm run corpus:write`. |
| `schemas/<release>/` | NIST schema files, byte-for-byte | Never |
| `docs/` | Rule documents that specs cite, shipped in the archive | Yes |

These rules are not obvious from the code:

1. `npm run releases:check` reads git tags and `origin/main`. It fails in a shallow clone or in a clone without tags.
2. `SPEC_IDS_BASE` sets the base ref for the vanished-scenario check and the name diff. The default is `HEAD`. CI sets
   it to the target branch of the pull request.
3. A changed released name needs a breaking `VERSION` increment ([NAM-008]). The PR template has a naming section for
   a change to `manifest/`.
4. `scripts/verify-release.sh` reads `CONTENTS` in `build-archive.ts` as text. Keep `CONTENTS` a literal array of
   double-quoted strings that ends with `];`.
5. Most scripts have a `--self-test` mode. A rule change in a script needs a self-test case.
6. CODEOWNERS requires code-owner review for the specs, corpus, docs, manifest, schemas, scripts, CI, pins, and
   `VERSION`.

[VER-005]: openspec/specs/schema-versioning/spec.md#requirement-ver-005-spec-artifacts-are-distributed-pinned-and-hash-verified
[VER-006]: openspec/specs/schema-versioning/spec.md#requirement-ver-006-dependencies-run-from-bindings-to-the-store-never-back
[VER-007]: openspec/specs/schema-versioning/spec.md#requirement-ver-007-each-binding-keeps-its-own-expected-conformance-failures
[SRF-002]: openspec/specs/binding-surface/spec.md#requirement-srf-002-a-binding-local-operation-adds-no-contract-behavior
[SRF-003]: openspec/specs/binding-surface/spec.md#requirement-srf-003-a-binding-records-the-requirement-that-covers-each-public-operation
[SRF-007]: openspec/specs/binding-surface/spec.md#requirement-srf-007-the-store-publishes-a-json-schema-for-the-traceability-record
[NAM-008]: openspec/specs/naming-manifest/spec.md#requirement-nam-008-a-changed-released-name-needs-a-breaking-version-increment

## Custom Instructions
<!-- This section is for human and agent-maintained operational knowledge.
     Add repo-specific conventions, gotchas, and workflow rules here.
     This section is preserved exactly as-is when re-running codebase-summary. -->
