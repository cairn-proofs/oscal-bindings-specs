# Proposal

## Why

No check compares `VERSION` with the latest release tag, except when a released name changes ([NAM-008]). So a pull
request can lower `VERSION`, or increment it a second time before a release, and every check passes (#48). The text
about `VERSION` is in many places: [VER-003], [VER-004], three sections of README, CONTRIBUTING and the pull request
template. [VER-003] also gives the increment for each kind of change again, and that copy does not agree with the
releases of the store while the major version is 0.

## What Changes

1. Add a step check to `npm run releases:check`. `VERSION` must be equal to the latest release, or one patch, minor
   or major step above it. The latest release is the release tag with the highest precedence on `main`, for all
   OSCAL releases. The check fails CI. The check cannot find an increment that is too small. A reviewer still decides
   the kind of each change.
2. [VER-003] points at Semantic Versioning 2.0.0 for the increment. It keeps the store's own part: the spec
   artifact is the public API, and each change is a break, an addition or a fix. The scenarios of [VER-003] and the
   scenarios [VER-004.02] and [VER-004.03] give the kind of a change, not an increment.
3. The version has no pre-release label. `npm run version:check` and `npm run releases:check` reject a version that
   has one.
4. Add one "Version" section to README. It states what `VERSION` holds, when a change sets it, and the step rule.
   CONTRIBUTING, the pull request template and the other README sections link to it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `schema-versioning`: [VER-003] and [VER-004] change as items 2 and 3 of What Changes state. A new requirement,
   VER-008, gives the step rule.

## Impact

1. `scripts/check-releases.ts`: the step check, its self-test cases, and the pre-release label removed from the
   version grammar and from `precedence()`.
2. `scripts/check-version.ts`: the pre-release label removed from the version grammar, and a self-test case that
   expects a failure for a label.
3. README, CONTRIBUTING and `.github/pull_request_template.md`: the new section and the links to it.
4. `openspec/scenario-checks.yaml`: new `by-design` reasons for the reworded scenarios of [VER-003] and [VER-004].
5. Bindings: no change. The store has no pre-release tag, and the step check reads only store files and tags.
6. `VERSION` stays `0.9.0+oscal.1.2.3`. The latest release is `v0.8.0+oscal.1.2.3`, so the step check passes.

[NAM-008]: ../../specs/naming-manifest/spec.md#requirement-nam-008-a-changed-released-name-needs-a-breaking-version-increment
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[VER-004]: ../../specs/schema-versioning/spec.md#requirement-ver-004-the-oscal-release-is-recorded-as-semantic-versioning-build-metadata
[VER-004.02]: ../../specs/schema-versioning/spec.md#requirement-ver-004-the-oscal-release-is-recorded-as-semantic-versioning-build-metadata
[VER-004.03]: ../../specs/schema-versioning/spec.md#requirement-ver-004-the-oscal-release-is-recorded-as-semantic-versioning-build-metadata
