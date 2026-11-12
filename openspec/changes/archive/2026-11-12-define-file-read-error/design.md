# Design

## Context

See proposal.md, Why, for the problem. These facts shape the approach:

1. [ERR-009] makes the categories a tree. D2 of the taxonomy design
   (`openspec/changes/archive/2026-11-12-extend-error-taxonomy-for-limits/design.md`) adds a new
   situation to an existing category only when it is the same kind of failure. Otherwise the
   situation gets a new category. The same design rejects a category for "the operation did not
   finish".
2. [ERR-006] puts a path that does not exist in the not-found category, and the error names the
   path. [ERR-006.02] states that not-found is not a parse error.
3. The Python binding (`_read_oscal_file` in `src/oscal_bindings/v1/parser.py`) checks
   `Path.exists()` first and reports `FileNotFoundError` when it is false. It then reports a read
   failure as `OscalParseError`. On Python 3.12, `Path.exists()` returns false for `ENOENT`,
   `ENOTDIR`, `EBADF`, and `ELOOP`, and raises each other `OSError`, for example `EACCES`. On
   Python 3.14, it returns false for each `OSError`. The TypeScript binding (`parseFile` in `src/parse.ts`) maps
   `ENOENT` and `ENOTDIR` to `NotFoundError` and throws each other error of the platform unchanged.
4. Node `fs.readFileSync` on a directory throws `EISDIR: illegal operation on a directory, read`.
   The message does not name the path, and the `path` field of the error is `undefined`. Python
   `Path.read_bytes` on a directory raises `IsADirectoryError`, whose message names the path.
5. `corpus/1.2.3/README.md` states that the `categories` list of `cases.json` holds each category
   that a portable case can reach. Check 2 of `scripts/check-corpus.ts` fails a listed category with
   no case. Check 6 fails a `parse-file` case whose input path exists.
6. `VERSION` is `0.8.0+oscal.1.2.3`, and the last release is `v0.7.0+oscal.1.2.3`.

## Goals / Non-Goals

**Goals:**

1. Each binding reports the same category for a path that the operation cannot read.
2. A caller can tell which file failed from the error alone.

**Non-Goals:**

1. A change in a binding repository. Each binding changes when it moves its pin.
2. A read failure of an operation other than a file-path parse. No other operation of the contract
   reads a file.

## Decisions

### D1. One new category holds each read failure that is not a missing path

A path that cannot be read is one kind of failure: the operation has no bytes to parse.
The fault is in the file system, not in the content. [ERR-012] puts
these situations in one new category, read error. The category is narrower than "the operation did
not finish", which Context item 1 rejects.

The boundary with not-found is what the platform reports. A path is not-found only when the
platform reports that it does not exist, for example `ENOENT` or `ENOTDIR`. Each other failure to
read the file is a read error. This includes a path that the operation cannot search and a loop of
symbolic links, because the operation cannot tell whether the path exists. A check for existence
before the read can give a different answer on each platform (Context item 3), so the boundary
depends on the result of the read.

1. **Alternative considered: the parse-error category.** The bytes were never read, so no content
   is malformed. A caller that reports a parse error as bad input then reports a permission problem
   as bad content. Rejected.
2. **Alternative considered: the not-found category.** The path exists, so the category is false
   for the caller. Rejected.
3. **Alternative considered: a statement that these situations are outside the taxonomy.** That
   needs an exception in [ERR-001], and the bindings then keep their different results. Rejected.
4. **Alternative considered: one category for each situation.** No caller need in [#41] tells a
   permission failure from an I/O error. A later change can add a subcategory without a change to
   an existing test ([ERR-009]). Rejected.

### D2. Read error is a top-level category, not the parent of not-found

[ERR-012] gives read error no parent and no child. Not-found keeps its place in the tree, so no
error of an existing situation gets a new category.

1. **Alternative considered: read error as the parent of not-found.** That matches the Python
   hierarchy, where `FileNotFoundError` is a subclass of `OSError`. But each not-found error then
   gets a new ancestor, which changes the categories of an existing situation. A caller that wants
   each file failure tests two categories, which is a small cost. Rejected.

### D3. The read error names the path

[ERR-012] requires the path in the error, as [ERR-006] requires it for not-found. Without the rule,
a TypeScript read error for a directory does not name the path (Context item 4). A caller that
parses many files then cannot tell which file failed.

### D4. The corpus tests the directory case

A path that is a directory gives a read error on each platform, and the corpus can hold one. A
permission failure and an I/O error are not portable. A process that runs as an administrator can
read each file. A checkout cannot make an I/O error.

The case `parse-file/directory` has the input `documents/valid` and the category `read-error`. It
cites [ERR-012.01]. The `categories` list gets `read-error`, so check 2 requires the case. Check 6
then depends on the category of a `parse-file` case:

1. `not-found`: the input path does not exist.
2. `read-error`: the input path is a directory.

The `parse-file` operation of `corpus/1.2.3/README.md` states the same two preconditions. Its rule
that the error names the path does not change, so the runner of a binding needs no new step for the
path.

1. **Alternative considered: a new operation for the directory case.** The parse call and the check
   of the path are the same as for not-found. Only the precondition differs. Rejected.

### D5. The release is a minor increment

No situation that the contract defines changes its category. [ERR-012] specifies the result of a
situation that had no category, and the corpus adds a case. [VER-003.04] names a minor increment.
`VERSION` already names the next minor release (Context item 6), so it does not change.

## Risks / Trade-offs

1. [Risk] No corpus case tests a permission failure or an I/O error. → [ERR-012.02] states the
   permission case. Each binding tests it in its own test suite.

[#41]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/41
