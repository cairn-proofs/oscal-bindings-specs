# Design

## Context

See proposal.md, Why. These facts of the current runner shape the approach:

1. `runFaults` in `scripts/coverage-faults.ts` gives `failures` and `results`. `main` exits with 1
   when `failures` is not empty. A fault with no detecting case is in `results` only, with an empty
   `detected` list.
2. `report` and `summaryReport` print a gap line for such a fault. CI writes `summaryReport` to the
   job summary.
3. The self-test drives `runFaults` with stub evaluators. It runs no `main`.
4. `FAULTS` holds 4 faults. They run against 280 corpus cases in about 4 s. The time grows with the
   number of faults.
5. A case detects a fault when `constraintMismatch` in `scripts/check-corpus.ts` reports a
   difference. It compares the sorted `id` values of the failures and nothing else.

## Goals / Non-Goals

**Goals:**

1. A gap uses the exit code path that the other runner failures use.
2. The failure text tells the author the two ways to fix a gap.
3. One place states when a fault is valid.

**Non-Goals:**

1. No change to the faults, to the patch format, or to the way that the runner decides that a case
   detects a fault.

## Decisions

### D1: `runFaults` reports the gap as a failure

For each fault whose `detected` list is empty, `runFaults` adds one entry to `failures`. The text
names the fault and the identifier that it breaks. It then gives the two fixes: add a corpus case
that detects the fault, or remove the fault if no input that conforms to the schema can change the
list of failure identifiers. The result stays in `results`, so the report still lists the fault.

`main` does not change. The exit code already follows `failures`. The self-test drives `runFaults`
with stubs, so the existing stub set tests the rule with no new harness.

Alternative: count the gaps in `main`. The self-test cannot run `main`, so the rule would have no
test.

### D2: The report text does not change

`report` and `summaryReport` keep the gap line. The job summary of CI then shows which fault failed
the run. The text of a gap line does not claim that a gap passes.

### D3: The header comment states when a fault is valid

The header comment of `scripts/coverage-faults.ts` replaces item 4, "A gap does not fail the run",
with two items:

1. A fault that no case detects fails the run.
2. A fault is valid only when an input that conforms to the schema can change the list of failure
   identifiers that the runner compares. A fault that changes only the location, the entry, or the
   key of a failure is not valid, because the runner compares the `id` of each failure only.

The author of a fault reads the header before the author edits `FAULTS`. The failure text of D1
gives the same rule in one clause for a person who reads only the CI output.

### D4: `README.md` gets one sentence

Item 13 of the check list in `README.md` says that `npm run coverage:faults` lists the cases that
detect each fault. It also says that a fault that no case detects fails the run. The README does not
repeat the rule of D3.

## Risks / Trade-offs

1. [A pull request that removes the last case that detects a fault now fails CI] → The failure text
   names the fault and the identifier that it breaks. The author adds a case, or removes a fault
   that no conforming input can detect.
2. [A new fault needs its detecting case in the same pull request] → This is the intended workflow.
3. [Each patch must occur once in `scripts/constraints-manifest.ts`] → This cost exists now. The run
   already fails when a patch does not match, and it grows with the number of faults whatever this
   change does.
4. [The run time grows with the number of faults] → The 4 faults take about 4 s. A few dozen faults
   stay under a minute.

