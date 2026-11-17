/* Entry point of the compiled library: the two things the harness calls, plus an empty Main so that the
   translators accept the program. */
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
