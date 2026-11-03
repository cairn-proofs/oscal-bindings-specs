## Context

See [proposal.md](proposal.md#why) for the motivation. These facts shape the approach:

1. `corpus/1.2.3/cases.json` has three `known-defects` entries, all for `oscal-bindings-python`. The cases
   `round-trip/seven-fraction-digits` and `yaml-round-trip/string-scalars` cite cairn-proofs/oscal-bindings-python#19.
   The case `parse/name-keyed-field` cites cairn-proofs/oscal-bindings-python#6. The top-level `defect-twins` array
   holds one group, the first two cases.
2. `scripts/check-corpus.ts` checks each `known-defects` entry (lines 148 to 151). It also makes sure that each
   defect-twin group has the same set of entries (lines 297 to 320). The script has no self-test mode. The header
   comment lists nine checks and names neither field.
3. Outside `openspec/changes/`, the only tracked links to an individual binding issue are the three `issue` values.
   They are in `cases.json`. Two archived changes cite binding issues in the `owner/repo#N` form, and the Workflow
   follow-up of an active change does the same. CONTRIBUTING.md archives each change in the pull request that
   implements it, so `main` has no active change after a merge.
4. Each store check is a script in `scripts/`. It has a header comment and a `--self-test` mode with in-memory cases.
   Each failure has a `[tag]` prefix, and the script exits with code 1 on failure. `package.json` runs each check in
   the `check` chain, and CI runs only `npm run check`, with full history.
5. `README.md` has no list of implementations. The only binding is `cairn-proofs/oscal-bindings-python`.
6. cairn-proofs/oscal-bindings-python#33 is closed. The binding keeps its expected failures in its own repository and
   does not read `known-defects`.

## Goals / Non-Goals

**Goals:**

1. The store checks enforce [VER-006.01] and [VER-006.02], so that binding-specific data cannot come back by accident.
2. A new binding is in scope of the link check when the README lists it, with no code change.

**Non-Goals:**

1. A general allowlist of case fields in `npm run corpus:check`. That is a wider change than #23 asks for.
2. A check for prose that names a binding defect without a link, as [PRS-005] did. Prose needs a reviewer.
3. A change to the expected result, the input, or the cited requirements of any corpus case.
4. A self-test mode for `scripts/check-corpus.ts`. Task 2.2 checks the new rejections by hand.
5. A change in a binding repository.

## Decisions

### D1. Split the drafted VER-006 into [VER-006] and [VER-007]

Issue #23 drafts one requirement with three scenarios. Its description is longer than 500 characters, and
`openspec validate --strict` fails on that length. The draft also states two behaviors: what the store must not hold,
and what a binding keeps. [VER-006] keeps the store rule, the allowance for known implementations, and the first two
scenarios. [VER-007] holds the binding rule and the drafted third scenario as [VER-007.01]. [VER-006.03] is a new
scenario for the allowance: a README entry with only a repository link and a tracker link passes the checks. The
alternative was to shorten the draft to one requirement under 500 characters. That removes either the list of
prohibited content or the allowance, and both are needed to test the link check.

### D2. Exempt `openspec/changes/`, not only `openspec/changes/archive/`

Issue #23 exempts only `openspec/changes/archive/`. An active change cites binding issues in its proposal, design, and
Workflow follow-up, as this change does. With the narrower scope, each commit before the archive commit fails
`npm run check`. CONTRIBUTING.md archives a change in its own pull request, so on `main` the two scopes give the same
result. [VER-006] states the exemption as "An OpenSpec change MAY name a binding issue". The alternative was to keep the
narrow scope and write binding issues without links in active changes. That conflicts with the project rule that
proposals and designs cite issues.

### D3. A new script, `scripts/check-binding-links.ts`

The link check reads every tracked file, not only the corpus, so it does not belong in `scripts/check-corpus.ts`. The
new script follows the pattern in Context 4:

1. It reads the binding repositories from the links under `## Known implementations` in `README.md`. It also treats
   each GitHub repository named `oscal-bindings-<name>`, other than `oscal-bindings-specs`, as a binding repository.
   The second rule catches a link to a binding that the README does not list yet.
2. It fails when the section is missing or lists no repository.
3. It lists the tracked files with `git ls-files`, and skips each path under `openspec/changes/`. Untracked drafts,
   such as files in `tmp/`, are not store content. It reads each file as UTF-8 text with replacement characters, so a
   fixture that is not UTF-8 does not stop the check.
4. For each binding repository `owner/name`, it fails on `github.com/owner/name/issues/N`, on
   `github.com/owner/name/pull/N`, and on the GitHub reference `owner/name#N`. The match ignores case. A link to
   `github.com/owner/name/issues` with no number is the tracker, and it passes.
5. Each failure names the file, the line, and the link, with the prefix `[binding-links]`.
6. `--self-test` runs in-memory cases. They cover each failing form, the tracker link, a repository link, an exempt
   path under `openspec/changes/`, and a README with no section.

`package.json` gets `binding-links:check` and `binding-links:self-test`, after `corpus:check` in the `check` chain. The
alternative was a fixed list of binding repositories in the script. That needs a code change for each new binding, and
the list duplicates the README.

### D4. Reject the two fields by name in `npm run corpus:check`

The check fails on a case that has the own property `known-defects`, and on an index that has the own property
`defect-twins`. Each message cites [VER-006] and says that each binding keeps its own expected failures. The script
removes the validation of the entries and the defect-twin group check, and removes both fields from its types. The
header comment gets a tenth item for the rejection. The alternative, an allowlist of all case fields, is Non-Goal 1.

### D5. The change needs at least a minor increment

This change does not set `VERSION`. The release that carries it sets the version, and that release can hold other
changes.

[VER-006] and [VER-007] are newly specified behavior, which [VER-003] makes a minor increment. The corpus keeps each
case and each expected result. The exemption in the corpus README covered named bindings only, and the only named
binding now keeps the same exemption in its own repository. No required behavior of a binding becomes stricter, so
the change is not a major increment. The [PRS-005] edit removes text that the requirement itself called "not the
contract", which alone is a patch.

### D6. The README text

1. `README.md` gets `## Known implementations` after `## Use the store`. It is a numbered list. Each entry names the
   binding and its language, and links the repository and the plain issue tracker,
   `https://github.com/cairn-proofs/oscal-bindings-python/issues`. The section states that each binding keeps its own
   expected conformance failures.
2. The check list in `## Develop` gets the link check as item 9, after the corpus check. Items 9 to 11 become 10
   to 12.
3. `corpus/1.2.3/README.md` starts with: a binding conforms when it gives the expected result for each case. A binding
   that fails a case records the expected failure in its own repository ([VER-007]). The optional field list loses
   `known-defects`, and `notes` becomes item 6.

## Risks / Trade-offs

1. [The README does not list a binding, and its name is outside the `oscal-bindings-*` pattern. The link check then
   misses it] → The README is the list of bindings in the store. The review of a new binding adds it there.
2. [The check can flag a binding link that is not about binding state, for example a pull request link]
   → [VER-006] prohibits every such link outside `openspec/changes/`. Put the reference in an OpenSpec change.
3. [The link check depends on the heading `## Known implementations`] → The check fails when the heading is missing.
   A rename therefore cannot switch the check off without notice.
4. [A binding harness that still reads `known-defects` finds no entries and reports failures] → The only binding
   stopped reading the field in cairn-proofs/oscal-bindings-python#33. A binding moves its pin only when it chooses.

## Migration Plan

1. Merge the change. A later release carries it (tasks.md, Workflow follow-up).
2. A binding moves its pin when it chooses. A binding that pins an earlier release is not affected.
3. Rollback: revert the merge commit and release a new version. A published release does not change.
