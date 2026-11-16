# Proposal

## Why

A binding calls a document valid when it conforms to the vendored JSON Schema. The OSCAL
metaschema also defines 340 constraints, and the JSON Schema enforces only 21 of them. Thus a
binding accepts documents that the OSCAL model rejects. No outside tool closes this gap: no
release of oscal-cli supports OSCAL 1.2.2 or 1.2.3.

## What Changes

1. **BREAKING** A document or an element is valid only when it also meets the constraints of the
   metaschema that can decide validity. The parse operation, the validity check, element
   validation and the back-matter builders apply them. Some documents that parse today then give
   a parse error.
2. The store vendors the metaschema modules of OSCAL 1.2.3, hash-pinned like `schemas/1.2.3/`.
3. The store generates a constraint manifest from the metaschema. Each entry holds RFC 9535
   JSONPath queries and the data that its constraint kind needs. A binding evaluates the
   manifest with an RFC 9535 implementation and does not implement Metapath.
4. The store leaves out each constraint that is defective, and records an issue of
   `usnistgov/OSCAL` as the reason.
5. The store checks the manifest with a reference evaluator of the metaschema constraints. The
   corpus gets one failing input for each constraint that can fail.

## Capabilities

### New Capabilities

1. `constraint-validation`: the vendored metaschema, the constraint manifest, the rule for each
   constraint kind, and when a document or an element meets the manifest.

### Modified Capabilities

1. `document-parsing`: a document that fails a manifest constraint is a parse failure with
   structured detail.
2. `error-model`: a conformant document also meets the constraint manifest, and a constraint
   failure is a parse error.
3. `element-validation`: element validation applies the manifest constraints that an element
   alone can decide.
4. `backmatter-builders`: a builder input is invalid when the element that it gives fails those
   constraints.

## Impact

1. Bindings in each language need an RFC 9535 implementation and the rule for each constraint
   kind. Each binding gets a pin-move issue for the release.
2. The release is a breaking version increment, as [VER-003] states.
3. Three corpus cases break constraints. The valid inputs `number-scalars.yaml` and
   `string-scalars.yaml` need new property names, and the builder case
   `build-hash/algorithm-string` needs a SHA-512 value of the right length.
4. Store tooling gains a manifest generator and a reference evaluator in `scripts/`. They need
   dependencies for XML and for RFC 9535.
5. The defective constraints that the manifest leaves out are reported in [OSCAL#2059],
   [OSCAL#2255], [OSCAL#2259], [OSCAL#2291] and [OSCAL#2301]. Two more defects need a new issue:
   the `allowed-values` constraints on the mapping fields `relationship` and `category` call
   `has-oscal-namespace()` on a node that the function does not accept.
6. This change addresses [issue #65].

[issue #65]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/65
[VER-003]: ../../specs/schema-versioning/spec.md#requirement-ver-003-the-shared-spec-artifact-uses-semantic-versioning-for-its-own-compatibility
[OSCAL#2059]: https://github.com/usnistgov/OSCAL/issues/2059
[OSCAL#2255]: https://github.com/usnistgov/OSCAL/issues/2255
[OSCAL#2259]: https://github.com/usnistgov/OSCAL/issues/2259
[OSCAL#2291]: https://github.com/usnistgov/OSCAL/issues/2291
[OSCAL#2301]: https://github.com/usnistgov/OSCAL/issues/2301
