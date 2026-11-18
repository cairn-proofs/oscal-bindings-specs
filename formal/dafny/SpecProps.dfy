/*
 * ===========================================================================================================
 * Properties of the specification
 * ===========================================================================================================
 *
 * Spec.dfy DEFINES the failures. This file PROVES that the definition has a property that the prose requires:
 *
 *     CNS-017: "An entry SHALL give at most one failure for one location."
 *
 * Nothing here runs, and the program in Impl.dfy does not use it. Its job is to catch a definition in
 * Spec.dfy that says something the prose does not. If someone changed Spec.dfy so that an entry could fail
 * twice at one place (for example, by removing a Dedup), this file would no longer verify.
 *
 * HOW TO READ A LEMMA
 *
 *   lemma Name(args)
 *     requires A        what we may assume
 *     ensures B         what the lemma proves, for every possible value of the arguments
 *   { ... }             the proof: hints that lead Dafny's solver from A to B
 *
 * You do not need to follow a proof body to trust the result. Dafny checks each step; if a step is wrong,
 * verification fails. Read the `ensures` lines: they are the claims.
 *
 * Other notation used here:
 *   forall a, b :: c ==> d       for all a and b, if c then d
 *   assert c                     a stepping stone: Dafny proves c, then may use it
 *   var n :| c                   pick some n for which c holds (Dafny proves one exists)
 *   forall x | c ensures d { }   prove d for every x with c
 */
include "Spec.dfy"

module SpecProps {
  import opened Spec

  // All nodes of a list have different locations.
  ghost predicate DistinctPaths(ns: seq<Node>) {
    forall a, b :: 0 <= a < b < |ns| ==> ns[a].path != ns[b].path
  }

  // CLAIM: after Dedup, no location appears twice.
  //
  // Proof idea: by induction on the list. Dedup of all but the last node has distinct locations (the claim
  // for the shorter list). Dedup adds the last node only when its location is not there yet, so the result
  // still has distinct locations.
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

  // CLAIM, for one entry and a list of nodes with distinct locations:
  //   1. the failures have pairwise different locations, and
  //   2. every failure is at the location of one of the nodes.
  //
  // Proof idea: by induction on the list. A node gives at most one failure, at its own location. Claim 2 for
  // the shorter list says every earlier failure is at an earlier node's location, and those differ from the
  // last node's location.
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

  // CLAIM (CNS-017): for any manifest, any document and any allowed-values entry, the failures of that entry
  // have pairwise different locations.
  //
  // Proof: the target nodes of an entry come out of Dedup, so they have distinct locations
  // (DedupDistinct); and failures over nodes with distinct locations have distinct locations
  // (NodeFailuresDistinct).
  //
  // Two DIFFERENT entries can still fail at the same location: CNS-008.02 requires a node to give one failure
  // for each closed entry of its applicable set.
  lemma AtMostOneFailurePerLocation(es: seq<Entry>, doc: Json, i: nat)
    requires i < |es|
    ensures forall a, b :: 0 <= a < b < |EntryFailures(es, doc, i)| ==>
              EntryFailures(es, doc, i)[a].location != EntryFailures(es, doc, i)[b].location
  {
    DedupDistinct(TargetsOfAll(es[i], ContextNodes(es[i], doc)));
    NodeFailuresDistinct(es, doc, i, Targets(es[i], doc));
  }
}
