/*
 * Compiled implementation of the allowed-values check, with proofs that it equals the ghost specification in
 * Spec.dfy. Written in the imperative style (loops, accumulators, a set, a map) so that the proof is not just
 * a copy of the specification. Nothing here is trusted: every method ensures equality with a Spec function.
 */
include "Spec.dfy"

module Impl {
  import opened Spec

  // ---------------------------------------------------------------------------------------------------------
  // Lookup of an object member
  // ---------------------------------------------------------------------------------------------------------
  method FindKeyI(ms: seq<Member>, k: string) returns (r: Option<Json>)
    ensures r == FindKey(ms, k)
  {
    var i := 0;
    while i < |ms|
      invariant 0 <= i <= |ms|
      invariant FindKey(ms, k) == FindKey(ms[i..], k)
    {
      if ms[i].key == k {
        assert ms[i..][0].key == k;
        return Some(ms[i].value);
      }
      assert ms[i..][1..] == ms[i + 1..];
      i := i + 1;
    }
    assert ms[i..] == [];
    return None;
  }

  method LookupI(j: Json, k: string) returns (r: Option<Json>)
    ensures r == Lookup(j, k)
  {
    if j.JObj? { r := FindKeyI(j.members, k); } else { r := None; }
  }

  // ---------------------------------------------------------------------------------------------------------
  // Children, and the descendants of a node with an accumulator
  // ---------------------------------------------------------------------------------------------------------
  method ChildrenI(n: Node) returns (out: seq<Node>)
    ensures out == Children(n)
  {
    out := [];
    match n.val {
      case JArr(xs) =>
        var i := 0;
        while i < |xs|
          invariant 0 <= i <= |xs| && out == ArrNodes(n.path, xs, i)
        { out := out + [Node(n.path + [SIdx(i)], xs[i])]; i := i + 1; }
      case JObj(ms) =>
        var i := 0;
        while i < |ms|
          invariant 0 <= i <= |ms| && out == ObjNodes(n.path, ms, i)
        { out := out + [Node(n.path + [SKey(ms[i].key)], ms[i].value)]; i := i + 1; }
      case _ =>
    }
  }

  // The descendants-or-self of a value, appended to an accumulator.
  method VisitAcc(p: Path, j: Json, acc: seq<Node>) returns (out: seq<Node>)
    ensures out == acc + VisitJ(p, j)
    decreases j
  {
    out := acc + [Node(p, j)];
    match j {
      case JArr(xs) =>
        var i := 0;
        while i < |xs|
          invariant 0 <= i <= |xs|
          invariant out == acc + [Node(p, j)] + VisitArr(p, xs, i)
        {
          out := VisitAcc(p + [SIdx(i)], xs[i], out);
          i := i + 1;
        }
      case JObj(ms) =>
        var i := 0;
        while i < |ms|
          invariant 0 <= i <= |ms|
          invariant out == acc + [Node(p, j)] + VisitObj(p, ms, i)
        {
          out := VisitAcc(p + [SKey(ms[i].key)], ms[i].value, out);
          i := i + 1;
        }
      case _ =>
    }
  }

  // ---------------------------------------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------------------------------------
  method OperandValueI(o: Operand, cur: Node) returns (r: Option<Json>)
    ensures r == OperandValue(o, cur)
  {
    match o {
      case OLit(s) => r := Some(JStr(s));
      case ORel(k) => r := LookupI(cur.val, k);
    }
  }

  function JEqI(a: Json, b: Json): bool
    ensures JEqI(a, b) == JEq(a, b)
  {
    match a
    case JNull => b.JNull?
    case JBool(x) => b.JBool? && x == b.b
    case JNum(x) => b.JNum? && x == b.lexeme
    case JStr(x) => b.JStr? && x == b.s
    case _ => false
  }

  function CmpEqI(a: Option<Json>, b: Option<Json>): bool
    ensures CmpEqI(a, b) == CmpEq(a, b)
  {
    match (a, b)
    case (None, None) => true
    case (Some(x), Some(y)) => JEqI(x, y)
    case _ => false
  }

