## Why

A binding that parses untrusted OSCAL JSON cannot bound the resources that a parse uses and still conform (#24). No
requirement lets a binding reject a JSON input for its size, so a binding that rejects a large, valid document breaks
[PRS-001]. [PRS-006] and [ERR-003] require one structured entry for each failing location. The number of entries grows
with the number of invalid items. With the store's own validator, a catalog of 240 KB with 80,000 empty properties
gives 160,000 entries. It uses 106 to 190 MiB of heap and takes 4.6 seconds. A 2 MiB input of the same form did not
complete in five minutes. [YML-011] lets a binding limit the resources of a YAML input, but JSON input has no
equivalent rule.

## What Changes

1. Add [PRS-010] to `document-parsing`. A binding documents each resource limit that it applies to a parse operation,
   with what the limit measures and the operations that it applies to. An input over a documented limit is a parse
   error that identifies the limit, also when the input conforms to the schema. A binding does not reject an input for
   a limit that it does not document. A parse operation is an operation of `document-parsing`, or an operation that
   the contract defines through a parse operation, such as each YAML parse operation.
2. Add [PRS-011] to `document-parsing`. A binding can document a limit on the number of structured entries of a parse
   error. The limit is 100 or more. The limit counts entries.
3. Add [PRS-012] to `document-parsing`. A parse error that carries entries carries one for each failure, or carries
   100 or more, identifies the limit, and states that the list is incomplete. A parse error over a limit can also carry
   no entries, for example after a byte limit.
4. Change [PRS-006], so that the structured detail covers each failure, except as [PRS-012] permits.
5. Remove [YML-011] from `yaml-documents`. [PRS-010] replaces it. The alias-expansion scenario of [YML-011] becomes a
   scenario of [PRS-010]. The ledger records [YML-011] as retired, with `replaced_by: PRS-010`.
6. Change [YML-005], so that it refers to [PRS-010] for an input over a documented limit.
7. Change [ERR-001], item 1, to cite [PRS-010] in place of [YML-011]. Change [ERR-002], so that the validity check
   returns true for a conformant document only when the document is within each documented limit that applies to the
   validity check. Change [ERR-003], so that it refers to [PRS-012].
8. Add the corpus case `parse/many-failures`. Its input fails at 101 locations, and the case expects 100 entries or
   more ([PRS-012.01]).
9. This change does not set `VERSION` and does not tag a release. The release that carries the change is at least a
   minor increment. The change breaks some bindings, and the design gives the reason that a minor increment is
   still correct.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `document-parsing`: add [PRS-010], the documented resource limits of a parse, [PRS-011], the documented limit on
   structured entries, and [PRS-012], the floor of 100 entries for each short list. Change [PRS-006] to
   refer to the entry limit.
2. `yaml-documents`: remove [YML-011], which [PRS-010] replaces. Change [YML-005] to refer to [PRS-010] for an input
   over a documented limit.
3. `error-model`: change [ERR-001], item 1, [ERR-002], and [ERR-003] to agree with [PRS-010] and [PRS-012].

## Impact

1. `openspec/specs/document-parsing/spec.md`, `openspec/specs/yaml-documents/spec.md`, and
   `openspec/specs/error-model/spec.md`: after sync.
2. `openspec/spec-ids.yaml`: in the sync commit, `PRS` `next` goes from 10 to 13, and a `retired` entry for `YML-011`
   names `replaced_by: PRS-010`. `npm run requirements:write` adds the [PRS-010], [PRS-011], and [PRS-012] entries to
   `openspec/requirements.json` and removes the [YML-011] entry.
3. Corpus: a new input `corpus/1.2.3/documents/invalid/many-failures.json` and a new case `parse/many-failures` in
   `corpus/1.2.3/cases.json`. `corpus/1.2.3/README.md` allows an invalid input with one kind of fault repeated. No
   other case changes. Each other `expected-min-failures` value is 2 or less, so it
   holds under the floor of 100.
4. Bindings: a binding that applies no limit and does not cite [YML-011] needs no change, other than to run the new
   case. A binding that documents a limit names what the limit measures and the operations that it applies to, and
   makes its parse error identify the limit. A binding that cites [YML-011] in its traceability record replaces the
   citation with [PRS-010] when it moves its pin, because [SRF-004] does not resolve a retired identifier.
5. `VERSION`: no change. The release that carries this change sets the version.
6. No change to the naming manifest, the schemas, the scripts, or the CI workflow.
