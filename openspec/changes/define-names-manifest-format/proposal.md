## Why

The model-derivation capability promises one type identity for each OSCAL type in every language binding, through a
naming manifest (`names.json`). Phase 1 shipped only a placeholder (cairn-proofs/oscal-bindings-specs#7). The obvious
format, the Python post-processor's naming maps written out as data, does not keep that promise:

1. The maps use datamodel-codegen class names as keys, for example `OscalCompleteOscalProfileMerge1`. Those names are
   Python tooling, not OSCAL.
2. About 113 public Python type names do not come from a schema definition. They come from inline objects, enum sites,
   and union branches, and the generator names them with ordinals: `Type3`, `Status1`, `ProfileGroup1`, `Parties1`.
   The ordinals depend on the generator's walk order.
3. The generator merges structurally equal inline schemas and keeps no record of it.

A manifest that records these names makes generator ordinals part of a cross-language contract. Each binding then must
copy names that have no meaning in OSCAL, and a later fix is a breaking change. The fix costs least now, before the
second binding (cairn-proofs/oscal-bindings-python#17) consumes the manifest.

## What Changes

1. Define the naming rules from OSCAL's own name scopes, not from a code generator:
   1. A definition keeps its local name. Two definitions with the same local name in different modules both get a
      module prefix.
   2. An inline type is named from the canonical name of its parent type plus its own local name.
   3. An enum is named from the canonical name of its owner type plus its property name. All 53 enum sites get a type,
      and each is marked open (`anyOf`) or closed (`allOf`).
   4. A union branch is named from the union's name plus the property that only that branch has.
   5. The "single item or list" form (`mappings`) is a kind of its own.
2. Identify every type by JSON pointers into the complete OSCAL schema. One entry can hold several pointers when the
   schema copies one type into several places.
3. Define the format of `names.json`: the complete, generated table of canonical types. Bindings read only this file.
4. Define the format of `overrides.json`: the only naming data that a person edits. It holds the singular local names
   of list items, explicit merges, and names that replace a rule-derived name.
5. Add a manifest generator to the store's TypeScript tooling. Its inputs are the schema, `overrides.json`, and the
   manifest of the previous OSCAL release, if one exists. CI regenerates the manifest and fails when the result differs
   from the committed file.
6. Pin published names. A name in a released manifest stays the same in later manifests. The rules name only new types.
   CI fails when a released name changes and the version does not mark a breaking change.
7. Publish `names.json` for OSCAL 1.2.3 and release the artifact as `0.2.0+oscal.1.2.3`. The format stays provisional
   until a TypeScript code-generation spike in cairn-proofs/oscal-bindings-python#17 generates compiling types from it.
   This change is archived only after that spike.
8. **BREAKING** for consumers that adopt the manifest. The canonical names differ from the current Python names for
   about 113 types and for the three inline-collision overrides (`SspStatus`, `AssessmentCommonOrigin`,
   `PoamLocalDefinitions`). The Python binding adopts the names in a separate change in its own repo.

## Capabilities

### New Capabilities

- `naming-manifest`: the `names.json` and `overrides.json` formats, type identity by JSON pointer, the generator
  inputs and guards, the regeneration check, and name pinning across releases.

### Modified Capabilities

- `model-derivation`: canonical names for inline types, enums, and union branches. Deduplication by union-branch copy
  and by explicit merge only. Collision handling for definitions. Extra derivation guards. Bindings take type identity
  from the naming manifest.

## Impact

1. Store files:
   1. `manifest/1.2.3/names.json` and `manifest/1.2.3/overrides.json` replace the placeholder `README.md`.
   2. JSON Schemas for both files, under `manifest/`.
   3. A generator and a check script under `scripts/`, with `npm` scripts, and a new step in `npm run check`.
   4. `VERSION` changes to `0.2.0+oscal.1.2.3`.
2. Python repo (separate changes there, not tasks of this change):
   1. cairn-proofs/oscal-bindings-python#16 changes scope. Python consumes `names.json` instead of emitting it, and
      `models.py` changes. The issue needs new acceptance criteria.
   2. The rename is a breaking change for users of the 0.x Python package.
3. Second binding: cairn-proofs/oscal-bindings-python#17 runs the code-generation spike that settles the format.
4. Not in scope: the closed-enum parse rule. Python accepts an out-of-set value for a closed enum, for example
   `how-many: "seven"`, and no corpus case tests it. A separate change adds the rule to `document-parsing` and adds
   corpus cases.
5. Not in scope: vendoring the OSCAL Metaschema sources. People read Metaschema when they write `overrides.json`. The
   generator does not read it.