  method EvalLogI(e: LogExpr, cur: Node) returns (r: bool)
    ensures r == EvalLog(e, cur)
    decreases e
  {
    match e {
      case LOr(l, rr) =>
        r := EvalLogI(l, cur);
        if !r { r := EvalLogI(rr, cur); }
      case LAnd(l, rr) =>
        r := EvalLogI(l, cur);
        if r { r := EvalLogI(rr, cur); }
      case LNot(x) =>
        r := EvalLogI(x, cur);
        r := !r;
      case LExists(k) =>
        var v := LookupI(cur.val, k);
        r := v.Some?;
      case LEq(a, b) =>
        var va := OperandValueI(a, cur);
        var vb := OperandValueI(b, cur);
        r := CmpEqI(va, vb);
    }
  }

  method FilterNodesI(f: LogExpr, ns: seq<Node>) returns (out: seq<Node>)
    ensures out == FilterNodes(f, ns)
  {
    out := [];
    var i := 0;
    while i < |ns|
      invariant 0 <= i <= |ns| && out == FilterNodes(f, ns[..i])
    {
      var b := EvalLogI(f, ns[i]);
      assert ns[..i + 1][..i] == ns[..i];
      assert ns[..i + 1][i] == ns[i];
      if b { out := out + [ns[i]]; }
      i := i + 1;
    }
    assert ns[..i] == ns;
  }

  // ---------------------------------------------------------------------------------------------------------
  // Selectors, segments, queries
  // ---------------------------------------------------------------------------------------------------------
  method ApplySelI(s: Selector, n: Node) returns (out: seq<Node>)
    ensures out == ApplySel(s, n)
  {
    match s {
      case SelName(k) =>
        var v := LookupI(n.val, k);
        match v {
          case Some(x) => out := [Node(n.path + [SKey(k)], x)];
          case None => out := [];
        }
      case SelWild => out := ChildrenI(n);
      case SelIndex(i) =>
        if n.val.JArr? && i < |n.val.items| { out := [Node(n.path + [SIdx(i)], n.val.items[i])]; } else { out := []; }
      case SelFilter(f) =>
        var cs := ChildrenI(n);
        out := FilterNodesI(f, cs);
    }
  }

  method ApplySelAllI(s: Selector, ns: seq<Node>) returns (out: seq<Node>)
    ensures out == ApplySelAll(s, ns)
  {
    out := [];
    var i := 0;
    while i < |ns|
      invariant 0 <= i <= |ns| && out == ApplySelAll(s, ns[..i])
    {
      var r := ApplySelI(s, ns[i]);
      assert ns[..i + 1][..i] == ns[..i];
      assert ns[..i + 1][i] == ns[i];
      out := out + r;
      i := i + 1;
    }
    assert ns[..i] == ns;
  }

  method ApplySegI(g: Segment, n: Node) returns (out: seq<Node>)
    ensures out == ApplySeg(g, n)
  {
    match g {
      case Child(s) => out := ApplySelI(s, n);
      case Desc(s) =>
        var vis := VisitAcc(n.path, n.val, []);
        assert vis == Visit(n);
        out := ApplySelAllI(s, vis);
    }
  }

  method ApplySegAllI(g: Segment, ns: seq<Node>) returns (out: seq<Node>)
    ensures out == ApplySegAll(g, ns)
  {
    out := [];
    var i := 0;
    while i < |ns|
      invariant 0 <= i <= |ns| && out == ApplySegAll(g, ns[..i])
    {
      var r := ApplySegI(g, ns[i]);
      assert ns[..i + 1][..i] == ns[..i];
      assert ns[..i + 1][i] == ns[i];
      out := out + r;
      i := i + 1;
    }
    assert ns[..i] == ns;
  }

  method RunQueryI(q: Query, ns: seq<Node>) returns (out: seq<Node>)
    ensures out == RunQuery(q, ns)
  {
    out := ns;
    var i := 0;
    while i < |q|
      invariant 0 <= i <= |q| && RunQuery(q, ns) == RunQuery(q[i..], out)
    {
      out := ApplySegAllI(q[i], out);
      assert q[i..][1..] == q[i + 1..];
      i := i + 1;
    }
    assert q[i..] == [];
  }

  // ---------------------------------------------------------------------------------------------------------
  // CNS-006: union of nodes, each location once. The specification keeps a list and searches it; the
  // implementation keeps the set of locations seen so far.
  // ---------------------------------------------------------------------------------------------------------
  lemma PathsOfSnoc(ns: seq<Node>, x: Node)
    ensures PathsOf(ns + [x]) == PathsOf(ns) + {x.path}
  {
    var lhs := PathsOf(ns + [x]);
    var rhs := PathsOf(ns) + {x.path};
    forall p ensures p in lhs <==> p in rhs {
      if p in lhs {
        var n :| n in ns + [x] && n.path == p;
        if n == x { } else { assert n in ns; }
      }
      if p in rhs {
        if p == x.path { assert x in ns + [x]; }
        else { var n :| n in ns && n.path == p; assert n in ns + [x]; }
      }
    }
  }

