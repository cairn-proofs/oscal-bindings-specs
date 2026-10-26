## Context

See [proposal.md](proposal.md#why) for the motivation. Three facts shape the approach:

1. [MDL-011] already defines the open and closed kinds, and [ERR-001] already maps a document that does not conform to
   the schema to the parse-error category. The gap is a missing explicit rule and missing corpus cases.
2. `scripts/check-corpus.ts` already fails a `parse` case when the schema accepts its input, and a `round-trip` case
   when the schema rejects its input. It reads the requirement identifiers from every `spec.md` under `openspec/`,
   including the deltas of an active change.
3. In the OSCAL 1.2.3 complete schema, each closed enum is held by a property. No definition holds a closed enum
   directly. The manifest has 20 closed and 24 open enum entries.

## Goals / Non-Goals

**Goals:**

1. Each binding that runs the corpus proves that it rejects an out-of-set closed value and keeps an off-list open
   value.
2. The checker proves each new fixture against the schema, so that the corpus cannot carry a wrong expectation.

**Non-Goals:**

1. One corpus case for each of the closed enum sites. Each binding tests its own generated types for every site.
2. A change to the corpus tooling, the naming manifest, or the schemas.
3. A change to [VER-003] for 0.x versions. This change is not a stricter parse rule, so the question does not apply.

## Decisions

### D1. State the rule in `document-parsing`, not in `model-derivation`

[MDL-011] is about names and kinds of types. The new rule is about parse results, so it goes in `document-parsing` as
[PRS-009] and refers to [MDL-011] for the kinds. The alternative, a parse scenario in [MDL-011], mixes derivation and
parsing in one requirement.

### D2. Classify the release as a minor increment

[VER-003] lists "a stricter parse rule" as a major increment. This change does not make parsing stricter than the
contract already requires. [MDL-011] says that only a value from a closed enum is valid. [ERR-001] says that a schema
failure is a parse error. [PRS-009] states that result and adds corpus cases. That is "newly specified
behavior" and "a new corpus case", which [VER-003] lists as a minor increment. The version is `0.3.0+oscal.1.2.3`.
The alternative, a major increment or a 0.x clause in [VER-003], was rejected (#9, explore session).

### D3. Use one representative site for each kind

1. Closed: `parameter-selection/how-many` with `seven`. A catalog reaches it through `catalog.params[].select`. Its
   base datatype is a token, and `seven` is a valid token, so the only fault is the enum.
2. Open: `hash/algorithm` with `BLAKE3`. A catalog reaches it through `back-matter.resources[].rlinks[].hashes[]`. Its
   base datatype is a string, and `BLAKE3` is not one of the eight listed algorithms.

Both fixtures start from the minimal catalog, as each existing invalid document does. The alternative, a case for
each closed site, adds 20 fixtures that test generator output, which each binding already tests.

### D4. Use the existing operations

1. The closed document case is a `parse` case with `expected-category: parse-error`.
2. The open case is a `round-trip` case, because `round-trip` is the only operation that requires the binding to
   accept a document. It also proves that serialization keeps the off-list value. `npm run corpus:write` generates its
   `expected/` file.
3. The element case is a `validate-element` case with `element-type: parameter-selection` and `expected-valid: false`.
   `parameter-selection` is one definition in the complete schema, so the checker finds a unique validator.

### D5. Record no known defect

The Python binding rejects `how-many: "seven"` and `transport: "SCTP"` and accepts `algorithm: "BLAKE3"` at v0.3.1,
from a check of its models. Its parser wraps the validation error as `OscalParseError`. A `known-defects` entry needs
an observed failure, and there is none.

## Risks / Trade-offs

1. [The open fixture fails a round trip in a binding for a reason other than the enum, for example the back-matter
   shape.] → Keep the fixture to the smallest valid back matter: one resource with one rlink and one hash.
2. [The closed fixture fails the schema for a second reason, so a binding passes it without an enum check.] → Change
   only `how-many` from a valid fixture. Check with the schema that the only failing keyword in the `catalog`
   branch is the `enum` keyword at `/catalog/params/0/select/how-many`. The union errors that this fault causes are
   expected.
3. [The Python binding does not run the new cases until it moves its pin from `0.2.0+oscal.1.2.3`.] → Accepted. The
   pin move is a Python change. This change only records the result of the model check in D5.

## Migration Plan

1. Merge the change, then tag `v0.3.0+oscal.1.2.3` on `main`. CI builds the archive and the draft release. The user
   publishes it.
2. A binding moves its pin to the new tag and its `sha256`, then runs the corpus.
3. Rollback: a binding keeps its old pin. The new release changes no released name or schema file.
