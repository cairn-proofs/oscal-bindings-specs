# Design

## Context

See [proposal.md](proposal.md). The archive ships the manifest `manifest/<release>/constraints.json` and its JSON Schema
`manifest/constraints.schema.json`. A binding evaluates the manifest with its own code, and the corpus is the only shared
check of that evaluation.

## Decisions

1. **Split by reader.** The manifest half is checked against shipped artifacts: the JSON Schema and the generation. The
   evaluation half is a rule for the code of a binding.
2. **The identifiers CNS-006 and CNS-007 stay with the evaluation half.** A binding already cites them. The requirements
   are retitled with a rename in the delta, and their text keeps the evaluation rules only.
3. **The target scenario moves.** CNS-007.01 says that the target queries of a manifest entry select only the nodes of the
   same document. That is a statement about the generated manifest. The delta cannot remove a scenario, so a task removes
   CNS-007.01 by hand after the archive, and the ledger retires it with `replaced_by` STO-060.02.
4. **Checks.** The tests of the manifest half take the identifiers of the new scenarios. One new self-test shows that an
   entry without target queries fails the JSON Schema. The tests that evaluate queries keep CNS-006.01 and CNS-007.02.
5. **The evaluation scenarios have no corpus case.** CNS-006.01 and CNS-007.02 are checked by self-tests of the reference
   evaluator only. A corpus case would let a binding check them. The follow-up below records this.

[CNS-006]: ../../specs/constraint-validation/spec.md
[CNS-007]: ../../specs/constraint-validation/spec.md
[CNS-009]: ../../specs/constraint-validation/spec.md
[CNS-017]: ../../specs/constraint-validation/spec.md
[STO-059]: specs/contract-store/spec.md
[STO-060]: specs/contract-store/spec.md
