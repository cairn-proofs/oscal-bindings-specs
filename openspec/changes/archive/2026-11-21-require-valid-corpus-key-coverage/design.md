## Context

See [proposal.md, Why](proposal.md#why) for the motivation. These facts constrain the approach.

1. `scripts/check-corpus.ts` has 18 checks. None reads the keys of a valid document.
2. Each of the 23 pairs that #59 names is used by `catalog-unused-structures.json` or
   `profile-unused-structures.json`. A planning probe gave this result. Some pairs are used by
   other documents as well.

## Goals / Non-Goals

**Goals:**

1. Fail the corpus check when no valid document uses a listed pair.

**Non-Goals:**

1. A check of the keys of an invalid document, of a YAML document, or of the schema as a whole.
2. A list that is derived from the schema or from real content.

## Decisions

### D1. The list is a data file, not requirement text

The 23 pairs exceed the 500 characters that a requirement can have. `corpus/1.2.3/required-keys.json`
holds them as `{ "pairs": ["controls>controls", ...] }`. The requirement refers to the file. The
file is outside `documents/`, so no case is needed for it (check 3).

### D2. Pair semantics

A pair `a>b` is used when `b` is a member of an object that is the value of `a`, or of an item of
an array that is the value of `a`. The union over all JSON files in `documents/valid/` counts. A
`controls` array in a control that is an item of `controls` meets `controls>controls`.

### D3. Only JSON documents count

YAML documents in `documents/valid/` have JSON twins for the same structures, and the
`*-unused-structures` documents are JSON. Reading JSON only needs no YAML reader.
