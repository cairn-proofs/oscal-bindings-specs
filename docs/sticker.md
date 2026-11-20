# README sticker for bindings

A binding can show this sticker at the top of its README. The sticker has two badges. The first badge shows
the spec artifact version that the binding pins. That version holds the store release and the OSCAL release,
for example `0.8.0+oscal.1.2.3`. The second badge shows the status of a workflow of the binding. It is red
when the workflow fails. [SRF-008] defines the sticker. [SRF-009] defines when a binding can show it.

## Add the sticker

1. Add the file `spec-pin.json` at the root of the repository of the binding. Set `version` to the spec
   artifact version that the binding pins:

   ```json
   { "version": "0.8.0+oscal.1.2.3" }
   ```

2. Add these two lines at the top of the README. Replace each placeholder:

   1. `<owner>/<repo>`: the GitHub owner and the name of the repository of the binding.
   2. `<branch>`: the default branch of the repository.
   3. `<workflow>.yml`: the file name of a workflow that runs the corpus of the pinned version.

   ```markdown
   [![oscal-bindings-specs](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2F<owner>%2F<repo>%2F<branch>%2Fspec-pin.json&query=%24.version&label=oscal-bindings-specs)](https://github.com/cairn-proofs/oscal-bindings-specs)
   [![conformance](https://img.shields.io/github/actions/workflow/status/<owner>/<repo>/<workflow>.yml?branch=<branch>&label=conformance)](https://github.com/<owner>/<repo>/actions/workflows/<workflow>.yml)
   ```

3. Update `spec-pin.json` in the same commit that moves the pin of the binding.

The badges show data that a third-party service, [Shields](https://shields.io), reads from the public
repository of the binding. The store needs no access to that repository.

[SRF-008]: ../openspec/specs/binding-surface/spec.md
[SRF-009]: ../openspec/specs/binding-surface/spec.md
