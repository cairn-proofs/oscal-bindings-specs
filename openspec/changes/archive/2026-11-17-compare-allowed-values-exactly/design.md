# Design

## Context

See [proposal.md, Why](proposal.md#why) for the motivation. These facts shape the approach:

1. `npm run validate` runs `openspec validate --all --strict`. Strict validation fails for a
   requirement description longer than 500 characters. The description of [CNS-008] has 480
   characters.
2. `npm run corpus:cases` writes the generated constraint cases. It replaces each case of
   `corpus/1.2.3/cases.json` from the first case whose id starts with `parse/constraint/` to the end
   of the file.
3. `scripts/coverage-faults.ts` applies each fault of `FAULTS` to the original text of
   `scripts/constraints-manifest.ts`. The text of each patch must occur once in that file. Two
   faults can patch the same line.
4. Three closed, reportable entries list `INTERVIEW`, `EXAMINE` and `TEST`. Of these,
   `oscal-activity-type-values` has the smallest valid input: an assessment plan with one activity.

## Goals / Non-Goals

**Goals:**

1. A corpus case that a binding which compares without case fails.
2. A fault that shows that this corpus case detects such a binding.

**Non-Goals:**

1. A change to either store evaluator. Both evaluators already compare character for character.

## Decisions

### D1. A new requirement below CNS-008

The rule goes in a new requirement, CNS-025, and not in the text of [CNS-008]. The rule does not fit
in [CNS-008] under the limit of item 1 of [Context](#context). A shorter rewrite of [CNS-008] would
change text that is correct.

CNS-025 uses the term "the value of a target node", which [CNS-008] defines. So the sync places
CNS-025 directly below [CNS-008]. CNS-025 does not cite [CNS-012], because [CNS-012] is below it.

### D2. A hand-written corpus case outside the generated block

The case has the id `parse/allowed-value-case` and the input
`documents/invalid/allowed-value-case.json`. The input is a copy of
`documents/invalid/constraints/oscal-activity-type-values.json` with the value `test` in place of
`zz-invalid`. The expected failure is `oscal-activity-type-values` only. The case cites
`PRS-015.01` and `CNS-025.01`.

The id does not start with `parse/constraint/`, and the case goes before the generated block. Item 2
of [Context](#context) would otherwise delete the case at the next run of the generator. The cases
of `parse/nested-control-part-name` use the same approach.

### D3. A case-insensitive fault

The fault `case-insensitive` breaks `CNS-025.01`. It patches the line of
`scripts/constraints-manifest.ts` that checks whether an entry of the set lists the value. The
patched line compares the two strings after it converts each to lower case. The fault
`entry-only-set` patches the same line. Item 3 of [Context](#context) permits this.

## Risks / Trade-offs

1. [Risk] A later version of `oscal-activity-type-values` lists other values, or becomes open.
   Then the corpus case gives a different result. → `npm run corpus:check` fails for the case, and
   the release that changes the entry must update the case.

[CNS-008]: ../../specs/constraint-validation/spec.md#requirement-cns-008-an-allowed-values-entry-checks-the-value-against-its-applicable-set
[CNS-012]: ../../specs/constraint-validation/spec.md#requirement-cns-012-a-key-is-the-list-of-the-values-of-the-key-fields