  method DedupI(ns: seq<Node>) returns (out: seq<Node>)
    ensures out == Dedup(ns)
  {
    var seen: set<Path> := {};
    out := [];
    var i := 0;
    while i < |ns|
      invariant 0 <= i <= |ns|
      invariant out == Dedup(ns[..i])
      invariant seen == PathsOf(out)
    {
      assert ns[..i + 1][..i] == ns[..i];
      assert ns[..i + 1][i] == ns[i];
      if ns[i].path !in seen {
        PathsOfSnoc(out, ns[i]);
        out := out + [ns[i]];
        seen := seen + {ns[i].path};
      }
      i := i + 1;
    }
    assert ns[..i] == ns;
  }

  method RunAllI(qs: seq<Query>, ns: seq<Node>) returns (out: seq<Node>)
    ensures out == RunAll(qs, ns)
  {
    out := [];
    var i := 0;
    while i < |qs|
      invariant 0 <= i <= |qs| && out == RunAll(qs[..i], ns)
    {
      var r := RunQueryI(qs[i], ns);
      assert qs[..i + 1][..i] == qs[..i];
      assert qs[..i + 1][i] == qs[i];
      out := out + r;
      i := i + 1;
    }
    assert qs[..i] == qs;
  }

  // ---------------------------------------------------------------------------------------------------------
  // CNS-007: context nodes and target nodes
  // ---------------------------------------------------------------------------------------------------------
  method ContextNodesI(e: Entry, doc: Json) returns (out: seq<Node>)
    ensures out == ContextNodes(e, doc)
  {
    var all := RunAllI(e.docContext, [Node([], doc)]);
    out := DedupI(all);
  }

  method RebaseI(c: Node, ns: seq<Node>) returns (out: seq<Node>)
    ensures out == Rebase(c, ns)
  {
    out := [];
    var i := 0;
    while i < |ns|
      invariant 0 <= i <= |ns| && out == Rebase(c, ns[..i])
    {
      assert ns[..i + 1][..i] == ns[..i];
      assert ns[..i + 1][i] == ns[i];
      var n := ns[i];
      if |n.path| >= 1 && n.path[0] == SIdx(0) { out := out + [Node(c.path + n.path[1..], n.val)]; }
      i := i + 1;
    }
    assert ns[..i] == ns;
  }

  method TargetsOfI(e: Entry, c: Node) returns (out: seq<Node>)
    ensures out == TargetsOf(e, c)
  {
    var raw := RunAllI(e.target, [Node([], JArr([c.val]))]);
    var rb := RebaseI(c, raw);
    out := DedupI(rb);
  }

  method TargetsI(e: Entry, doc: Json) returns (out: seq<Node>)
    ensures out == Targets(e, doc)
  {
    var cs := ContextNodesI(e, doc);
    var all: seq<Node> := [];
    var i := 0;
    while i < |cs|
      invariant 0 <= i <= |cs| && all == TargetsOfAll(e, cs[..i])
    {
      var t := TargetsOfI(e, cs[i]);
      assert cs[..i + 1][..i] == cs[..i];
      assert cs[..i + 1][i] == cs[i];
      all := all + t;
      i := i + 1;
    }
    assert cs[..i] == cs;
    out := DedupI(all);
  }

  // ---------------------------------------------------------------------------------------------------------
  // CNS-008 and CNS-017: the failures of a document.
  //
  // The specification recomputes, for each target node, the applicable set by testing every entry. The
  // implementation computes the target nodes of each entry once, builds a table from each location to the
  // entries that select it, and reads the applicable set of a node from the table.
  // ---------------------------------------------------------------------------------------------------------

  // The table holds, for each location, exactly the entries j < i whose target nodes include it.
  ghost predicate {:opaque} TableUpTo(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat)
    requires i <= |tg|
  {
    forall p, j: nat :: (p in app && j in app[p]) <==> (j < i && p in PathsOf(tg[j]))
  }

