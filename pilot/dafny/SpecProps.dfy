/*
 * Properties that the specification must have if it says what the prose says. Not used by the implementation.
 * CNS-017: "An entry SHALL give at most one failure for one location."
 */
include "Spec.dfy"

module SpecProps {
  import opened Spec

  ghost predicate DistinctPaths(ns: seq<Node>) {
    forall a, b :: 0 <= a < b < |ns| ==> ns[a].path != ns[b].path
  }

  lemma DedupDistinct(ns: seq<Node>)
    ensures DistinctPaths(Dedup(ns))
    decreases |ns|
  {
    if |ns| > 0 {
      var pre := ns[..|ns| - 1];
      var last := ns[|ns| - 1];
      DedupDistinct(pre);
      var d := Dedup(pre);
      if last.path !in PathsOf(d) {
        forall a, b | 0 <= a < b < |d + [last]| ensures (d + [last])[a].path != (d + [last])[b].path {
          if b == |d| { assert d[a] in d; assert d[a].path in PathsOf(d); }
        }
      }
    }
  }

  // The locations of the failures of one entry over a list of distinct nodes are distinct.
  lemma NodeFailuresDistinct(es: seq<Entry>, doc: Json, i: nat, ns: seq<Node>)
    requires i < |es| && DistinctPaths(ns)
    ensures forall a, b :: 0 <= a < b < |NodeFailures(es, doc, i, ns)| ==>
              NodeFailures(es, doc, i, ns)[a].location != NodeFailures(es, doc, i, ns)[b].location
    ensures forall f :: f in NodeFailures(es, doc, i, ns) ==> exists n :: n in ns && n.path == f.location
    decreases |ns|
  {
    if |ns| > 0 {
      var pre := ns[..|ns| - 1];
      var last := ns[|ns| - 1];
      assert DistinctPaths(pre);
      NodeFailuresDistinct(es, doc, i, pre);
      var fs := NodeFailures(es, doc, i, pre);
      var nf := NodeFailure(es, doc, i, last);
      assert NodeFailures(es, doc, i, ns) == fs + nf;
      if |nf| == 1 {
        forall a | 0 <= a < |fs| ensures fs[a].location != last.path {
          assert fs[a] in fs;
          var n :| n in pre && n.path == fs[a].location;
          var k :| 0 <= k < |pre| && pre[k] == n;
          assert pre[k] == ns[k];
        }
        forall f | f in fs + nf ensures exists n :: n in ns && n.path == f.location {
          if f in nf { assert last in ns; } else {
            var n :| n in pre && n.path == f.location; assert n in ns;
          }
        }
      } else {
        forall f | f in fs ensures exists n :: n in ns && n.path == f.location {
          var n :| n in pre && n.path == f.location; assert n in ns;
        }
      }
    }
  }

  // CNS-017: the failures of one entry have pairwise different locations.
  lemma AtMostOneFailurePerLocation(es: seq<Entry>, doc: Json, i: nat)
    requires i < |es|
    ensures forall a, b :: 0 <= a < b < |EntryFailures(es, doc, i)| ==>
              EntryFailures(es, doc, i)[a].location != EntryFailures(es, doc, i)[b].location
  {
    DedupDistinct(TargetsOfAll(es[i], ContextNodes(es[i], doc)));
    NodeFailuresDistinct(es, doc, i, Targets(es[i], doc));
  }
}
