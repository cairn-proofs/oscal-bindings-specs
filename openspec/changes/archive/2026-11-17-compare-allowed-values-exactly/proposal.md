# Proposal

## Why

[CNS-008] states that a node fails when no entry of its applicable set lists the value. It does not
state how the value compares with a listed value (#127). [CNS-012] states "character for character"
for keys only. The two evaluators of the store compare the exact string, but the specs do not give
that rule to the bindings.

The choice changes results. Three closed, reportable entries list the upper-case values `INTERVIEW`,
`EXAMINE` and `TEST` for a `method` prop. A binding that compares without case accepts the value
`test`, and the store rejects it. No corpus case shows the difference today. No failing input of
an `allowed-values` case has a value that differs from a listed value only in case.

## What Changes

1. A new requirement, CNS-025, states that the value of a target node of [CNS-008] and a listed
   value compare character for character. The requirement goes directly below [CNS-008]. The text
   of [CNS-008] does not change.
2. The scenario CNS-025.01 states that a value that differs from a listed value only in case fails
   a closed entry.
3. A new corpus case gives a `method` prop the value `test` in an activity of an assessment plan.
   The expected failure is `oscal-activity-type-values`.
4. A new fault in `scripts/coverage-faults.ts` makes the manifest evaluator compare without case.
   The report of `npm run coverage:faults` then shows that the corpus case of item 3 detects it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `constraint-validation`: the requirement CNS-025 and its scenario CNS-025.01.

## Impact

1. `scripts/constraint-reference.ts`: no change. The reference evaluator already compares character
   for character. `npm run corpus:check` runs it on the corpus case of item 3 of What Changes.
2. `scripts/constraints-manifest.ts`: no change. The manifest evaluator already compares character
   for character.
3. `scripts/coverage-faults.ts`: the fault of item 4 of What Changes.
4. `corpus/1.2.3/cases.json` and `corpus/1.2.3/documents/invalid/`: the case of item 3 of What
   Changes.
5. `openspec/coverage.json` and `openspec/requirements.json`: regenerated.
6. Bindings: a binding that compares without case, or that changes a value before it compares it,
   does not meet the contract after this change.
7. `VERSION`: no change. The change is a fix, and `VERSION` is already one minor step above the
   latest release.

[CNS-008]: ../../specs/constraint-validation/spec.md#requirement-cns-008-an-allowed-values-entry-checks-the-value-against-its-applicable-set
[CNS-012]: ../../specs/constraint-validation/spec.md#requirement-cns-012-a-key-is-the-list-of-the-values-of-the-key-fields
