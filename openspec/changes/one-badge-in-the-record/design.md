# Design

## Context

See [proposal.md](proposal.md) and the archived change `add-binding-conformance-sticker`.

A binding keeps its pin in four places: a source constant, `spec-pin.json`, the variables at the top of the hook, and
the arguments of the install script. A badge service reads one JSON file with one query, so a badge cannot show a
computed number unless a file holds that number.

The corpus covers about half of the scenarios, so a pass share alone says little about how much of the contract a
binding implements. A binding says that itself. The two bindings that exist already keep a list of the scenarios of the
pinned artifact that they cover or that do not apply, each with a reason.

## Goals / Non-Goals

**Goals:**

1. One badge shows the pinned version, how much of the contract the binding implements, and the corpus pass share.
2. A binding needs no particular CI workflow.
3. A pin move edits one file and runs one command.

**Non-Goals:**

1. A workflow, a runner or a service that the contract store provides.
2. Proof that a binding ran the corpus. The record is committed data that the binding states.
3. A binding-runnable check for the requirements that the corpus does not cover. The badge states what it measures.
4. A `not-applicable` status. A binding that cannot implement a requirement says `not-implemented`.

## Decisions

1. **One file: the record.** The record exists in each binding, and the hook checks it against a JSON Schema. Format 2
   adds `pin`, `requirements`, `corpus` and `badge`, and keeps `operations`.
2. **The ledger says who implements each capability.** Each prefix entry holds `implemented-by`, with the value
   `binding` or `contract-store`. The identifier check fails when it is missing, so a new capability forces the
   decision. The index copies the value to each requirement. The denominator of the implemented share is the number
   of requirements whose index entry has `implemented-by` `binding`. No list is new: the ledger already
   has one entry for each capability.
3. **A status for each requirement.** The record maps each requirement that a binding implements to `implemented` or
   `not-implemented`. The checker fails on a missing status, so a pin move that brings a new requirement forces a
   decision. An operation entry cites requirements that define the operation. Cross-cutting requirements, such as
   the error categories, define no operation, so the citations alone cannot give the share.
4. **A cited requirement is implemented.** An entry that cites a requirement while the status says `not-implemented`
   is a contradiction, and the record is invalid.
5. **The badge is a string in the record.** A Shields dynamic JSON badge reads one value with one query (`$.badge`).
   The checker derives the string, and the checks fail when the committed string differs, as for
   `openspec/requirements.json`. A Shields badge has two cells, so the three signals are parts of the message. The
   form is `0.10.0+oscal.1.2.3 | 90% implemented | 98% pass (3 expected failures)`.
6. **Both shares round down.** A share of 100% then means all.
7. **`corpus` is optional.** It holds the case count, the failed cases and the expected failures. A binding that never
   ran the corpus omits it, and the badge omits the pass part. The checker compares the count and the identifiers with
   the pinned corpus, so a record that a pin move left behind fails.
8. **Expected failures leave the pass share and stay visible.** The pass share is `(cases - failed - expected) /
   (cases - expected)`. A binding keeps its expected failures in its own repository ([VER-007]). The record lists the
   case identifiers, and the badge shows the count when it is not zero. A failure that is not expected lowers the
   share.
9. **No `source` member.** The binding would state it, so it proves nothing. A binding that runs the checker in its CI
   proves the record, because the CI fails when the committed record differs from the result of the run.
10. **The checker writes the derived members.** `--write` rewrites `badge`. `--results <file>` also rewrites `corpus`
    from the failed and expected case identifiers. The file can come from any runner.
11. **The hook and the install script read the pin from the record.** The script stays the one command for a pin
    move. It needs no argument, except at the first install.
12. **A record cannot cite a requirement for the contract store only.** [SRF-004] adds the mark to the resolve rule.
13. **Retire [SRF-008] and [SRF-009].** Scenario titles cannot change in place. The new requirements have new
    identifiers, and the ledger records the replacement.
14. **Homes.** The requirements that a binding meets go to `binding-surface`. The requirements for the checker, the
    index, the ledger, the sticker file and the hook go to `contract-store`.
15. **Checks.** Self-tests cover the ledger flag, the index mark, the badge, the statuses and the corpus rules. The
    scenarios about the process of a binding repository go to `by-design`.

## Risks / Trade-offs

1. [A binding can state a status or a corpus result that it did not produce.] → The checker compares the structure
   with the pinned index and corpus. The README tells a binding to run the checker in its CI.
2. [Only about half of the scenarios have a corpus case, so `implemented` rests on the word of the binding for the rest.]
   → The badge says `implemented`, not `conformant`, and the pass share measures the corpus only. A later change can
   add corpus cases for the requirements that have none.
3. [The classification of a requirement as implemented by a binding can be wrong.] → The ledger value is reviewed with the
   ledger, and a requirement can move to another capability.
4. [A format 2 record is not valid under a contract store that pins format 1.] → Each version checks the record against
   its own JSON Schema. A binding moves to format 2 with the pin move that brings the schema.
5. [A binding must give a status to each requirement.] → About 100 statuses is a one-time cost, and a binding with a
   list of the scenarios that do not apply can derive most of them.

[SRF-003]: ../../specs/binding-surface/spec.md
[SRF-004]: ../../specs/binding-surface/spec.md
[SRF-008]: ../../specs/binding-surface/spec.md
[SRF-009]: ../../specs/binding-surface/spec.md
[VER-007]: ../../specs/schema-versioning/spec.md
