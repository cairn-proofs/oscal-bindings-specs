# Design

## Context

See [proposal.md](proposal.md#why) for the reason for this change. Today the store vendors the
NIST JSON Schema in `schemas/1.2.3/` and generates the naming manifest from it ([MDL-009]). The
store has no metaschema input. The parse operation ([PRS-006]), the validity check ([ERR-002]),
element validation ([ELV-001]) and the back-matter builders ([BMB-001]) decide validity with the
schema only.

The OSCAL 1.2.3 metaschema holds 340 constraints. 328 have the level ERROR, and 12 have the level
WARNING. No constraint has the level CRITICAL. Of the 328, 21 are `allowed-values` constraints
that the JSON Schema already enforces as an `enum`, and 60 are `allowed-values` constraints with
`allow-other="yes"`, which cannot fail. The other 247 can fail for a document that conforms to
the schema, unless they are defective.

An exploration spike translated these 247 constraints into RFC 9535 queries with a generator, and
compared the selected nodes with a reference Metapath evaluator. 246 queries selected the same
nodes in every run. The one difference is the part of `oscal-ssp-by-component-uuid-index` that
selects nodes in another document. The runs used 25 valid corpus documents, the 43 JSON documents
of `usnistgov/oscal-content` at commit `f0de6d8`, generated documents of each model, and 26
hand-made failing inputs.

The spike also evaluated its rules on the 43 documents of `usnistgov/oscal-content`. Its rules
match the rules of this change for a document, except that this change excludes the defective
constraints and does not check references against a partial index. These two rules only remove
failures, and none of the removed failures occurred in these documents. The result:

1. 35 documents meet the manifest. They include the SP 800-53 rev5 catalog with its baseline
   profiles and resolved catalogs, SP 800-171 rev3, SP 800-172 rev3, SP 800-218, CSF 2.0, AI RMF,
   and each example except one.
2. The 7 SP 800-53 rev4 documents fail. They declare `oscal-version` 1.0.0, and NIST no longer
   updates them. They hold properties named `priority`, parameters with `depends-on`, and a
   reference to a party that the document does not define.
3. `examples/profile/json/basic-profile-resolved.json` fails `oscal-control-statement-part-name`.
   It holds a part named `item` below a `guidance` part, which is the rule of [OSCAL#2118].

The `has-cardinality` entries had few context nodes in these documents: 4 activities, 5
implemented requirements and 2 exports, and all of them passed. 6 of the 9 `has-cardinality`
constraints selected no context node.

## Goals / Non-Goals

**Goals:**

1. Give each binding, in any language, the constraints as data that an RFC 9535 implementation
   can evaluate, so that no binding translates Metapath.
2. Verify the data in the store with a reference evaluator and a failing corpus input for each
   constraint that can fail.

**Non-Goals:**

1. Report constraints of the level WARNING or lower. A parse result has no place for a warning.
2. Check nodes in another document (`doc()`), or the references of an element to nodes outside
   the element.
3. Implement a binding, or set a time limit for evaluation in a binding.

## Decisions

### D1. Queries in RFC 9535 JSONPath, not Metapath

The manifest holds RFC 9535 queries ([CNS-006]). RFC 9535 is an IETF standard with a shared
compliance test suite, and it has implementations in Python, TypeScript, Java, Go and Rust. A
query result gives a Normalized Path for each node, which a binding can use as the location of a
failure.

The spike needed only the child and descendant segments, filters, and the function `match()`. It
needed no parent axis. Where a key name such as `parts` belongs to several definitions, the
generator writes a longer query that starts at a key that only the declaring definition reaches.
The spike found such a query for each of the 14 definitions that needed one.

Alternatives considered:

1. Metapath. Its only implementation is metaschema-java.
2. JMESPath. It has no descendant segment, and many constraints target descendants.
3. CEL, JSONata and CUE. CEL cannot select nodes in a tree. JSONata has no standard, and its
   ports behave differently. CUE has a full API only in Go.
4. A path language of the store. It would need a specification and an implementation in each
   language, and RFC 9535 already covers the need.

### D2. The store generates the manifest once

The store translates the metaschema into `manifest/<release>/constraints.json` with TypeScript
tooling in `scripts/`, as it generates `names.json` ([CNS-004]). The generator resolves group
names, JSON keys, `has-oscal-namespace()`, unions and the regular expressions. A key-field pattern
of OSCAL 1.2.3 is always a literal prefix followed by `(.*)`, so the manifest holds the prefix
([CNS-012]). I-Regexp defines no capture group. A binding reads the manifest and does not read the
metaschema.

The generator reads `names.json` to find the element type of each definition ([ELV-002]), so that
the element context queries of [CNS-007] use the element-type names of the contract.

### D3. The metaschema text is the authority, and defective constraints stay out

The manifest follows the text of the metaschema and of the Metaschema specification, not the
behavior of metaschema-java. A constraint that cannot work as written is defective ([CNS-002]).
The list `excluded` of the exclusion list names each one with an issue of `usnistgov/OSCAL`
([CNS-003]). A constraint
that works as written stays in the manifest, also when people disagree with it. For example,
[OSCAL#2118] reports a rule on the part names below `guidance` that the manifest enforces.

The list `excluded` holds these 9 constraints:

| Constraint | Condition of [CNS-002] | Issue |
|---|---|---|
| `oscal-metadata-action-type-values` | 1. The target `./type[...]` selects nothing, because `type` is a flag of `action`. | [OSCAL#2301] |
| `oscal-metadata-action-system-values` | 1. The target `./system/@value` selects nothing, because `system` is a flag of `action`. | [OSCAL#2301] |
| `oscal-inventory-item-hardware-service-software-prop-name-values` | 1. The filter tests `@type`, which `inventory-item` does not have. | [OSCAL#2255] |
| `oscal-profile-merge-combine-method-values` | 1. The JSON Schema has no `method` on `combine`, so the target `@method` selects nothing. | [OSCAL#2259] |
| `oscal-assesment-part-objective-cardinality` | 2. It fails for each assessment part that is not named `objective`. | [OSCAL#2291] |
| `oscal-assessment-method-id-cardinality` | 3. It requires a property `method-id`, and no `allowed-values` constraint lists that name. | [OSCAL#2059] |
| `oscal-system-implementation-validation-index` | 3. Its target holds an `href` that starts with `#`, and its key field has no pattern. The index holds bare UUIDs, so each target node fails. | [OSCAL#2303] |
| The `allowed-values` constraint without an `id` on the mapping field `relationship` | 4. `has-oscal-namespace()` gives an error for a field (D4). | [OSCAL#2302] |
| The `allowed-values` constraint without an `id` on the mapping field `category` | 4. As above. | [OSCAL#2302] |

`oscal-profile-req-merge-combine` is not defective. Its target selects `combine`, and its test
`not(@method='merge')` is always true for a document that conforms to the schema, because the
JSON Schema gives `combine` no members. The manifest holds it, and the list `cannot-fail` of the
exclusion list names it with this reason, so that the entry is not reportable ([CNS-021]).

The list `cannot-fail` also names 4 `matches` entries with the datatype `uri-reference` on an
`href` that starts with `#`: `oscal-metadata-link-reference-href-datatype-uri-reference`,
`oscal-system-information-pia-datatype-uri-reference`, `oscal-diagram-datatype-uri-reference` and
`oscal-leveraged-authorization-link-rel-ssp-datatype-uri-reference`. The pattern `\S(.*\S)?`
rejects only a value with white space at an end or a line break. The JSON Schema gives `href` the
`format` `uri-reference`, and the schema check of the store rejects each such value.

The list `cannot-fail` also names `oscal-unique-resource-base64-filename`. Its target is the
member `base64` of a resource. The JSON Schema allows at most one `base64` member for each
resource, so no key can repeat.

No mechanical rule finds these entries: the generator would have to prove that the test of an
entry holds for each node that the schema allows.

An item of either list identifies a constraint by its `id`. For a constraint without an `id`,
the item identifies it by its module, its declaring definition and its kind.

The completeness of the list depends on review, with one check: each reportable entry needs a
failing corpus input ([CNS-020]). A reportable entry that can never fail cannot get one, so the
store checks fail until one of the lists names it.

Alternative considered: follow metaschema-java. oscal-cli, which uses it, has no release for
OSCAL 1.2.2 or 1.2.3, and its open issues report wrong constraint results.

### D4. The semantics of `has-oscal-namespace()` come from liboscal-java

84 of the 247 constraints use `has-oscal-namespace()`. The Metaschema specification does not
define the function. It is an OSCAL function, and its only definition is its implementation in
liboscal-java (`HasOscalNamespace.java`, at the commit that `metaschema/1.2.3/SOURCE.md` records).
The generator and the reference evaluator use these
rules from that source:

1. The arguments are one or more namespace strings.
2. The namespace of a node is its `ns` value, or `http://csrc.nist.gov/ns/oscal` when `ns` is
   absent.
3. The result is true when the namespace of the node is equal to one of the arguments, character
   for character.
4. The function applies to a property, a part and an assessment part. For any other node, the
   result is an error, so the constraint is defective by condition 4 of [CNS-002].

### D5. The manifest holds every constraint of the level ERROR, also the ones that cannot fail

The manifest holds each constraint of the level ERROR or CRITICAL that the list `excluded` does
not list ([CNS-005]). That is 319 entries. 233 are reportable. The other 86 cannot fail for a
document that conforms to the schema, and each entry states that it is not reportable
([CNS-021]):

1. 21 `allowed-values` entries that the JSON Schema enforces.
2. 58 `allowed-values` entries with `allow-other="yes"`.
3. 6 entries that the list `cannot-fail` names (D3).
4. `oscal-by-component-uuid-index`, whose index is partial (D9).

The open entries are necessary for the applicable set of [CNS-008]. The Metaschema specification
makes all `allowed-values` constraints that target a node one set, and the set is closed when one
of its members is closed. The spike showed the effect. In `terms-and-conditions`, the part name
`objective` passes, because the open constraint `oscal-assessment-part-values` lists it. A
manifest without the open entries rejects it.

A node that fails two closed entries gives two failures ([CNS-008]), because each failure carries
the `id` of one entry, and each entry is a separate constraint of the metaschema. A node that one
entry selects from several context nodes gives one failure of that entry ([CNS-017]), because a
failure is a location and the `id` of an entry.

The 21 entries that the JSON Schema enforces give no duplicate failure, because a parse error for
a document that fails the schema carries schema failures only ([PRS-015]).

The 9 entries without an `id` are all in the first two groups, so no failure needs an identifier
that the metaschema does not supply. 13 `id` values occur more than once in the modules, for
example `oscal-metadata-prop-name-values` on `metadata` and on `property`. A failure carries the
`id`, and the corpus check of [CNS-020] identifies each entry through the reference evaluator.

Alternative considered: hold only the reportable entries, plus the value lists of the others. That
needs a second kind of entry and a rule for it. The uniform rule is shorter.

### D6. Constraint failures only for a document that conforms to the schema

[PRS-015] reports constraint failures only when the document conforms to the schema. The queries
assume the structure of the model, and a document that fails the schema can break that
assumption. The rule also keeps the counts of the existing corpus cases, which count schema
failures.

### D7. Readings where a literal reading of the specification makes a rule unable to work

[CNS-011] to [CNS-015] state four rules that the specification does not settle, or settles in a
way that makes the rule unable to work. In each case the manifest takes the reading that lets the
constraint work as its text intends:

1. **A `has-cardinality` entry counts 0 for a context node with no target node.** The section on
   `@target` says that a constraint with no target node "MUST be ignored". The section on
   `has-cardinality` counts the target nodes against `@min-occurs`. With the first reading, a
   minimum of 1 or more could never fail. metaschema-java also counts 0. With this reading, the
   reportable `has-cardinality` entries make these children mandatory:
   1. An activity holds a property `method` of the OSCAL namespace
      (`oscal-activity-type-cardinality`).
   2. A location holds a title, an address, an email address or a telephone number
      (`oscal-metadata-location-title-address-email-address-telephone-cardinality`).
   3. An implemented requirement of a system security plan holds a by-component, directly or in
      a statement (`oscal-implemented-requirement-by-component-cardinality`).
   4. An export of a by-component holds a provided item or a responsibility
      (`oscal-by-component-export-provided-responsibility-cardinality`).
   5. A local objective holds an assessment-method part. Over all its assessment-method parts, it
      holds exactly one property `method` and exactly one objects part
      (`oscal-assessment-method-cardinality`, `oscal-assessment-objects-cardinality`). The parts
      of a local objective are `part` elements, and `oscal-part-prop-name` does not list `method`.
      Thus the property `method` must have the namespace `http://csrc.nist.gov/ns/rmf`.
2. **A key whose values are all null is no key.** The specification sets a missing key value to
   null, and makes two equal keys an error. Read literally, two catalog parts without an `id` are
   a duplicate. The spike counted 26,162 such failures in the SP 800-53 rev5 catalog, which is
   content that NIST publishes as valid. metaschema-java also skips these keys.
3. **A key field of an `index-has-key` entry can select several values, and each value is a
   key.** Three constraints have the key field `party-uuid` on a list of party identifiers. The
   specification does not say what several values mean. Each identifier is a reference, so each
   one must be in the index. metaschema-java reports an error for several values.
4. **The key fields of `is-unique` and `index` entries select one value or none.** No such
   constraint of OSCAL 1.2.3 selects more. The generation fails if one does, so that a new
   release cannot bring an undefined case into the manifest.

### D8. The element form of each entry

Element validation and the builders apply each entry except `index` and `index-has-key`
([CNS-018]). These two kinds compare keys over the whole document, and a standalone element
cannot settle them. A reference out of an element is checked when the document that holds the
element is parsed.

The document context queries of an entry often start at the root key of a document type, for
example `$['catalog']..['groups'][*]`. Thus each entry also holds element context queries for
each element type that can hold a context node ([CNS-007]).

An `allowed-values` entry has element context queries only when the element also decides the rest
of the applicable set ([CNS-009]). For example, the entry on `property` lists only `marking`, and
entries on controls, parts and components list more names for their properties. A standalone
`property` element cannot tell which of these apply, so the element form checks none of its name
entries. The corpus case `element/property-valid`, a property with the name
`cloud-deployment-model`, stays valid.

### D9. An index with a part in another document is partial

The index `by-component-uuid` of `oscal-ssp-by-component-uuid-index` is a union of the
by-components of the system security plan and the by-components of a leveraged system security
plan (`doc()`). The `index-has-key` entry `oscal-by-component-uuid-index` checks `provided-by`
links against it. Without the other document, a valid link into the leveraged plan is not in the
index. Thus the index entry states that its index is partial, and an `index-has-key` entry with
a partial index gives no failure ([CNS-014], [CNS-015]). The index entry still checks the local
by-components for duplicate keys.

### D10. Corpus cases for constraint failures

Each reportable entry gets one `parse` case. The input conforms to the JSON Schema and fails that
entry. A new case field `expected-constraints` lists the `id` of each failure of the input, once
for each failure ([CNS-020]). For example, an OSCAL-namespace property name that a control does
not allow fails `oscal-control-prop-name` and `oscal-metadata-prop-name-values`, so its case lists
both. The input is the smallest schema-valid document of its model, with one change. A generator
(`scripts/corpus-constraint-cases.ts`) builds it from the required members only, so a case file
has about 1 KB and a reviewer sees the change. A copy of a corpus document would add several
megabytes of near-identical files.

The check of [CNS-020] also runs the reference evaluator on each input that a case expects to be
valid, and on the element that each builder case expects. Two existing inputs then fail, and the
change fixes them:

1. `number-scalars.yaml` and `string-scalars.yaml` use the property names `port`, `release` and
   `count` in the OSCAL namespace. The fix gives these properties a namespace of their own, so the
   inputs keep their scalar types.
2. `build-hash/algorithm-string` builds a SHA-512 hash from 64 hexadecimal digits, and
   `oscal-check-hash-length-SHA2-3-512` requires 128. The fix uses a value of 128 digits.

One more `parse` case checks [PRS-015.02]: an input that fails the schema and also holds a
property that a manifest entry rejects, with `expected-max-failures` equal to its number of schema
failures. The cases for element validation and the builders use `expected-constraints` too.

### D11. Datatype patterns from the Metaschema datatypes XSD

A `matches` constraint with `datatype` gets the pattern of that datatype from
`metaschema-datatypes.xsd` ([CNS-001]), as an I-Regexp. The vendored JSON Schema has no
definition for `date-time`, `ip-v4-address` and `ip-v6-address`, and it gives `uri-reference` a
`format` only.

The generator rewrites the regular expressions into I-Regexp:

1. It removes the anchors `^` and `$`, because an I-Regexp always matches in full.
2. It writes `(?:` as `(`.
3. It writes the escape `\S` as `[^ \t\n\r]`. RFC 9485 has no multi-character escapes.
4. It moves a comma out of a character class. The RFC 9535 library json-p3 3.0.3 passes the
   compliance test suite, but never matches a pattern with a comma in a character class.
5. It moves a literal hyphen to the end of its character class. RFC 9485 allows a literal hyphen
   only at the start or the end of a class. `oscal-metadata-link-resource-fragment-datatype` has
   one after the range `A-Z`.

The generation fails for a pattern that it cannot rewrite, and for a datatype without a pattern
([CNS-010]). Thus the choice of the XSD commit cannot leave a `matches` entry without a pattern.

The XSD defines `integer` as a restriction of `xs:integer` with the pattern `\S(.*\S)?`, so the
pattern alone accepts `high`. The generator writes the lexical form of `xs:integer` as the pattern:
an optional sign and one or more digits.

## Risks / Trade-offs

1. A binding's RFC 9535 library can have a defect that the compliance suite does not find, as
   json-p3 has → The corpus has a failing input for each reportable entry, so each binding runs
   the query of each reportable entry on a document that it selects.
2. A translation error reaches every binding at once → The store evaluates the manifest with an
   RFC 9535 implementation and compares its failures with the reference evaluator ([CNS-022]).
   One fix in the store then corrects every binding.
3. The filters of an entry that cannot fail get no failing input → The query check of [CNS-019]
   compares the nodes on each corpus document, and the generated documents unroll each recursive
   definition to a depth of 6.
4. Evaluation is slow on large documents. With json-p3 and no tuning, the spike took 7.8 s for the
   SP 800-53 rev5 catalog (10.4 MB) and 19 ms for an SSP → A binding can index the queries or
   document a limit of [PRS-010]. The store gives no time limit.
5. Two libraries can report different nodes of one duplicate pair, because RFC 9535 does not fix
   the order of object members → [CNS-013] and [CNS-014] fix the number of failures, not the
   node. The corpus compares counts and identifiers, not locations.
6. Documents that parse today give a parse error, including 8 documents of
   `usnistgov/oscal-content` (Context) → The release is a breaking version increment, and the
   release notes list the constraints that the manifest enforces, the children that D7 makes
   mandatory, and the oscal-content documents that fail.
7. The `has-cardinality` reading of D7 has little evidence from published content: 11 context
   nodes over 3 constraints → The corpus has a failing input for each reportable entry, and the
   implementation runs the generated manifest on oscal-content again, as the tasks state.

## Migration Plan

1. Release the store with a breaking version increment. Under the `0.y.z` rule of Semantic
   Versioning, that is a minor increment, as for the earlier breaks of the store.
2. Each binding moves its pin through its pin-move issue, implements [CNS-006] to [CNS-018] with
   an RFC 9535 library, and records the corpus cases that it does not pass yet as expected
   failures ([VER-007]).

## Open Questions

1. Which commit of `usnistgov/metaschema` gives `metaschema-datatypes.xsd`. The change uses the
   commit that the build of OSCAL v1.2.3 pins. That commit is `37fd650b`, which has the tag
   `v0.9.1`. `SOURCE.md` records it.

[MDL-009]: ../../specs/model-derivation/spec.md#requirement-mdl-009-the-naming-manifest-is-the-shared-source-of-truth-across-languages
[PRS-006]: ../../specs/document-parsing/spec.md#requirement-prs-006-schema-validation-failures-carry-structured-error-detail
[PRS-010]: ../../specs/document-parsing/spec.md#requirement-prs-010-a-binding-can-limit-the-resources-that-a-parse-uses
[PRS-015]: specs/document-parsing/spec.md#requirement-prs-015-a-constraint-failure-is-a-parse-failure-that-names-its-constraint
[PRS-015.02]: specs/document-parsing/spec.md#scenario-prs-01502-a-document-that-fails-the-schema
[ERR-002]: ../../specs/error-model/spec.md#requirement-err-002-a-non-raising-validity-check-is-available
[ELV-001]: ../../specs/element-validation/spec.md#requirement-elv-001-validate-a-standalone-element-against-a-named-type
[ELV-002]: ../../specs/element-validation/spec.md#requirement-elv-002-element-type-names-are-kebab-case-and-derived-from-the-type-names
[BMB-001]: ../../specs/backmatter-builders/spec.md#requirement-bmb-001-build-a-back-matter-hash-value
[VER-007]: ../../specs/schema-versioning/spec.md#requirement-ver-007-each-binding-keeps-its-own-expected-conformance-failures
[CNS-001]: specs/constraint-validation/spec.md#requirement-cns-001-the-store-vendors-the-metaschema-of-each-vendored-oscal-release
[CNS-002]: specs/constraint-validation/spec.md#requirement-cns-002-a-constraint-that-cannot-work-as-written-is-defective
[CNS-003]: specs/constraint-validation/spec.md#requirement-cns-003-the-exclusion-list-names-each-defective-constraint-with-its-issue
[CNS-004]: specs/constraint-validation/spec.md#requirement-cns-004-the-store-publishes-a-constraint-manifest-for-each-release
[CNS-005]: specs/constraint-validation/spec.md#requirement-cns-005-the-manifest-holds-each-constraint-that-can-decide-validity
[CNS-006]: specs/constraint-validation/spec.md#requirement-cns-006-the-manifest-selects-nodes-with-rfc-9535-queries
[CNS-007]: specs/constraint-validation/spec.md#requirement-cns-007-each-entry-selects-context-nodes-and-target-nodes
[CNS-008]: specs/constraint-validation/spec.md#requirement-cns-008-an-allowed-values-entry-checks-the-value-against-its-applicable-set
[CNS-009]: specs/constraint-validation/spec.md#requirement-cns-009-an-element-decides-an-allowed-values-entry-only-with-its-applicable-set
[CNS-010]: specs/constraint-validation/spec.md#requirement-cns-010-a-matches-entry-checks-the-full-value-against-its-pattern
[CNS-011]: specs/constraint-validation/spec.md#requirement-cns-011-a-has-cardinality-entry-counts-the-target-nodes-of-each-context-node
[CNS-012]: specs/constraint-validation/spec.md#requirement-cns-012-a-key-is-the-list-of-the-values-of-the-key-fields
[CNS-013]: specs/constraint-validation/spec.md#requirement-cns-013-an-is-unique-entry-fails-for-target-nodes-with-the-same-key
[CNS-014]: specs/constraint-validation/spec.md#requirement-cns-014-an-index-holds-the-keys-of-each-index-entry-with-the-same-name
[CNS-015]: specs/constraint-validation/spec.md#requirement-cns-015-an-index-has-key-entry-fails-for-a-key-that-is-not-in-the-index
[CNS-017]: specs/constraint-validation/spec.md#requirement-cns-017-a-document-meets-the-manifest-when-no-entry-fails-for-it
[CNS-018]: specs/constraint-validation/spec.md#requirement-cns-018-an-element-meets-the-manifest-when-no-entry-that-it-can-decide-fails
[CNS-019]: specs/constraint-validation/spec.md#requirement-cns-019-the-store-checks-the-queries-against-a-reference-evaluator
[CNS-021]: specs/constraint-validation/spec.md#requirement-cns-021-an-entry-is-reportable-unless-it-cannot-fail
[CNS-022]: specs/constraint-validation/spec.md#requirement-cns-022-the-store-checks-the-failures-of-the-manifest-against-the-reference-evaluator
[CNS-020]: specs/constraint-validation/spec.md#requirement-cns-020-the-corpus-has-a-failing-case-for-each-reportable-entry
[OSCAL#2059]: https://github.com/usnistgov/OSCAL/issues/2059
[OSCAL#2118]: https://github.com/usnistgov/OSCAL/issues/2118
[OSCAL#2255]: https://github.com/usnistgov/OSCAL/issues/2255
[OSCAL#2259]: https://github.com/usnistgov/OSCAL/issues/2259
[OSCAL#2291]: https://github.com/usnistgov/OSCAL/issues/2291
[OSCAL#2301]: https://github.com/usnistgov/OSCAL/issues/2301
[OSCAL#2302]: https://github.com/usnistgov/OSCAL/issues/2302
[OSCAL#2303]: https://github.com/usnistgov/OSCAL/issues/2303
