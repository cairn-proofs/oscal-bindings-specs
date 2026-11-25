# Proposal

## Why

Eight capabilities hold two kinds of requirement. Some tell a binding what to do. Others tell the store what to
build, publish or check. A reader cannot tell the two apart from the capability name. A binding cannot report how
much of the contract it implements, because the requirements that apply to a binding are mixed with the
requirements that apply to the store.

## What Changes

1. A new capability, `spec-store`, holds the 58 requirements that the store runs: publishing, generation, checks,
   release rules and the content rules of the corpus. Each requirement gets a new identifier with the prefix `STO`.
   Its text and scenarios do not change, except for citations.
2. A new capability, `generated-models`, holds the three consumer rules of the naming manifest. The prefix is
   `GEN`.
3. The requirement MDL-008 is retired. [PRS-004] and [VER-002] state the same rule.
4. The capabilities `model-derivation` and `naming-manifest` hold no requirement after the move, so they are
   removed. Their prefixes stay in the ledger.
5. Each other citation of a moved identifier follows the move. Text that names the `model-derivation` capability
   follows the move.

This change adds no behavior. It does not change the requirement index format, the traceability record, or the
sticker.

## Capabilities

### New Capabilities

1. `spec-store`: what the store builds, publishes and checks.
2. `generated-models`: what a binding does with the naming manifest when it generates types.

### Modified Capabilities

1. `binding-surface`, `constraint-validation`, `schema-versioning` and `serialization`: requirements move out.
2. `document-parsing`, `element-validation` and `schema-versioning`: text follows the removal of MDL-008 and the
   `model-derivation` capability.
3. `model-derivation` and `naming-manifest`: all requirements move out, and the capabilities are removed.

## Impact

1. `openspec/specs/`, `openspec/spec-ids.yaml`, `openspec/scenario-checks.yaml`, `openspec/requirements.json` and
   `openspec/coverage.json`.
2. Each script, document and template that cites a moved identifier. They change by identifier only.
3. `corpus/1.2.3/README.md` and `corpus/1.2.3/cases.json`, where they cite a moved identifier.
4. A binding record cites a requirement that defines an operation. No moved requirement defines an operation, so
   no binding record changes. A binding spec or agent guide that cites a moved identifier resolves it as retired
   and follows `replaced_by`.
