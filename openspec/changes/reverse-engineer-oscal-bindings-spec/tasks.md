# Tasks

Scope note: this change is phase 1 of the migration plan in design.md. Phases 2 and 3 are separate future changes, each
with its own proposal. Two repos take part. The store is `cairn-proofs/oscal-bindings-specs` (issue #1). The Python repo
is `cairn-proofs/oscal-bindings-python` (issue #14). In the Python repo, this change adds only the conformance runner in
task group 6. Its `scripts/postprocess_models.py`, `hatch run generate`, and vendored `schemas/` directory stay as they
are.

## 1. Stand up the standalone spec store

- [x] 1.1 Create the standalone repository and register it as an OpenSpec store. Verify `openspec store list` shows the
      new store id.
- [x] 1.2 Move this change directory, including its `.openspec.yaml`, from the Python repo's `openspec/changes/` into
      the store's `openspec/changes/`. Verify `openspec validate "reverse-engineer-oscal-bindings-spec" --strict --store
      <id>` passes. Also verify `openspec list` in the Python repo no longer shows the change.
- [x] 1.3 Remove the identifier rules and the archive guidance from the Python repo's `openspec/config.yaml`. Keep the
      general writing rules. Verify the store's config holds the removed rules (task 1.7).
- [ ] 1.4 Lay out the top-level directories: `openspec/`, `schemas/<release>/`, `manifest/<release>/`, and
      `corpus/<release>/`. Verify the tree matches the layout in design.md.
- [ ] 1.5 Vendor the active OSCAL release schema bundle into `schemas/<release>/`, byte-for-byte. Record a `sha256` and
      the NIST source URL beside it. Verify the recorded hash matches the vendored file.
- [ ] 1.6 Set up the store toolchain in TypeScript on Node. The OpenSpec CLI needs Node, so the store uses one runtime.
      Pin Node and the OpenSpec CLI with mise, and lock npm dependencies with integrity hashes. Add a CI workflow that
      runs the store checks on each pull request. Protect `main` and require that workflow. Verify a clean checkout
      installs with the locked versions only.
- [ ] 1.7 Add the spec identifier tooling to the store:
      1. Port `check-spec-ids.ts`, `spec-ids.ts`, and `spec-markdown.ts` from the source project. Remove the
         `liveRequirements` export and the source project's prefixes from the self-test fixtures.
      2. Name the checker command in the identifier rules and the archive guidance in `openspec/config.yaml`.
      3. Run the checker in CI. In CI, set `SPEC_IDS_BASE` to the target branch, so a pull request that removes a
         scenario fails.

      Verify the self-test passes and the checker passes on the empty main specs.

## 2. Record the artifact version

- [ ] 2.1 Record the first spec artifact version as a Semantic Version with the OSCAL release as build metadata, per the
      schema-versioning spec. An example is `0.1.0+oscal.1.2.3`. Verify the version string carries the
      `+oscal.<release>` build metadata.

## 3. Resolve the canonical-JSON rules (design Open Question)

- [ ] 3.1 Write down the canonical key order and number formatting for round-trip comparison. Record it as a short rule
      document in the store. Verify the rule covers key sort, number formatting, and datetime offset handling. Also
      verify it matches the serialization and document-parsing specs. This unblocks the corpus work in group 4.

## 4. Build the conformance corpus

- [ ] 4.1 Assemble the valid-document fixtures, one per OSCAL document type. Pair each with its expected canonical
      round-trip output under the task 3.1 rules. Verify each expected output is in canonical form.
- [ ] 4.2 Assemble the invalid-document fixtures, each paired with its expected error category from the error-model
      spec. Verify every error category in the taxonomy has at least one fixture, including the unknown-field, the
      name-keyed-field, and the wrong-document-type cases.
- [ ] 4.3 Assemble the element-validation fixtures, each paired with a valid or invalid outcome and the named element
      type. Verify at least one unknown-element-type fixture is present.
- [ ] 4.4 Add the known-defect fixture: a name-keyed field that the contract requires a binding to reject. Verify the
      fixture is marked as the case the Python JSON path currently fails, so a port does not mistake it for a Python
      bug.

## 5. Publish the distribution artifact

- [ ] 5.1 Sync this change's delta specs into the store's main `openspec/specs/` without archiving the change. In the
      same commit, add the eight prefixes to the store's ledger, each with `next` one above its highest requirement
      number: BMB 4, FAC 5, PRS 9, ELV 4, ERR 4, MDL 10, VER 6, SER 6. Verify `openspec list --specs --store <id>`
      shows the eight capabilities, and the identifier checker passes.
- [ ] 5.2 Produce a tagged archive of the store, holding the main specs, schemas, manifest placeholder, and corpus.
      Record its `sha256`. Verify a consumer can fetch the archive by tag and verify the recorded hash.
- [ ] 5.3 Write the two-axis human-readable tag (`oscal-<release>/spec-<n>`) alongside the SemVer artifact version.
      Verify the tag and the artifact version both resolve to the same archive.

## 6. First conformance runner (Python reference)

- [ ] 6.1 Add a conformance runner to the Python repo that reads the corpus. It verifies parse, serialize, round-trip,
      error-category, and element-validation outcomes against the expected results. Run it with `hatch test` and verify
      it executes against the pinned corpus.
- [ ] 6.2 Record the Python reference's conformance result, including the expected failure on the known-defect fixture
      from task 4.4. Verify the run reports that fixture as a known, tracked gap rather than an unexpected failure.

## 7. Verify and close phase 1

- [ ] 7.1 From a clean checkout, fetch the distribution artifact by its recorded hash and run the Python conformance
      runner against it. Verify the result matches task 6.2. Verify the whole path works without reading from the
      Python repo's vendored `schemas/` directory. This proves the store is self-contained for phase 1.
- [ ] 7.2 Archive this change in the store. If any requirement or scenario changed after task 5.1, update the ledger in
      the archive commit. Verify the store's `openspec/specs/` holds the eight capabilities, and the identifier checker
      passes. Also verify the Python repo has no `openspec/specs/` content for them.
- [ ] 7.3 Decide the future of the Python repo's `scripts/check_spec_ids.py` and `tests/test_check_spec_ids.py`. One
      possible use is the per-language OpenSpec tooling in design.md, Open Questions. If there is a use, keep them,
      declare PyYAML, and add a `hatch run` script. If there is no use, delete them. Verify `hatch run release` passes.
