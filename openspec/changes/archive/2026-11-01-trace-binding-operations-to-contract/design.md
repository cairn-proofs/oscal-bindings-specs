## Context

See [proposal.md](proposal.md#why) for the motivation. These facts shape the approach:

1. `scripts/spec-ids.ts` already parses each requirement heading of the main specs into an identifier, a prefix, and
   a title. `npm run spec-ids` checks the identifiers against the ledger `openspec/spec-ids.yaml`.
2. `scripts/names.ts` sets the pattern for a generated file: `--write` writes it, the default mode fails when the
   committed file differs, and `--self-test` runs fixtures. `.gitattributes` marks `names.json` as generated.
3. `scripts/build-archive.ts` lists the archive paths in `CONTENTS`. The archive holds `openspec/specs` and
   `openspec/spec-ids.yaml`, but not `openspec/changes`.
4. The manifest JSON Schemas (`manifest/*.schema.json`) use draft-07, a `$id` under the repository URL, a `format`
   const, and `additionalProperties: false`.
5. The Python binding exports 34 names in `oscal_bindings.v1.__all__`. 10 of them are generated model types. The other
   24 are parsers, the serializer, validators, builders, the facade, and error types, and a contract requirement
   covers each of them. Neither the Python binding nor the TypeScript binding has a main spec today.

## Goals / Non-Goals

**Goals:**

1. A binding can check [SRF-001] and [SRF-003] against its own exports with data from the pinned archive only.
2. The record adds little work: one short entry for each exported name.

**Non-Goals:**

1. The surface check in each binding (proposal, [#17](https://github.com/cairn-proofs/oscal-bindings-specs/issues/17)).
2. A mechanical check of the binding-local conditions of [SRF-002]. Those conditions need a reviewer.
3. A JSON Schema for the requirement index. The store generates and checks the index, and its format is three strings
   for each entry.
4. A change to the identifier rules or to [VER-003].

## Decisions

### D1. Put the rules in a new capability, `binding-surface`, with the prefix `SRF`

The rules govern what a binding exposes, and the index and the record schema exist only for that rule. One capability
keeps them together. The alternatives were to split the rules across `schema-versioning` (the artifact contents) and
`error-model` or `document-parsing`. Each of those owns a different concern, so a split hides the rule.

### D2. Exclude the generated model types from the rule and from the record

The user chose to exclude the members of generated model types. This design also gives the generated types no record
entry. `names.json` already records each generated type and its schema pointers, and [MDL-009] makes the manifest the
source of truth. A second record of the same types adds work and no information. The rejected alternatives were one
entry for each exported member, or one entry that cites the `MDL` requirements for all generated types.

### D3. Keep the traceability record minimal

Each entry holds an operation name and one of two members: `requirements` (contract identifiers) or `binding-local`
(one binding-local identifier). An example:

```json
{
  "format": 1,
  "operations": [
    { "name": "parse_oscal", "requirements": ["PRS-001", "PRS-003"] },
    { "name": "OscalDoc", "requirements": ["FAC-001", "FAC-002", "FAC-003", "FAC-004"] },
    { "name": "parse_directory", "binding-local": "PYB-001" }
  ]
}
```

Rejected additions, each because it adds work without a mechanical check of real value:

1. A list of the contract requirements that a binding-local operation composes. A list does not prove that the
   operation composes only those operations (user decision).
2. The pinned spec version in the record. The binding pin already fixes it.
3. A fixed file name or location. The binding chooses them. Only the shape is shared.
4. A `deprecated` flag. A binding marks deprecation in its public API, where its users see it.
5. A rule that binding-local prefixes differ from contract prefixes. The member name already tells the two kinds apart.

The operation name is the exported name as the binding spells it, with no whitespace. Name uniqueness across entries
is a binding check, because a JSON Schema cannot express it.

### D4. Generate the index with a new script that reuses the spec parser

`scripts/requirements.ts` follows the pattern of `scripts/names.ts`:

1. `npm run requirements:write` writes `openspec/requirements.json`.
2. `npm run requirements:check` fails when the committed file differs from the output, and names the write command.
3. `npm run requirements:self-test` runs fixtures for the generator and for the record JSON Schema.

The script reads the main specs with `readRepository` and `parseSpec`. It fails, and writes nothing, when any
requirement heading has no well-formed identifier. A silent skip would drop a requirement from the index. The format:

```json
{
  "format": 1,
  "requirements": [
    { "id": "BMB-001", "capability": "backmatter-builders", "title": "Build a back-matter hash value" }
  ]
}
```

Entries are in identifier order: the prefix in code-point order, then the number. The title is the heading text after
the identifier. The output uses two-space indentation and a final newline, as `names.json` does. `.gitattributes`
marks the file as generated. The index holds requirements, not scenarios, because a record cites requirements only.

The alternative, a mode of `check-spec-ids.ts`, mixes a check with a write step and makes that script longer.

### D5. Classify the release as a minor increment, `0.4.0+oscal.1.2.3`

The user chose a minor increment. The basis in [VER-003]: the change adds newly specified behavior and two published
files. It changes no parse rule, error category, canonical name, or corpus case, so each binding passes the same
corpus as before. The new obligation is the record and the surface rule. A binding meets it when it moves its pin,
and a binding that keeps the `0.3.0+oscal.1.2.3` pin is not affected. Risks 1 records the tension with the
"breaking change" wording of [VER-003].

### D6. Publish the record schema as `openspec/traceability.schema.json`

The file sits next to the index, and both enter the archive through `CONTENTS`. It follows the manifest schemas:
draft-07, `$id` `https://github.com/cairn-proofs/oscal-bindings-specs/openspec/traceability.schema.json`,
`format` const `1`, and `additionalProperties: false`. Each entry is a `oneOf` of the two member sets of D3. The
identifier pattern is `^[A-Z]{2,5}-[0-9]{3}$`. `requirements` has one or more unique items.

### D7. Document the promotion path in `CONTRIBUTING.md`

GitHub links a root `CONTRIBUTING.md` from new issues and pull requests. The file states the promotion path of
[SRF-005] and the regeneration step of the index. It cites the requirements and does not restate them. `docs/` is the
alternative, but it holds shared rule documents that the specs cite, and it enters the archive.

## Risks / Trade-offs

1. [A binding that conforms to `0.3.0+oscal.1.2.3` does not conform to `0.4.0+oscal.1.2.3` until it adds a record.
   [VER-003] calls a breaking change to the contract a major increment.] → Accepted by the user. The release notes
   state the new obligation. A later change can amend [VER-003] if the project wants a rule for this kind of change.
2. [The binding-local conditions of [SRF-002] need judgment, so two bindings can classify one operation differently.]
   → The record makes each binding-local operation visible to a reviewer. [SRF-005] resolves a conflict when a second
   binding needs the operation.
3. [A contributor adds a requirement and forgets the index.] → `npm run check` fails and names
   `npm run requirements:write`. `CONTRIBUTING.md` states the step.
4. [A binding-local identifier needs a binding spec with identified requirements, and no binding has a main spec
   today.] → The Python binding has no binding-local operation in its curated surface (Context 5), so it needs no
   binding spec now.
5. [The index changes in each commit that syncs or archives a change, which adds diff noise.] → The file is small and
   marked as generated.

## Migration Plan

1. Merge the change, then tag `v0.4.0+oscal.1.2.3` on `main`. CI builds the archive and the draft release. The user
   publishes it.
2. Each binding moves its pin, adds its record, and adds its surface check. The Python binding gets a follow-up issue.
3. Rollback: a binding keeps its old pin. The release changes no released name or schema file.
