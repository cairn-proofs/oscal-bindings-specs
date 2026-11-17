# Design

## Context

1. `scripts/check-version.ts` checks only the form of `VERSION`, and that `schemas/<release>/` exists. It has no git
   access.
2. `scripts/check-releases.ts` reads the release tags. It has `parseVersion()`, `precedence()` and `isBreaking()`, and
   a fake git for its self-test. It fails in a shallow clone and in a clone without release tags. Its baseline for
   [NAM-008] is the highest tag for one OSCAL release (`releaseTags()`).
3. Both scripts have their own copy of the version grammar. Both copies accept a pre-release label. The store has no
   pre-release tag.
4. The latest release is `v0.8.0+oscal.1.2.3`, and `VERSION` is `0.9.0+oscal.1.2.3`.
5. Each scenario needs a corpus case, a self-test whose name starts with its identifier, or a `by-design` reason in
   `openspec/scenario-checks.yaml`. Today each scenario of [VER-003] and the scenarios [VER-004.02] and [VER-004.03]
   have a `by-design` reason.
6. A scenario heading cannot change in a delta. The archive matches a scenario by its heading.

## Goals / Non-Goals

**Goals:**

1. The step rule of VER-008 fails CI.
2. One README section holds the text about `VERSION` that is not in the specs.

**Non-Goals:**

1. The check does not find an increment that is too small for the kind of change. A reviewer decides the kind.
2. [NAM-008] and its check do not change.

## Decisions

### D1. The step check is in `check-releases.ts`

The step check runs in `checkReleases()`, after the checks for a shallow clone and for release tags, and before the
loop over the OSCAL releases. So it uses the same git access, the same failure for unreadable tags, and the same fake
git in the self-test. Its failures have the label `[version-step]`.

Alternative: `check-version.ts`. It has no git access, and it runs in clones without tags. The step check needs the
tags, so it belongs with the other checks that read them.

### D2. The baseline is the highest tag on `main` for all OSCAL releases

The step check parses each `v*` tag with the version grammar, keeps the tags on `origin/main`, and takes the tag with
the highest precedence. When no tag is left, the check fails with a line that says no release tag is on `main`
([VER-008.07]). It does not use `releaseTags()`, which keeps the tags for one OSCAL release only. With
`releaseTags()`, the first version for a new OSCAL release has no baseline, and any version passes.

### D3. The allowed versions

From the baseline `M.m.p+oscal.R`, the check passes for these versions only:

1. `M.m.p+oscal.R`: the same text as the baseline.
2. `M.m.(p+1)`, `M.(m+1).0` or `(M+1).0.0`, with any OSCAL release as build metadata.

Item 1 compares the full text, so `M.m.p` with other build metadata fails ([VER-008.05]). The failure names the
baseline tag and the three allowed versions.

### D4. One version grammar, with no pre-release label

A new module, `scripts/version-lib.ts`, holds the version grammar, `Version`, `parseVersion()` and `precedence()`.
`check-version.ts` and `check-releases.ts` import them. Both scripts run their checks when a module imports them, so
neither script can hold the shared code. The grammar has no pre-release group. `precedence()` compares the three
core components only. `Version` has no `pre` field.

Self-test changes:

1. `check-version.ts`: the case `pre-release` expects a failure, and its name starts with `VER-003.06`.
2. `check-releases.ts`: remove the test `baseline: a pre-release is below its release`. It tests a label that the
   grammar no longer accepts.
3. `check-releases.ts`: the test `baseline: tags off main, other releases, and other grammars are ignored` has the
   tag `v0.8.0+oscal.1.2.4` on main and the version `0.2.1+oscal.1.2.3`. Under D2 that tag is the baseline of the
   step check, so the test fails. Change its version to `0.8.1+oscal.1.2.3`. The name check still compares with
   `v0.2.0+oscal.1.2.3`, so the test keeps its purpose.

### D5. Self-tests for VER-008

`check-releases.ts` gets one self-test for each scenario of VER-008, with a name that starts with the scenario
identifier. The tests use the fake git. For [VER-008.07], the fake git has release tags, and none is on `main`.

### D6. The README section

A new section "Version", in Develop, replaces the sentence about `VERSION` after the list of checks. The section
states:

1. What `VERSION` holds, and the form, with a link to [VER-003] and [VER-004].
2. That a change that needs an increment sets `VERSION` to the next release version, also when no release follows at
   once. The reviewer decides the kind of the change ([VER-003]).
3. The step rule, with a link to VER-008. Changes between two releases share one increment.
4. A link to the section Release for the release steps.

These places link to the section and do not state its rules again:

1. CONTRIBUTING, Change a requirement, step 1.
2. `.github/pull_request_template.md`, Naming manifest, item 3.
3. README, the list of checks, items 4 and 11.
4. README, Release, step 1.

### D7. Scenario headings change after the archive

The headings of [VER-003.01] to [VER-003.05], [VER-004.02] and [VER-004.03] name an increment. In the delta they keep
their headings, and their text gives the kind of the change. After the archive, a task changes the headings in the
main spec:

1. VER-003.01 Renamed canonical type is a break
2. VER-003.02 Corpus fixture fix is a fix
3. VER-003.03 Stricter parse rule or changed error category is a break
4. VER-003.04 Addition to the contract is an addition
5. VER-003.05 Prose clarification is a fix
6. VER-004.02 Compatible OSCAL release is an addition
7. VER-004.03 New OSCAL major version is a break

The identifiers do not change, so `openspec/spec-ids.yaml` needs no `retired` entry for them.

### D8. The `by-design` reasons

The reasons of the seven scenarios of D7 change to: "A reviewer decides the kind of each change, and no store script
can observe the decision." [VER-003.06] and the scenarios of VER-008 get self-tests, so they need no entry.

### D9. `VERSION` does not change

`0.9.0+oscal.1.2.3` is one minor step above `v0.8.0+oscal.1.2.3`, so the step check passes. The next release holds
this change.

## Risks / Trade-offs

1. [A tag that is not on `main` is not a release] → The step check ignores it, as the name check does
   ([NAM-018]). CI fails a release tag that is not on `main`.
2. [The tag job of `build.yml` runs `npm run check` on the new tag] → `VERSION` then has the same text as the
   latest release, so the step check passes.
3. [The check fails at a commit older than the latest release, for example a new run of the tag job of an older
   release] → The name check of [NAM-008] has the same limit. The release archive and its `sha256` of that older
   release do not change.

[NAM-008]: ../../specs/naming-manifest/spec.md#requirement-nam-008-a-changed-released-name-needs-a-breaking-version-increment
[NAM-018]: ../../specs/naming-manifest/spec.md#requirement-nam-018-the-latest-released-artifact-is-the-release-tag-with-the-highest-precedence
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-003.01]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-003.05]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-003.06]: specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-004]: ../../specs/schema-versioning/spec.md#requirement-ver-004-the-oscal-release-is-recorded-as-semantic-versioning-build-metadata
[VER-004.02]: ../../specs/schema-versioning/spec.md#requirement-ver-004-the-oscal-release-is-recorded-as-semantic-versioning-build-metadata
[VER-004.03]: ../../specs/schema-versioning/spec.md#requirement-ver-004-the-oscal-release-is-recorded-as-semantic-versioning-build-metadata
[VER-008.05]: specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
[VER-008.07]: specs/schema-versioning/spec.md#requirement-ver-008-the-version-is-the-latest-release-or-one-step-above-it
