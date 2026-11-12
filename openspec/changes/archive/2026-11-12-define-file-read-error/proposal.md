# Proposal

## Why

[ERR-006] maps a file-path parse of a path that does not exist to the not-found category. No
category covers a path that exists but that the operation cannot read ([#41]). Examples are a file
that the caller has no permission to read, a path that is a directory, and an I/O error during the
read. [ERR-001] requires one category for each error situation, so these situations are a gap in
the taxonomy.

The bindings fill the gap in different ways. The Python binding reports a parse error. The
TypeScript binding passes the error of the platform through, with no category
([typescript#8]). For a directory, the Node error does not name the path, so a caller cannot tell
which file failed.

## What Changes

1. Change [ERR-001] to list a seventh category, read error.
2. Add [ERR-012] to `error-model`. A file-path parse operation that cannot read the file at a path
   reports the read-error category, unless the platform reports that the path does not exist. The
   error names the path. It is not a parse error and not a not-found error.
3. Add the `read-error` category and one `parse-file` case to `corpus/1.2.3/cases.json`. The input
   of the case is a directory, which every platform can read as a path but not as a file.
4. Change `corpus/1.2.3/README.md` and `scripts/check-corpus.ts`, so that the precondition of a
   `parse-file` case depends on its category. A not-found case has a path that does not exist. A
   read-error case has a path that is a directory.
5. This change does not change `VERSION` and does not tag a release. `VERSION` already names the
   next minor release, `0.8.0+oscal.1.2.3`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

1. `error-model`: change [ERR-001]. Add [ERR-012], the read-error category of a file-path parse.

## Impact

1. `openspec/specs/error-model/spec.md`: after sync.
2. `openspec/spec-ids.yaml`: in the sync commit, `ERR` `next` goes from 12 to 13.
   `npm run requirements:write` adds the entry of [ERR-012] to `openspec/requirements.json`.
3. Corpus: `corpus/1.2.3/cases.json`, `corpus/1.2.3/README.md`, and `scripts/check-corpus.ts`.
4. Bindings, when they move the pin:
   1. The Python binding (`_read_oscal_file` in `src/oscal_bindings/v1/parser.py`) reports a read
      error that names the path, in place of a parse error. Its `exists()` check reports not-found
      for a loop of symbolic links, and on some Python versions for a path that it cannot search.
      The binding reports not-found only when the read reports that the path does not exist.
   2. The TypeScript binding (`parseFile` in `src/parse.ts`) reports a read error that names the
      path, in place of the error of the platform.
5. `VERSION`: no change. It is `0.8.0+oscal.1.2.3`, and the last release is `v0.7.0+oscal.1.2.3`.
6. No change to `document-parsing`, `yaml-documents`, or `document-facade`. [ERR-012] applies to
   each file-path parse operation, as [ERR-006] does.

[#41]: https://github.com/cairn-proofs/oscal-bindings-specs/issues/41
[typescript#8]: https://github.com/cairn-proofs/oscal-bindings-typescript/issues/8
