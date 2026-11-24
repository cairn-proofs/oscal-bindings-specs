# Naming manifest for OSCAL 1.2.3

This directory holds the naming manifest for OSCAL 1.2.3. The contract-store capability in `openspec/specs/` defines
both files.

1. `overrides.json` is the only naming data that a person edits. It holds the singular local name of each list item,
   the names that replace a rule-derived name, and the explicit merges.
2. `names.json` is the generated manifest: one entry for each canonical type, with its kind and the JSON pointers of
   its places in `schemas/1.2.3/oscal_complete_schema.json`. Do not edit it. A binding reads only this file.

To change a name, edit `overrides.json`, run `npm run names:write`, and commit both files. `npm run names:check`
fails when `names.json` differs from the generator output.

The singular local names come from the OSCAL v1.2.3 Metaschema sources (`src/metaschema/` at the tag `v1.2.3` of
`usnistgov/OSCAL`). Each is the `name` or `ref` of the element that holds the `group-as` of the list. Each explicit
merge joins places that reference one `define-flag` in those sources.

The constraint manifest holds the constraints of the OSCAL Metaschema modules that the JSON Schema cannot state. The
constraint-validation capability in `openspec/specs/` defines it, and `constraints.schema.json` is its JSON Schema.
1. `constraints.json` is the generated constraint manifest: one entry for each constraint of
   `metaschema/1.2.3/`, with its kind, its queries, and whether a binding reports its failure. Do not edit it. A
   binding reads only this file.
2. `constraint-exclusions.json` is the list of constraints that the manifest leaves out. `excluded` holds each
   defective constraint with its issue in `usnistgov/OSCAL`. `cannot-fail` holds each constraint that no document can
   fail, with the reason. A person edits this file, and `constraint-exclusions.schema.json` is its JSON Schema.
To change the constraint manifest, edit `constraint-exclusions.json` if needed, run `npm run constraints:write`, and
commit both files. `npm run constraints:check` fails when `constraints.json` differs from the generator output.