  // The same, while the entry i is being added: its first m target nodes are in the table.
  ghost predicate {:opaque} TableMid(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, m: nat)
    requires i < |tg| && m <= |tg[i]|
  {
    forall p, j: nat :: (p in app && j in app[p]) <==>
      ((j < i && p in PathsOf(tg[j])) || (j == i && p in PathsOf(tg[i][..m])))
  }

  lemma TableAt(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, p: Path, j: nat)
    requires i <= |tg| && TableUpTo(app, tg, i)
    ensures (p in app && j in app[p]) <==> (j < i && p in PathsOf(tg[j]))
  { reveal TableUpTo(); }

  lemma TableEmpty(tg: seq<seq<Node>>)
    ensures TableUpTo(map[], tg, 0)
  { reveal TableUpTo(); }

  lemma TableMidAt(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, m: nat, p: Path, j: nat)
    requires i < |tg| && m <= |tg[i]| && TableMid(app, tg, i, m)
    ensures (p in app && j in app[p]) <==> ((j < i && p in PathsOf(tg[j])) || (j == i && p in PathsOf(tg[i][..m])))
  { reveal TableMid(); }

  lemma TableMidStart(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat)
    requires i < |tg| && TableUpTo(app, tg, i)
    ensures TableMid(app, tg, i, 0)
  {
    reveal TableUpTo();
    reveal TableMid();
    assert tg[i][..0] == [];
    forall p, j: nat ensures (p in app && j in app[p]) <==> ((j < i && p in PathsOf(tg[j])) || (j == i && p in PathsOf(tg[i][..0]))) {
      TableAt(app, tg, i, p, j);
      assert PathsOf(tg[i][..0]) == {};
    }
  }

  // Adding the target node m of the entry i to the table.
  lemma TableMidStep(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, m: nat, app2: map<Path, seq<nat>>)
    requires i < |tg| && m < |tg[i]| && TableMid(app, tg, i, m)
    requires app2 == app[tg[i][m].path := (if tg[i][m].path in app then app[tg[i][m].path] else []) + [i]]
    ensures TableMid(app2, tg, i, m + 1)
  {
    reveal TableMid();
    var n := tg[i][m];
    assert tg[i][..m + 1] == tg[i][..m] + [n];
    PathsOfSnoc(tg[i][..m], n);
    forall p, j: nat ensures (p in app2 && j in app2[p]) <==>
        ((j < i && p in PathsOf(tg[j])) || (j == i && p in PathsOf(tg[i][..m + 1]))) {
      TableMidAt(app, tg, i, m, p, j);
      if p == n.path {
        assert p in app2 && app2[p] == (if p in app then app[p] else []) + [i];
      } else {
        assert (p in app2) == (p in app) && (p in app ==> app2[p] == app[p]);
      }
    }
  }

  lemma TableMidDone(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat)
    requires i < |tg| && TableMid(app, tg, i, |tg[i]|)
    ensures TableUpTo(app, tg, i + 1)
  {
    reveal TableMid();
    reveal TableUpTo();
    assert tg[i][..|tg[i]|] == tg[i];
    forall p, j: nat ensures (p in app && j in app[p]) <==> (j < i + 1 && p in PathsOf(tg[j])) {
      TableMidAt(app, tg, i, |tg[i]|, p, j);
    }
  }

  lemma TableBound(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, p: Path)
    requires i <= |tg| && TableUpTo(app, tg, i) && p in app
    ensures forall j :: j in app[p] ==> j < i
  {
    forall j | j in app[p] ensures j < i { TableAt(app, tg, i, p, j); }
  }

  method ListedI(es: seq<Entry>, S: seq<nat>, v: Option<string>) returns (r: bool)
    requires forall j :: j in S ==> j < |es|
    ensures r == exists j: nat :: j in S && j < |es| && Lists(es[j], v)
  {
    r := false;
    var k := 0;
    while k < |S|
      invariant 0 <= k <= |S|
      invariant r == exists j: nat :: j in S[..k] && j < |es| && Lists(es[j], v)
    {
      assert S[..k + 1][..k] == S[..k];
      assert S[..k + 1][k] == S[k];
      assert S[k] in S;
      if v.Some? && v.v in es[S[k]].values { r := true; }
      assert (exists j: nat :: j in S[..k + 1] && j < |es| && Lists(es[j], v)) <==>
             ((exists j: nat :: j in S[..k] && j < |es| && Lists(es[j], v)) || Lists(es[S[k]], v)) by {
        if exists j: nat :: j in S[..k + 1] && j < |es| && Lists(es[j], v) {
          var j: nat :| j in S[..k + 1] && j < |es| && Lists(es[j], v);
          if j != S[k] { assert j in S[..k]; }
        }
        if Lists(es[S[k]], v) { assert S[k] in S[..k + 1]; }
        if exists j: nat :: j in S[..k] && j < |es| && Lists(es[j], v) {
          var j: nat :| j in S[..k] && j < |es| && Lists(es[j], v);
          assert j in S[..k + 1];
        }
      }
      k := k + 1;
    }
    assert S[..k] == S;
  }

