/*
 * ===========================================================================================================
 * The entry point, and the theorem
 * ===========================================================================================================
 *
 * `Check` is what the JavaScript and Python harnesses call. Its `ensures` line is the main result of this
 * directory:
 *
 *     For EVERY list of allowed-values entries and EVERY JSON document, the failures that `Check` returns
 *     are exactly `Spec.Failures(entries, doc)`: the failures that Spec.dfy defines.
 *
 * Dafny proves this before it compiles anything. `Impl.CheckAllowedValues` carries the same promise, and
 * Impl.dfy holds the proof.
 *
 * What the theorem does NOT cover (see REPORT.md, "Trusted base"):
 *   1. Parser.dfy, which turns manifest text into `Spec.Entry` values. It is not proved.
 *   2. The harness code that turns parsed JSON into `Spec.Json` values.
 *   3. The Dafny compilers to JavaScript and Python, and their runtimes.
 *   4. Whether Spec.dfy says what the prose means. That is checked by review, by the corpus, and by the
 *      properties in SpecProps.dfy.
 *
 * `Main` is empty. It exists because the Dafny translators expect a program to have one.
 */
include "Impl.dfy"
include "Parser.dfy"

module Api {
  import Spec
  import Impl
  import Parser

  method Check(entries: seq<Spec.Entry>, doc: Spec.Json) returns (out: seq<Spec.Failure>)
    ensures out == Spec.Failures(entries, doc)
  {
    out := Impl.CheckAllowedValues(entries, doc);
  }

  method Main() {}
}
