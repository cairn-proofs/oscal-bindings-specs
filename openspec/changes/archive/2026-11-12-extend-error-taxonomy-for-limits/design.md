# Design

## Context

See proposal.md, Why, for the problem. These facts shape the approach:

1. [ERR-001] lists five categories. Each error situation maps to exactly one category, except that a
   document-type mismatch is also a parse error. [ERR-005] states the same for the mismatch.
2. D5 of the parse-limits design
   (`openspec/changes/archive/2026-11-03-limit-parse-resources/design.md`) made the parse error
   identify the limit in a binding-defined form. It rejected a new category, because a caller that
   handles each parse error the same way must then handle one more category.
3. [PRS-011] and [PRS-012] state the entry floor of 100 and the form of a short list for a parse
   error. [PRS-010] states how a binding documents a limit. Each rule names a parse error or a parse
   operation. The project rules do not allow a copy of normative content from one spec to another.
4. The Python binding (`OscalParseError` in `src/oscal_bindings/v1/parser.py`) and the TypeScript
   binding (`ParseError` in `src/validators.ts`) identify a limit only in the text of the message.
   The TypeScript element validation (`src/validate-element.ts`) applies a depth limit of 250 levels
   and reports a `ParseError` over it.
5. `corpus/1.2.3/README.md` states that the `categories` list of `cases.json` is the taxonomy of
   `error-model`. `scripts/check-corpus.ts`, check 2, fails a listed category that has no case. A
   limit is binding-defined, and [PRS-010.04] does not let a binding apply an undocumented limit. No
   portable case can therefore reach a limit.
6. `VERSION` is `0.8.0+oscal.1.2.3`.

## Goals / Non-Goals

**Goals:**

1. A caller can tell "a documented limit stopped the operation" from "the input is not valid" with
   the same test in each binding.
