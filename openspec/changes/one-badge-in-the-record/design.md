# Design

## Context

See [proposal.md](proposal.md) and the archived change `add-binding-conformance-sticker`.

A binding keeps its pin in four places today: a source constant, `spec-pin.json`, the variables at the top of
the hook, and the arguments of the install script. A badge service reads one JSON file and one query, so the
badge cannot hold a computed number unless a file holds that number.

## Goals / Non-Goals

**Goals:**

1. One badge shows the pinned version, how much of the contract the record cites, and the corpus pass rate.
2. A binding needs no particular CI workflow.
3. A pin move edits one file and runs one command.

**Non-Goals:**

1. A workflow, a runner or a service that the contract store provides.
2. Proof that a binding ran the corpus. The record is committed data that the binding states.
3. A corpus runner contract. Each binding runs the corpus its own way.

## Decisions

1. **One file: the record.** The record already exists in each binding and the hook already checks it against a
   JSON Schema. `spec-pin.json` held one member. Format 2 adds `pin`, `corpus` and `badge`, and keeps
   `operations` as it is. Alternative: grow `spec-pin.json` to hold the record. Rejected: every binding would
   move its record, and the record is the larger file.
2. **The badge is a string in the record.** A Shields dynamic JSON badge reads one value with one query
   (`$.badge`). The checker derives the string and the checks fail when the committed string differs, as for
   `openspec/requirements.json`. The string has this form: `0.10.0+oscal.1.2.3 | 92% traced | 98% pass`.
   A Shields badge has two cells, label and message. The three signals are parts of the message.
3. **Traced share.** The numerator is the number of distinct contract identifiers in the record that the index
   marks. The denominator is the number of marked index entries. Both round down, so 100% means all.
4. **The index marks requirements that have a corpus case.** Without a mark, contract store requirements such as
   [SRF-006] stay in the denominator, and 100% is not reachable. A requirement is marked when at least one of
   its scenarios lists a corpus case in `openspec/coverage.json`. This matches [SRF-003]. The model-derivation
   capability and the naming manifest govern generated types, which have no record entry, and they have almost
   no corpus cases. Alternatives: a list of capabilities, or a marker in each requirement. Rejected: each is a
   new list to maintain.
5. **`corpus` holds the case count and the failed case identifiers.** A list of failures is short. The checker
   compares the count with the pinned corpus, so a record that a pin move left behind fails. A binding that
   never ran the corpus omits `corpus`, and the badge omits the pass part. A binding that runs the corpus in CI
   can run the checker there and fail when the committed record differs from the result of the run.
6. **Expected failures count as failures.** The pass share is `(cases - failed) / cases`. A case that the
   binding lists as an expected failure ([VER-007]) is in `failed`. The share does not hide it.
7. **No `source` member.** The binding would state it, so it proves nothing.
8. **The hook and the install script read the pin from the record.** The script keeps its place as the one
   command for a pin move. It reads `pin` from the record, so it needs no argument. The checker gets `--write`.
   It rewrites `badge`, and with `--failed <file>` it rewrites `corpus`. The file holds a JSON array of failed
   case identifiers. The install script calls it. Alternative: a `--sync` mode in the checker. Rejected: the
   archive must be verified and extracted before the checker can run, so a shell step stays.
9. **Retire [SRF-008] and [SRF-009].** Scenario titles cannot change in place. The new requirements have new
   identifiers, and the ledger records the replacement.
10. **Checks.** Self-tests in `scripts/traceability.ts` cover the badge, `corpus` and `pin` rules. Self-tests in
    `scripts/requirements.ts` cover the mark in the index. A self-test in `scripts/build-archive.ts` checks the
    sticker file. The scenarios about the process of a binding repository go to `by-design`.

## Risks / Trade-offs

1. [A binding can state a corpus result that it did not produce.] → The checker compares the count and the case
   identifiers with the pinned corpus. The README tells a binding to run the checker in its CI to prove it.
2. [A mark that comes from `coverage.json` changes when the corpus changes.] → The requirement index is
   regenerated with the corpus, and the traced share is stated for the pinned version only.
3. [A format 2 record is not valid under a contract store that pins format 1.] → Each contract store version checks the record
   against its own JSON Schema. A binding moves to format 2 with the pin move that brings the schema.
4. [A binding with a small record and a green corpus passes with a low traced share.] → This is the intent. The
   badge shows both numbers.

[SRF-003]: ../../specs/binding-surface/spec.md
[SRF-006]: ../../specs/binding-surface/spec.md
[SRF-008]: ../../specs/binding-surface/spec.md
[SRF-009]: ../../specs/binding-surface/spec.md
[VER-007]: ../../specs/schema-versioning/spec.md
