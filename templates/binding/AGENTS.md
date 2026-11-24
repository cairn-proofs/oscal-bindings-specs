# AGENTS.md

This file tells an agent how this binding relates to the OSCAL bindings contract store, and where each kind of change
goes. It comes from `templates/binding/AGENTS.md` of the spec artifact that this binding pins. The section
[Binding notes](#binding-notes) belongs to this binding. On each pin move, copy the new template over this file, and
keep that section.

A citation such as [PRS-001] names a requirement of the contract store. It resolves in `openspec/specs/` of the pinned
spec artifact.

## The contract store and this binding

1. The contract store, [cairn-proofs/oscal-bindings-specs](https://github.com/cairn-proofs/oscal-bindings-specs), holds the
   language-neutral contract: the capability specs, the vendored NIST OSCAL JSON Schema, the naming manifest, the
   conformance corpus and the binding templates. It holds no binding code.
2. This binding implements the contract in one programming language. It holds its code, its binding-local
   requirements, its traceability record and its expected conformance failures.
3. Dependencies go from this binding to the contract store, never back [STO-003]. Do not put the state of this binding
   in the contract store: no defect, no expected failure, no supported version, and no link to an issue of this binding.

## How this binding reads the contract store

1. For planning, the `references` entry in `openspec/config.yaml` makes the main specs of the contract store read-only
   context. It pins no version. Do not use it for a build, a test or a check.
2. For builds, conformance runs and checks, use only the release archive that this binding pins by its sha256
   [VER-005]. Do not read the `main` branch of the contract store.
3. Do not copy a contract file of the contract store into this binding and edit it. The schemas, the manifest and the
   corpus come from the pinned archive without change.

## The contract rules that this binding follows

1. A contract requirement defines each public operation, or the operation is binding-local [SRF-001]. A
   binding-local operation adds no contract behavior [SRF-002].
2. A binding-local requirement is in `openspec/specs/` of this binding. Its identifier uses a prefix of this binding
   from `openspec/spec-ids.yaml`, never a prefix of the contract store [SRF-010].
3. The traceability record, `openspec/traceability.json` by default, holds one entry for each public operation
   [SRF-003]. Each contract identifier in it is in the requirement index of the pinned archive [SRF-004].
4. This binding keeps its expected conformance failures in its own repository [VER-007].

## Where a change goes

1. A change to the code of this binding, or to a binding-local requirement that meets [SRF-002], is an OpenSpec change
   in this repository.
2. A change to the contract goes to the
   [contract store issue tracker](https://github.com/cairn-proofs/oscal-bindings-specs/issues). Examples: an operation that
   does not meet [SRF-002], a defect in a contract store spec, the corpus or the manifest, and a rule that this binding
   cannot meet. Do not work around the contract in this binding.
3. A binding-local operation that another binding also needs goes to the contract store issue tracker for promotion.
   When a pinned release defines it, follow [SRF-005].
4. A pin move changes the pin of this binding, applies the requirements of the new release, and runs
   `templates/binding/bin/install.sh` of the new spec artifact with its archive path and its sha256. The script
   updates `openspec/config.yaml`, this file above this section, and the pre-commit hook.

## Checks before each commit

The pre-commit hook verifies the pinned archive by its sha256. Then it runs the binding checker of that archive and
`openspec validate --all --strict` on the staged files. The binding checker applies the identifier rules of the contract
store to the specs of this binding [STO-056], and checks the traceability record [STO-057]. Each failure starts with the
name of its rule. Fix the cause. Do not skip the hook with `--no-verify`.

## Binding notes

<!-- Facts of this binding that an agent needs: its language, its pin location, its commands. Keep this section on
     each pin move. -->