2. A later change, for example the change for [#41], can add a category, a subcategory, or a
   property without a new exception in [ERR-001] and without a change to an existing category.

**Non-Goals:**

1. The categories of the file-path read failures of [#41].
2. A portable limit property on the result of element validation. The result identifies a limit in a
   binding-defined form, as a parse error did before this change
   ([D5](#d5-element-validation-gives-a-result-or-an-error-by-the-kind-of-limit)).
3. A corpus case for a limit.
4. A change in a binding repository. Each binding changes when it moves its pin.

## Decisions

### D1. An error has two independent axes: its category and its properties

The category states what went wrong: the input is not a valid document, the file does not exist, the
element type is unknown. A property states a fact about the error that does not depend on what went
wrong. The limit property states that a documented limit of the binding stopped the operation
([ERR-010]).

A limit can stop a parse or element validation. With one axis, a limit category needs a different
parent for each operation: parse error for a parse, and none for element validation. A class in a
single-inheritance language cannot have a parent that changes with the call. With two axes, each
error has one place in the tree, and the limit property is the portable signal across both
operations.

1. **Alternative considered: a limit-exceeded category for each operation, also a parse error for a
   parse.** The category then has a parent that depends on the operation. A binding in TypeScript
   then needs two classes and a shared marker. Each later cause that applies to more than one
   operation, for example a timeout of the caller, has the same problem. Rejected.
2. **Alternative considered: a limit-exceeded category that is not a parse error.** A caller that
   catches parse errors then stops catching a parse over a limit. That is the cost that D5 of the
   parse-limits design named, and it changes the category of an existing situation. Rejected.

### D2. Categories form a tree, and a narrow category for each kind of failure

[ERR-009] gives each category one parent or none. An error is also in each ancestor of its category.
The document-type mismatch becomes a subcategory of parse error, which states the existing exception
of [ERR-001] as a tree. [ERR-005] keeps its text, because "also a parse error" is true under the
tree.

The tree makes each kind of extension additive:

1. A new subcategory: each caller that tests for the parent still gets true.
2. A new top-level category: no existing error moves into it.
3. A new property: each existing error keeps its category.

A category holds the situations that its requirement names, for example [ERR-006] for not-found. A
new situation joins an existing category only when it is the same kind of failure. Otherwise it gets
a new category. A category that is defined by "the operation did not finish" would hold each future
failure, for example each read failure of [#41]. The contract therefore does not define one.

1. **Alternative considered: a list of exceptions in [ERR-001], one for each category that is also
   another category.** Each new case then edits [ERR-001], and the list does not say which category
   is the more specific one. Rejected.
2. **Alternative considered: more than one parent.** A single-inheritance language cannot express it
   with classes. Rejected.

### D3. The limit property makes the presence of the identification portable

[ERR-010] keeps the form of the identification binding-defined, as D5 of the parse-limits design
decided. It makes only the presence of the identification portable: a caller can test, in each
binding, whether an error carries the limit property. "An error identifies a limit" means "the error
carries the limit property". [PRS-010], [PRS-011], [PRS-012], and [ERR-003] use the words
"identifies the limit", so their text does not change.

A parse over a limit stays in the parse-error category ([ERR-004] item 3). D5 of the parse-limits
design therefore still holds for a parse: no caller that handles each parse error the same way must
handle a new category.

The validity check of [ERR-002] reports no error, so neither axis applies to it. [ERR-002] does not
change.

1. **Alternative considered: a fixed form, for example a field with the name of the limit.** Each
   language has its own idiom for data on an error, as [ERR-001] allows for categories. A test for
   presence is enough to tell the two causes apart. Rejected.

### D4. The limit-exceeded category holds element validation over a limit

Element validation parses no input, so a parse error does not fit an element over a limit. The
element type is known, so the unknown-element-type category does not fit. [ERR-011] adds the
top-level category limit exceeded for this one situation. The error also carries the limit property,
so a caller tests for a limit in the same way after a parse and after element validation.

1. **Alternative considered: a category for each operation that cannot give a verdict.** That
   definition also holds a file-path parse that cannot read its file, which is a different kind of
   failure ([D2](#d2-categories-form-a-tree-and-a-narrow-category-for-each-kind-of-failure)).
   Rejected.

### D5. Element validation gives a result or an error by the kind of limit

[ELV-004] has two cases:

1. Over a limit that counts failures, the element is invalid, because the binding found failures.
   The operation returns an invalid result with a short list. [ELV-004] refers to [PRS-011] and
   [PRS-012], with the result in place of the parse error. The floor of 100 and the form of a short
   list are then the same for both operations. The result identifies the limit and states that the
   list is incomplete in a binding-defined form, as [PRS-012] states for a parse error.
2. Over any other limit, the binding cannot state that the element is valid or invalid. The
   operation reports the limit-exceeded error of [ERR-011] and returns no result.

The rule depends only on what the binding documents, not on the steps inside the binding.

1. **Alternative considered: a copy of the floor and the short-list form in `element-validation`.**
   The project rules do not allow a copy of normative content. Rejected.
2. **Alternative considered: move the documentation rule and the short-list rule to a part of the
   specs that does not name an operation.** That restructures [PRS-010] to [PRS-012], which neither
   issue asks for. Rejected.
3. **Alternative considered: a third result, "not determined".** A caller that reads only the valid
   flag of the result then treats such an element as invalid or valid with no signal. Rejected.

### D6. The corpus lists each category that a portable case can reach

No portable case can reach the limit-exceeded category (Context item 5). The `categories` list of
`cases.json` keeps its five categories, and `corpus/1.2.3/README.md` states that the list holds each
category that a portable case can reach. Check 2 of `scripts/check-corpus.ts` stays as it is. The
rule does not name the limit, so a later category that no portable case can reach, for example a
read failure of [#41], needs no new README text.

1. **Alternative considered: list the category, and exempt it from check 2.** The checker then needs
   a list of exemptions, and the list of categories is no longer the list that the cases cover.
   Rejected.

### D7. The release is a minor increment, under the 0.y.z rule

No situation changes its category. But [ERR-010] makes the rule for a parse error over a limit
stricter, so [VER-003.03] names a major increment. The change is a break for a binding that
documents a parse limit and identifies it only in the text of a message (Context item 4). That
binding must make the limit property testable when it moves its pin. The Python and TypeScript
bindings are both in this case.

The store released earlier breaks as minor increments under the `0.y.z` rule of Semantic Versioning
(`openspec/changes/archive/2026-11-03-limit-parse-resources/design.md`, D8). This change follows
that precedent. `VERSION` is `0.8.0+oscal.1.2.3`, and the last release is `v0.7.0+oscal.1.2.3`, so
`VERSION` already names the next minor release and does not change.

## Risks / Trade-offs

1. [Risk] The reference of [ELV-004] item 1 to [PRS-011] and [PRS-012] can be misread. → The item
   names both substitutions: the result for the parse error, and the limit of [ELV-004] for a limit
   of [PRS-010]. [ELV-004.01] states the concrete result: 100 failures, a statement that the list
   is incomplete, and the identification of the limit.
2. [Risk] No corpus case tests the limit property or the limit-exceeded category. → Each binding
   tests its own documented limits. [ERR-010.01] and [ERR-011.01] state the result that such a test
   checks.
3. [Trade-off] The limit property of an error is portable, but the identification of a limit on an
   element-validation result is binding-defined. A caller of element validation still gets the right
   verdict, invalid, from the result.

[#41]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/41
