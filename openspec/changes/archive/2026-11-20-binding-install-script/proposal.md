# Proposal

## Why

1. The template README describes the install of the binding templates as steps by hand, and a pin move repeats most
   of them. A step that a binding forgets, such as the new sha256 in the hook, makes the hook check the wrong archive
   or fail.
2. [SRF-011] lists each file of `templates/binding/`. No check compares the archive with that list, and no binding
   checks it. The list goes stale with each new template file. Only the terms that the scenarios and later
   requirements constrain need a place in the requirement.

## What Changes

1. `templates/binding/bin/install.sh`: a POSIX shell script that installs the templates from a spec artifact and its
   sha256, at the first install and on each pin move. It is a convenience for the steps that the template README
   describes, so no requirement defines it. Self-tests check that it changes no file on another hash, and that a
   pin move keeps the ledger, the record and the binding notes.
2. [SRF-011] keeps only the binding checker, the hook, the template config and the agent guide. Their constraints are
   in the scenarios of [SRF-011] and in [SRF-012], [SRF-013] and [SRF-014]. The scenario `SRF-011.01` states that the
   archive holds `templates/binding/`, which the archive self-test checks.
3. The generated template README gives the script as the install step. The store `AGENTS.md` and the agent guide
   name the script.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `binding-surface`: [SRF-011] keeps only the files that its scenarios and later requirements constrain.

## Impact

1. `scripts/templates.ts`: the README text and the self-tests of the script.
2. `scripts/build-archive.ts`: the self-test of `SRF-011.01` checks each committed file of `templates/binding/`.
3. `VERSION`: no change. `0.10.0+oscal.1.2.3` is not released yet.

[SRF-011]: ../../specs/binding-surface/spec.md#requirement-srf-011-the-spec-artifact-holds-the-binding-templates
[SRF-012]: ../../specs/binding-surface/spec.md#requirement-srf-012-the-binding-checker-applies-the-identifier-rules-to-the-specs-of-a-binding
[SRF-013]: ../../specs/binding-surface/spec.md#requirement-srf-013-the-binding-checker-checks-the-traceability-record
[SRF-014]: ../../specs/binding-surface/spec.md#requirement-srf-014-the-template-config-follows-the-store-config