  method CheckAllowedValues(es: seq<Entry>, doc: Json) returns (out: seq<Failure>)
    ensures out == Failures(es, doc)
  {
    // 1. The target nodes of each entry.
    var tg: seq<seq<Node>> := [];
    var i := 0;
    while i < |es|
      invariant 0 <= i <= |es| && |tg| == i
      invariant forall j :: 0 <= j < i ==> tg[j] == Targets(es[j], doc)
    {
      var t := TargetsI(es[i], doc);
      tg := tg + [t];
      i := i + 1;
    }

    // 2. The table from locations to the entries that select them.
    var app: map<Path, seq<nat>> := map[];
    TableEmpty(tg);
    i := 0;
    while i < |es|
      invariant 0 <= i <= |es| && |tg| == |es|
      invariant TableUpTo(app, tg, i)
    {
      TableMidStart(app, tg, i);
      var m := 0;
      while m < |tg[i]|
        invariant 0 <= m <= |tg[i]|
        invariant TableMid(app, tg, i, m)
      {
        var n := tg[i][m];
        var cur := if n.path in app then app[n.path] else [];
        var app2 := app[n.path := cur + [i]];
        TableMidStep(app, tg, i, m, app2);
        app := app2;
        m := m + 1;
      }
      TableMidDone(app, tg, i);
      i := i + 1;
    }

    // 3. The failures.
    out := [];
    i := 0;
    while i < |es|
      invariant 0 <= i <= |es| && |tg| == |es|
      invariant out == FailuresUpTo(es, doc, i)
    {
      var fs: seq<Failure> := [];
      var m := 0;
      while m < |tg[i]|
        invariant 0 <= m <= |tg[i]|
        invariant fs == NodeFailures(es, doc, i, tg[i][..m])
      {
        var n := tg[i][m];
        assert tg[i][..m + 1][..m] == tg[i][..m];
        assert tg[i][..m + 1][m] == n;
        // the table knows the applicable set of the node
        assert n.path in PathsOf(tg[i]) by { assert n in tg[i]; }
        TableAt(app, tg, |es|, n.path, i);
        assert n.path in app && i in app[n.path];
        var listed := false;
        if !es[i].allowOther {
          var S := app[n.path];
          TableBound(app, tg, |es|, n.path);
          listed := ListedI(es, S, StrValue'(n));
          AppIsApplicable(es, doc, tg, app, n);
        }
        if !es[i].allowOther && !listed { fs := fs + [Failure(es[i].id, n.path)]; }
        m := m + 1;
      }
      assert tg[i][..m] == tg[i];
      out := out + fs;
      i := i + 1;
    }
  }

  // The value of a node, computed (the specification's StrValue).
  function StrValue'(n: Node): Option<string>
    ensures StrValue'(n) == StrValue(n)
  { if n.val.JStr? then Some(n.val.s) else None }

  // For a node of the entry i, the table entry of its location is the applicable set of the specification.
  lemma AppIsApplicable(es: seq<Entry>, doc: Json, tg: seq<seq<Node>>, app: map<Path, seq<nat>>, n: Node)
    requires |tg| == |es|
    requires forall j :: 0 <= j < |es| ==> tg[j] == Targets(es[j], doc)
    requires TableUpTo(app, tg, |es|)
    requires n.path in app
    ensures forall j :: j in app[n.path] <==> j in Applicable(es, doc, n.path)
    ensures ValueListed(es, doc, n) <==> exists j: nat :: j in app[n.path] && j < |es| && Lists(es[j], StrValue(n))
  {
    forall j: nat ensures j in app[n.path] <==> j in Applicable(es, doc, n.path) {
      TableAt(app, tg, |es|, n.path, j);
      if j < |es| { assert tg[j] == Targets(es[j], doc); }
    }
  }
}
