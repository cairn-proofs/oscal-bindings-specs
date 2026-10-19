# Naming manifest for OSCAL 1.2.3

This directory holds the naming manifest for OSCAL 1.2.3. The naming-manifest capability in `openspec/specs/` defines
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
