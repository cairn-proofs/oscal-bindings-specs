# Tasks

Scope note: this change is phase 1 of the migration plan in design.md. Phases 2 and 3 are separate future changes, each
with its own proposal. These tasks run in the store, `cairn-proofs/oscal-bindings-specs` (issue #1). Tasks 1.2 and 1.3
also touched the Python repo, `cairn-proofs/oscal-bindings-python` (issue #14), to move this change out of it. The
Python repo's phase 1 work is a separate local change in that repo (design.md D8). Task 6.1 creates it.

## 1. Stand up the standalone spec store

- [x] 1.1 Create the standalone repository and register it as an OpenSpec store. Verify `openspec store list` shows the
      new store id.
- [x] 1.2 Move this change directory, including its `.openspec.yaml`, from the Python repo's `openspec/changes/` into
      the store's `openspec/changes/`. Verify `openspec validate "reverse-engineer-oscal-bindings-spec" --strict --store
      <id>` passes. Also verify `openspec list` in the Python repo no longer shows the change.
- [x] 1.3 Remove the identifier rules and the archive guidance from the Python repo's `openspec/config.yaml`. Keep the
      general writing rules. Verify the store's config holds the removed rules (task 1.7).
- [x] 1.4 Lay out the top-level directories: `openspec/`, `schemas/<release>/`, `manifest/<release>/`, and
      `corpus/<release>/`. Verify the tree matches the layout in proposal.md, Impact.
- [x] 1.5 Vendor the active OSCAL release schema bundle into `schemas/<release>/`, byte-for-byte. Record a `sha256` and
      the NIST source URL beside it. Verify the recorded hash matches the vendored file.
- [x] 1.6 Set up the store toolchain in TypeScript on Node. The OpenSpec CLI needs Node, so the store uses one runtime.
      Pin Node and the OpenSpec CLI with mise, and lock npm dependencies with integrity hashes. Add a CI workflow that
      runs the store checks on each pull request. Protect `main` and require that workflow. Verify a clean checkout
      installs with the locked versions only.
- [x] 1.7 Add the spec identifier tooling to the store:
      1. Port `check-spec-ids.ts`, `spec-ids.ts`, and `spec-markdown.ts` from the source project. Remove the
         `liveRequirements` export and the source project's prefixes from the self-test fixtures.
      2. Name the checker command in the identifier rules and the archive guidance in `openspec/config.yaml`.
      3. Run the checker in CI. In CI, set `SPEC_IDS_BASE` to the target branch, so a pull request that removes a
         scenario fails.

      Verify the self-test passes and the checker passes on the empty main specs.

## 2. Record the artifact version

- [x] 2.1 Record the first spec artifact version as a Semantic Version with the OSCAL release as build metadata, per the
      schema-versioning spec. An example is `0.1.0+oscal.1.2.3`. Verify the version string carries the
      `+oscal.<release>` build metadata.

## 3. Resolve the canonical-JSON rules (design Open Question)

- [x] 3.1 Write down the canonical key order and number formatting for round-trip comparison. Record it as a short rule
      document in the store. Verify the rule covers key sort, number formatting, and datetime offset handling. Also
      verify it matches the serialization and document-parsing specs. This unblocks the corpus work in group 4.

## 4. Build the conformance corpus

- [x] 4.1 Assemble the valid-document fixtures, one per OSCAL document type. Pair each with its expected canonical
      round-trip output under the task 3.1 rules. Verify each expected output is in canonical form.
- [x] 4.2 Assemble the invalid-document fixtures, each paired with its expected error category from the error-model
      spec. Verify every error category in the taxonomy has at least one fixture, including the unknown-field, the
      name-keyed-field, and the wrong-document-type cases.
- [x] 4.3 Assemble the element-validation fixtures, each paired with a valid or invalid outcome and the named element
      type. Verify at least one unknown-element-type fixture is present.
- [x] 4.4 Add the known-defect fixture: a name-keyed field that the contract requires a binding to reject. Verify the
      fixture is marked as the case the Python JSON path currently fails, so a port does not mistake it for a Python
      bug.
- [x] 4.5 Add the second known-defect fixture: a datetime with seven fraction digits, which [SER-005.03] requires a
      binding to keep. Verify the fixture is marked as the case the Python binding fails, with a link to
      cairn-proofs/oscal-bindings-python#19.

## 5. Publish the distribution artifact

- [x] 5.1 Sync this change's delta specs into the store's main `openspec/specs/` without archiving the change. In the
      same commit, add the eight prefixes to the store's ledger, each with `next` one above its highest requirement
      number: BMB 4, FAC 5, PRS 9, ELV 4, ERR 4, MDL 10, VER 6, SER 6. Verify `openspec list --specs --store <id>`
      shows the eight capabilities, and the identifier checker passes.
- [x] 5.2 Produce a tagged archive of the store, holding the main specs, schemas, manifest placeholder, and corpus.
      Record its `sha256`. Verify a consumer can fetch the archive by tag and verify the recorded hash.
- [x] 5.3 Verify the release tag is `v` plus the content of `VERSION`, and the archive file name carries the same
      version. The release has one tag only.

## 6. Hand off to the Python repo

- [x] 6.1 After task 5.1, create a local OpenSpec change in the Python repo, for example `add-conformance-runner`. Its
      proposal cites the store's main specs. Its tasks cover only work in the Python repo:
      1. A conformance runner that reads the corpus from the pinned artifact. It verifies parse, serialize, round-trip,
         error-category, and element-validation outcomes against the expected results. It runs with `hatch test`.
      2. The recorded conformance result. The run reports the known-defect fixture from task 4.4 as a known, tracked
         gap, not as an unexpected failure.
      3. A clean-checkout run that fetches the artifact by its recorded hash and does not read the Python repo's
         vendored `schemas/` directory.
      4. A decision on the parked `scripts/check_spec_ids.py` and `tests/test_check_spec_ids.py`. If there is a use,
         such as the per-language OpenSpec tooling in design.md, Open Questions, keep them, declare PyYAML, and add a
         `hatch run` script. If there is no use, delete them.

      Verify `openspec validate --strict` passes for the local change in the Python repo, and its tasks name no store
      work.

## 7. Verify and close phase 1

- [x] 7.1 Verify the Python repo's local change reports its conformance result from a clean checkout, and the only
      failure is the known-defect fixture from task 4.4. This proves one binding can use the artifact, and the store is
      self-contained for phase 1.
- [x] 7.2 Archive this change in the store. If any requirement or scenario changed after task 5.1, update the ledger in
      the archive commit. Verify the store's `openspec/specs/` holds the eight capabilities, and the identifier checker
      passes. Also verify the Python repo has no `openspec/specs/` content for them.
