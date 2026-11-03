## Context

See [proposal.md](proposal.md#why) for the motivation. These facts shape the approach:

1. [YML-011] is the only resource-limit rule in the contract. It applies to a YAML input only. [ERR-001], item 1, cites
   it by identifier.
2. [YML-005] defines the result of a YAML parse as the result of the JSON parse operation for the JSON text of the
   input. [YML-006] and [YML-007] define their operations through [YML-005]. A YAML input therefore gets the structured
   entries of [PRS-006].
3. [PRS-006] and [ERR-003] both require one structured entry for each failing location. [ERR-003] also states the
   purpose: a caller can present every failure, not only the first.
4. [ERR-002] requires the validity check to return true for each conformant document.
5. The corpus has three cases with `expected-min-failures`. The highest value is 2, in `parse/two-failures`. The largest
   valid corpus document is `system-security-plan.json`, at 22,092 bytes. `npm run corpus:check` compares
   `expected-min-failures` with the number of ajv errors under `oscal_complete_schema.json`. Its root `oneOf` adds
   errors from the other document types, so the count is higher than the count under the schema of the document type.
   For `parse/two-failures`, the counts are 17 and 2.
6. The store's corpus check validates with ajv and `allErrors: true`. A probe with that validator on catalogs with `n`
   empty metadata properties gave the results in the table. One empty property gives two entries at one location,
   because the schema requires `name` and `value`. A property with only a `name` gives one entry.

   | Input bytes | Entries | Heap growth | Time |
   |---|---|---|---|
   | 15,171 | 10,000 | 7 MiB | 0.01 s |
   | 60,171 | 40,000 | 28 MiB | 0.3 s |
   | 240,171 | 160,000 | 106 to 190 MiB in four runs | 4.6 s |
   | about 2 MiB | about 1,400,000 | not measured | did not complete in 5 minutes |

   The heap grows faster than the input. The time grows with about the square of the number of entries. One entry uses
   about 0.7 to 1.2 KB of heap. A valid catalog with 320,000 properties validates in 24 ms, so the slow case is a
   document with many failures, not a large valid document. A binding uses its own validator, so these numbers show the
   form of the risk, not the cost in each binding.
7. [SRF-004] does not resolve a retired identifier in a traceability record. The store retired [MDL-004] with
   `replaced_by: MDL-013` in the minor release `v0.2.0+oscal.1.2.3`.
8. The spec artifact version is `0.5.1+oscal.1.2.3`. Semantic Versioning lets a `0.y.z` version change anything.

## Goals / Non-Goals

**Goals:**

1. A binding can bound the memory and the time of a parse of untrusted input, and still conform.
2. A caller can tell from a parse error that a limit stopped the parse, and which limit it was.
3. One rule covers each parse operation, for JSON and for YAML.
4. A parse error that lists failures lists each failure, or 100 or more and states that the list is incomplete.

**Non-Goals:**

1. A minimum value for a limit on bytes, depth, or alias expansion.
   [D2](#d2-the-contract-allows-limits-and-sets-no-minimum-for-the-input) has the reason.
2. A corpus case for a limit value that a binding chooses. Such a value is binding-defined, so the corpus cannot state
   one expected result for each binding ([VER-007]). The floor of [PRS-011] and [PRS-012] is the same for each binding,
   so it gets a case ([D3](#d3-the-entry-floor-is-100-and-no-limit-goes-below-it)).
3. Element validation. [ELV-001] lists each failing location of an element, so it has the same growth as [PRS-006].
   The caller passes an element value that is already in memory, and #24 covers parse input only. A follow-up issue
   can cover it.
4. A new error category, or a fixed form for the limit identification or the incomplete-list statement.
5. A rule on when a limit acts inside a parse. The contract states what the parse error shows, not the order of the
   steps of a binding.
6. A change to a binding.

## Decisions

### D1. One requirement covers each parse operation

[PRS-010] defines a parse operation in two items. The first item is an operation of `document-parsing`. The second item
is an operation that the contract defines through a parse operation. The definition uses its own term, so it covers a
chain: [YML-005] is defined through the JSON parse operation, and [YML-006] and [YML-007] are defined through
[YML-005]. [YML-011] is retired with `replaced_by: PRS-010`, and its alias scenario becomes [PRS-010.03].

The alternative was a JSON requirement in `document-parsing` and [YML-011] as a short reference to it. The project
rules prohibit a copy of normative content from one spec to another, so that alternative keeps one rule and adds a
second identifier for it. The user chose one requirement.

The cost is that `document-parsing` names a YAML concept in [PRS-010.03]. The scenario is an example of the general
rule, so the capability does not depend on `yaml-documents` for its meaning.

### D2. The contract allows limits and sets no minimum for the input

[PRS-010] allows a limit and does not require one. It sets no minimum for bytes, depth, or alias expansion. The YAML
change made the same choice for [YML-011], because the store cannot justify one number for each binding and each use.
That reason applies to JSON input too.

The corpus gives a floor in practice. A binding must parse each valid corpus document, so a limit on bytes must admit
22,092 bytes. A binding that sets a limit below a corpus document fails that case and does not conform.

The alternative was a minimum, for example 100 MiB of input. A minimum protects a caller that has large documents. It
also stops a binding from a lower limit that its use needs, for example a service that accepts only small uploads.

### D3. The entry floor is 100, and no limit goes below it

[PRS-011] lets a binding document a limit that counts failures, with a floor of 100 entries. A limit on validation
time can otherwise give a short list and avoid the floor. [PRS-012] closes that path, because it states the floor for
each parse error that carries entries ([D9](#d9-the-parse-error-shows-each-short-list)). Each rule counts structured
entries, not failing locations, because one location can give more than one entry (context item 6).

The number 100 is a policy choice. The precedent of
[D2](#d2-the-contract-allows-limits-and-sets-no-minimum-for-the-input) rejected a minimum on the input, because a
minimum limits a binding in a way that the store cannot justify. A floor on entries does not limit the input. Its cost
is fixed: 100 entries use about 70 to 120 KB of heap (context item 6). The floor keeps the purpose of [ERR-003]: a
caller sees many failures, not only the first. It keeps [PRS-006.01] and each `expected-min-failures` value true, and
[ERR-003.01] holds when the parse error identifies no limit.

The floor applies to each binding, so the corpus can test it. A new case, `parse/many-failures`, has a catalog with 101
properties that have only a `name`. Each property fails at one location, so the failures give 101 entries or more, and
the case sets `expected-min-failures` to 100. A binding could reject the input of 3 KB for a limit, with no entries.
That binding also rejects the valid corpus documents of up to 22 KB, so it fails the corpus, as
[D2](#d2-the-contract-allows-limits-and-sets-no-minimum-for-the-input) states for a byte limit. A limit on time can
reject the input on a slow machine. That is a choice of the binding (Risk 4). The case cites [PRS-012.01]. The store's
check counts 116 errors for this input under the complete schema (context item 5), so a change to the input is checked
under the catalog schema, which gives 101.

The alternatives were these:

1. A floor of 1. A binding could then stop at the first failure, which [ERR-003] exists to prevent. A binding with a
   limit of 1 also fails `parse/two-failures`, so the prose and the corpus would disagree.
2. No floor. A limit of 0 removes [PRS-006] in effect.
3. A floor of 2, the highest `expected-min-failures` value. That ties the prose to the current corpus and gives a
   caller little more than one entry.
4. A floor in [PRS-011] only. A binding could then avoid the floor with another limit.
5. A floor with no exception: "the parse error carries 100 entries or more". A byte limit rejects an input before it
   reads the input, so it has no entries, and that rule forbids a byte limit on an invalid document. [PRS-012] lets a
   parse error over a limit carry no entries.
6. A rule that only the entry limit can stop schema validation after validation starts. That rule depends on the order
   of the steps inside a binding, which a caller cannot see.

### D4. At the entry limit, the binding chooses which entries to keep and can stop

[PRS-011] requires as many entries as the limit, and [PRS-012] requires a statement that the list is incomplete. They
do not say which
entries to keep, and they do not require a count of the omitted entries. A validator does not always report failures
in document order, so a rule for "the first entries" needs a definition of order that each validator must follow. A
count requires that the binding keeps validating after the limit. That bounds memory but not time, and context item 6
shows that time is a risk too.

A binding can stop at the limit. It then cannot know whether more failures follow. [PRS-011.03] lets the parse error
state that the list is incomplete when it carries exactly as many entries as the limit.

### D5. The parse error identifies the limit, in the parse-error category

An input over a limit is a parse error, as [YML-011] states for YAML. [PRS-010] adds that the parse error identifies
the limit. A caller can then tell "the binding stopped" from "the document is not valid", for example to choose a
different response for each. The form of the identification is binding-defined, as the detail format of [PRS-006] is.

The alternative was a new error category in [ERR-001]. A new category changes the taxonomy that each binding maps to,
and a caller that handles each parse error the same way must then handle one more category.

### D6. The documentation names what a limit measures and where it applies

A YAML input and its JSON text of [YML-005] can have very different sizes. The contract does not choose which one a
size limit measures. [PRS-010] requires the documentation of each limit to name what it measures and the operations
that it applies to. [YML-005] refers to [PRS-010] for an input over a documented limit. [YML-005.05] shows a YAML byte
limit that the JSON text does not exceed.

The alternative was a fixed measure, for example "bytes of the input as the caller passes it". A fixed measure fits a
byte limit only, and it does not fit depth, alias expansion, or entries.

### D7. The validity check returns false over a limit that applies to it

[ERR-002] returns true for a conformant document only when the document is within each documented limit that applies
to the validity check. The validity check is not a parse operation of [PRS-010], because it reports no error.
[ERR-002] lets a binding apply a documented limit to the check, and the documentation then names the check. A limit
that the binding documents only for the JSON parse operation does not change the validity check.

A caller often runs the validity check on untrusted input, so a check without limits would bring back the risk that
the limits remove. The alternative was true for each conformant document, which needs a parse without limits.

### D8. The release is a minor increment, under the 0.y.z rule

[VER-003] gives "a stricter parse rule" as an example of a major increment. This change has two effects on a binding
that conforms to the contract now:

1. A binding that documents a limit under [YML-011] must now name the operations that the limit applies to and make
   its parse error identify the limit. If it caps error entries, the cap must allow 100 entries.
2. A binding that cites [YML-011] in its traceability record fails [SRF-004] after it moves its pin, until it cites
   [PRS-010].

A caller also gets weaker guarantees: fewer entries, a parse error for a valid document, or false from the validity
check. Each one happens only when the binding documents a limit, and the parse error identifies the limit.

These effects are a break for some bindings. The release is still a minor increment, because the version is
`0.5.1+oscal.1.2.3` and Semantic Versioning lets a `0.y.z` version change anything (context item 8). The store made
the same choice when it retired [MDL-004] in `v0.2.0+oscal.1.2.3`. A binding with no limit and no citation of
[YML-011] needs no change.

### D9. The parse error shows each short list

[PRS-012] states what a caller sees, for each limit. A parse error that carries entries carries one for each failure,
or carries 100 or more, identifies the limit, and states that the list is incomplete. A parse error over a limit can
also carry no entries. A byte, depth, or alias limit gives that result, and so can a time limit. [PRS-006] and
[ERR-003] refer to [PRS-012], so each short list has the same form, whichever limit made it short.

Context item 6 shows that this bounds the cost. A large valid document validates fast, so a byte limit bounds its
cost. The slow case is a document with many failures, and the entry limit bounds that case, because a binding can stop
at the limit ([D4](#d4-at-the-entry-limit-the-binding-chooses-which-entries-to-keep-and-can-stop)).

The alternative was a rule on when a limit can act inside a parse, for example "only the entry limit stops
validation". That rule depends on the steps inside a binding, which a caller cannot see.

## Risks / Trade-offs

1. [Risk] A binding documents a limit on bytes that admits the corpus but rejects real documents, for example NIST SP
   800-53 rev5. → [PRS-010] makes the binding document the limit, and the parse error identifies it. A caller can then
   choose a binding or a setting that fits its documents.
2. [Risk] A caller reads each entry of a parse error and assumes that the list is complete. → [PRS-012] requires each
   short list to state that it is incomplete, whichever limit made it short.
3. [Risk] "Document" has no fixed place, so a caller must search for the limits of a binding. → [YML-011] and [PRS-007]
   have the same rule. A fixed place, for example a section in the binding README, can come in a later change.
4. [Risk] A binding chooses a limit whose result depends on the machine, for example a limit on validation time, and
   its corpus run then passes on one machine and fails on another. → This is a choice of the binding, and the contract
   does not rule on it. The parse error identifies the limit, so a failure names its cause.
5. [Risk] A validator cannot always stop at a number of entries. For example, ajv with `allErrors: true` collects each
   error before it returns. → A binding that needs the time bound of the entry limit chooses a validator that can stop,
   or validates in parts. This is a binding concern, and the contract only permits the stop.
6. [Trade-off] A floor of 100 entries stops a binding from failing at the first failure. → The memory cost is fixed and
   small ([D3](#d3-the-entry-floor-is-100-and-no-limit-goes-below-it)). A binding can still stop validating at the
   limit ([D4](#d4-at-the-entry-limit-the-binding-chooses-which-entries-to-keep-and-can-stop)).

## Migration Plan

1. The change syncs into the main specs and is archived in one pull request. The ledger and the requirement index
   change in the sync commit. The corpus case `parse/many-failures` comes after the sync, so that the scenario that
   it cites is in the main specs when the case lands.
2. The release that carries this change sets `VERSION` with at least a minor increment
   ([D8](#d8-the-release-is-a-minor-increment-under-the-0yz-rule)).
3. A binding moves its pin and runs the new corpus case. A binding with no limit and no citation of [YML-011] needs no
   other change. A binding that cites [YML-011] changes the citation to [PRS-010]. A binding that documents a limit
   adds what the limit measures, the operations that it applies to, and the identification of the limit in its parse
   error.
4. Rollback: a binding keeps its old pin. The release changes no name or schema file, and it adds one corpus case.
