# Review notes

## Consistency

1. **README check list is incomplete.** `README.md`, section Develop, says `npm run check` "runs these checks" and lists
   14 items. The `check` script in `package.json` also runs these steps, which the list does not name:
   `traceability:self-test`, `exclusions:self-test` and `exclusions:check`, `reference:self-test`,
   `constraints:self-test` and `constraints:check`, `content:self-test`, `datatype-rules:self-test`,
   `corpus:self-test`, `corpus:cases:self-test`, `templates:self-test` and `templates:check`, and
   `check:parallel:self-test`. The prose names `constraints:check` and `check:parallel:self-test`, but the numbered
   list does not.
2. **README Layout omits `templates/`.** The Layout list names `openspec/`, `schemas/`, `metaschema/`, `manifest/`,
   `corpus/`, `docs/` and `scripts/`. `templates/binding/` is in the archive and is described only under "Use the
   contract store". The list also does not name `openspec/coverage.json` or `openspec/scenario-checks.yaml`.
3. **Hard-coded release in digest checks.** `schemas:verify` and `metaschema:verify` in `package.json` name
   `1.2.3` directly. The other checks loop over each release. A second OSCAL release would not have its sums checked.
4. **Ledger prefixes without a spec.** `openspec/spec-ids.yaml` keeps `MDL` (`model-derivation`) and `NAM`
   (`naming-manifest`). Neither capability has a directory in `openspec/specs/`, and no requirement uses either prefix.
   This is correct (prefix entries are permanent), but nothing in the ledger says that the capability has no spec. A
   reader can take them for live capabilities, as the earlier version of this summary did.
5. **Partial rename to "contract store".** Commit `9137907` renamed the term in prose. Some script comments and data
   still say "store" alone, for example "Store tooling only" in `metapath.ts` and `metaschema.ts`, and "no store
   script" in `openspec/scenario-checks.yaml`. The meaning is clear, so this is cosmetic.
6. **Line width.** `openspec/config.yaml` asks for 100 columns in OpenSpec artifacts. The root documents wrap at 120.
   The rule applies to artifacts only, so this is not a conflict.

## Completeness

1. `docs/` has no index of which requirements cite each document.
2. `scripts/` has no README. The header comment of each script is the reference. `components.md` gives the map.
3. The active change `openspec/changes/one-badge-in-the-record/` proposes a traceability record format 2 and an
   `implemented-by` value in the ledger. When it is archived, update `data_models.md` (record and ledger),
   `interfaces.md` (sticker, `spec-pin.json`), and `AGENTS.md` if the boundary rules change.
4. `.agents/summary/` is untracked. `.gitignore` ignores `.agents/reviews` and `.agents/tasks` only. Decide whether to
   commit or ignore the summary.
5. `tmp/` holds untracked scratch files and logs. It is ignored.

## Language support

Every content type (TypeScript, POSIX sh, Bash, Markdown, JSON, YAML, XML, GitHub Actions) was read directly. No gap
comes from language support. The analysis read script headers, `package.json`, CI files and data samples. It did not
run `npm run check`, so check behavior is stated from those sources, not from a run.

## Recommendations

1. Fix Consistency items 1 to 3 in one small docs-and-tooling PR. Item 1 could be removed for good by having the
   README point at the `check` script, since `check-parallel.ts` already treats that script as the one list.
2. Add a comment to `openspec/spec-ids.yaml` that marks `MDL` and `NAM` as prefixes with no spec.
3. Keep `AGENTS.md` a pointer document. Do not copy README lists into it.
4. Re-run this summary after a change adds a capability, an OSCAL release, a script, or a new record format.
