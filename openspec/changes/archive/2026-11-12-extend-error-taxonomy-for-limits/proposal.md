# Proposal

## Why

The error category is the only part of an error that has the same value in each binding
([ERR-001.08]). Two problems follow from the current taxonomy:

1. A conformant document over a documented limit is a parse error ([PRS-010], [ERR-004] item 3). The
   parse error identifies the limit, but the form of that identification is binding-defined. A
   caller therefore cannot tell "the document is not valid" from "the binding stopped" in a portable
   way ([#42]).
2. Element validation has no rule for limits. A binding that caps the failure list of [ELV-001], or
   that stops at a depth limit, does not conform. An element over a depth limit has no category
   ([#28]). It is not an unknown element type ([ELV-003]). Element validation parses no input, so
   the parse-error category does not fit. The TypeScript binding reports the parse-error category
   for this case today ([typescript#10]).

The fix must also leave room for the next error situations. [#41], a fast follow, defines the result
of a file-path parse that fails for a reason other than a missing file. The taxonomy needs rules
that let a later change add a category or a property without a new exception in [ERR-001].

## What Changes

1. Change [ERR-001] to list a sixth category, limit exceeded, and to make document-type mismatch a
   subcategory of parse error. The text then refers to the tree rule of [ERR-009] in place of its
   exception for document-type mismatch.
2. Add [ERR-009] to `error-model`. Categories form a tree. An error in a category is also in each
   ancestor of that category. In each binding, a caller can test whether an error is in a category.
3. Add [ERR-010] to `error-model`. An error can carry portable properties, which are independent of
   its category. In each binding, a caller can test whether an error carries a property. The
   contract defines one property, the limit property. It states that a documented limit of the
   binding stopped the operation, and identifies the limit. The form of the identification stays
   binding-defined. Only the presence of the property
   becomes portable. **BREAKING** for a binding that identifies a limit only in the text of a
   message.
4. Add [ERR-011] to `error-model`. Element validation over a documented limit, other than a limit
   that counts failures, reports the limit-exceeded category. The error carries the limit property
   and is not a parse error.
5. [PRS-010] keeps its text. It requires a parse error over a limit that identifies the limit, and
   [ERR-010] makes that identification the limit property. A parse over a limit stays in the
   parse-error category.
6. Add [ELV-004] to `element-validation`. A binding documents each limit that it applies to element
   validation, as [PRS-010] requires for a parse. Over a limit that counts failures, the operation
   returns an invalid result whose failure list meets [PRS-011] and [PRS-012]. Over any other limit,
   it reports the error of [ERR-011].
7. Change [ELV-001], so that the failure list covers each failure, except as [ELV-004] permits.
8. Change `corpus/1.2.3/README.md`, so that the `categories` list holds each category that a
   portable case can reach. A case reaches the limit-exceeded category only through a documented
   limit, which is binding-defined, so the list and the cases do not change.
9. This change does not change `VERSION` and does not tag a release. `VERSION` already names the
   next minor release, `0.8.0+oscal.1.2.3`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `error-model`: change [ERR-001]. Add [ERR-009], the category tree, [ERR-010], the portable
   properties and the limit property, and [ERR-011], the limit-exceeded category of element
   validation.
2. `element-validation`: change [ELV-001]. Add [ELV-004], the documented limits of element
   validation.

## Impact

1. `openspec/specs/error-model/spec.md` and `openspec/specs/element-validation/spec.md`: after sync.
2. `openspec/spec-ids.yaml`: in the sync commit, `ERR` `next` goes from 9 to 12, and `ELV` `next`
   goes from 4 to 5. `npm run requirements:write` adds the entries of [ERR-009], [ERR-010],
   [ERR-011], and [ELV-004] to `openspec/requirements.json`.
3. Corpus: `corpus/1.2.3/README.md` only. No case, input, or category of `corpus/1.2.3/cases.json`
   changes.
4. Bindings, when they move the pin:
   1. A binding that documents a parse limit makes the limit property testable. The Python binding
      (`OscalParseError` in `src/oscal_bindings/v1/parser.py`) and the TypeScript binding
      (`ParseError` in `src/validators.ts`) identify a limit only in the text of the message today.
   2. A binding that applies a limit to element validation documents it. Over a limit that counts no
      failures, it reports the limit-exceeded category. The TypeScript depth limit of
      `src/validate-element.ts` reports a parse error today.
   3. A binding that applies no limit needs no change.
5. `VERSION`: no change. It is `0.8.0+oscal.1.2.3`, and the last release is `v0.7.0+oscal.1.2.3`.
6. No change to the naming manifest, the schemas, the scripts, or the CI workflow.


[#28]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/28
[#41]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/41
[#42]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/42
[typescript#10]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/10
