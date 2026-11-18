/*
 * ===========================================================================================================
 * The program that computes the failures, and the proof that it is right
 * ===========================================================================================================
 *
 * Spec.dfy DEFINES the failures of a document. This file COMPUTES them. Read Spec.dfy first: this file
 * follows the same sections in the same order, and each method here has the name of a Spec definition with
 * an `I` (for implementation) at the end. For example, `DedupI` computes what `Dedup` defines.
 *
 * THE ONE IDEA TO HOLD ON TO
 *
 * Every method carries a line of the form
 *
 *     ensures out == SpecDefinition(...)
 *
 * Dafny proves that line for every possible input before it compiles anything. So whatever a method does
 * inside, its result equals the Spec definition. You do not need to trust the loops below: you need only
 * read the `ensures` lines.
 *
 * WHY THE CODE DIFFERS FROM THE SPEC
 *
 * Spec.dfy is written to be easy to read, not fast. The program here uses loops, a set and a table, which is
 * how real code is written. Where the program works differently from the spec, Dafny needs help to see that
 * the results are equal; that help is the `invariant`, `assert` and `lemma` lines. Three places differ in a
 * real way, and they are where the proof carries information:
 *
 *   1. VisitAcc   collects descendants into one growing list instead of joining many small lists.
 *   2. DedupI     remembers the locations it has seen in a set instead of searching the list again.
 *   3. CheckAllowedValues  builds a table from each location to the entries that select it, once, instead
 *                 of asking every entry again for every node (the spec's `Applicable`).
 *
 * Everywhere else the program mirrors the spec almost line by line, and the proof is short.
 *
 * HOW TO READ THE PROOF NOTATION
 *
 *   method M(x) returns (out)   A procedure with a result `out`. Unlike a ghost function, it is compiled.
 *   function F(x): T            A compiled function (no `ghost`): it is code that runs.
 *   ensures c                   What Dafny proves about the result, for every input.
 *   requires c                  What the caller must guarantee.
 *   while c invariant I { }     A loop. Dafny proves I holds before the loop and after each pass, so I holds
 *                               when the loop ends. Most invariants here say "what I have so far equals the
 *                               spec applied to the first i items".
 *   assert c                    A stepping stone. Dafny proves c and then uses it.
 *   lemma L ensures c { }       A proved fact, used by calling it like a method. It produces no code.
 *   {:opaque} / reveal          Hides a definition from the solver until a proof `reveal`s it. This keeps
 *                               the solver from getting lost in large formulas; it does not change meaning.
 *
 * RECURRING ASSERTS
 *
 * Many loops contain these two lines:
 *
 *     assert ns[..i + 1][..i] == ns[..i];
 *     assert ns[..i + 1][i] == ns[i];
 *
 * They say "the first i+1 items, minus the last, are the first i items" and "the last of the first i+1 items
 * is item i". That is obvious to a person, but Dafny needs it spelled out to connect the loop, which walks
 * forward, to the spec, which is written from the last item (see "A pattern that repeats" in Spec.dfy).
 */
include "Spec.dfy"

module Impl {
  import opened Spec

  // ---------------------------------------------------------------------------------------------------------
  // Lookup of an object member (Spec section 4: FindKey, Lookup)
  // ---------------------------------------------------------------------------------------------------------

  // Walks the members from the front and returns the first one named k.
  // Invariant: the answer for all members equals the answer for the members not yet looked at.
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

  // The member k of a value, if the value is an object.
  method LookupI(j: Json, k: string) returns (r: Option<Json>)
    ensures r == Lookup(j, k)
  {
    if j.JObj? { r := FindKeyI(j.members, k); } else { r := None; }
  }

  // ---------------------------------------------------------------------------------------------------------
  // Children and descendants (Spec section 4: Children, VisitJ)
  // ---------------------------------------------------------------------------------------------------------

  // The children of a node, built one at a time. Invariant: after i passes, `out` holds the first i children.
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

  // The node and all nodes below it (the spec's VisitJ), added to the end of an existing list `acc`.
  //
  // The spec builds a separate list for each subtree and joins them. This method instead passes ONE list down
  // the tree and adds to it. Its promise, `out == acc + VisitJ(p, j)`, says the result is the same as joining.
  // The proof needs nothing beyond the loop invariants: Dafny knows that joining lists is associative,
  // (a + b) + c == a + (b + c).
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
  // Filters (Spec section 5: OperandValue, JEq, CmpEq, EvalLog, FilterNodes)
  //
  // These mirror the spec one to one. The only difference is that `||` and `&&` stop early when the left side
  // already decides the answer, which gives the same result.
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

  // Keeps the nodes for which the filter is true. Invariant: `out` is the spec's answer for the first i nodes.
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
  // Selectors, segments and queries (Spec section 5: ApplySel, ApplySeg, RunQuery)
  //
  // Each `...AllI` method applies a step to each node of a list with a loop; the spec does the same with
  // recursion. The invariant of each loop is "the result so far is the spec's result for the first i nodes".
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

  // A descendant segment uses VisitAcc with an empty starting list, which equals the spec's Visit.
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

  // Applies the segments of a query one after another.
  // Invariant: running the remaining segments on `out` gives the same result as running the whole query on
  // the start nodes.
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
  // CNS-006: union of nodes, each location once (Spec section 6: Dedup, RunAll)
  //
  // The spec checks each node against the locations of the list built so far. The program keeps a set,
  // `seen`, of the locations already kept, so the check is one set lookup.
  // ---------------------------------------------------------------------------------------------------------

  // A fact about sets that the solver does not find by itself: adding a node to the end of a list adds
  // exactly its location to the set of locations.
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

  // Removes repeated locations, keeping the first node of each.
  // Invariants: `out` is the spec's Dedup of the first i nodes, and `seen` is exactly the set of locations in
  // `out`. The second invariant is why one set lookup gives the same answer as the spec's search.
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
  // CNS-007 and CNS-024: context nodes and target nodes (Spec section 7)
  //
  // These mirror the spec directly: run the queries, move locations into the document (Rebase), remove
  // repeats.
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
  // CNS-008 and CNS-017: the failures of a document (Spec section 8)
  //
  // This is the part where the program and the spec differ most, so the proof is longest here.
  //
  // The spec defines the applicable set of a node by asking every entry "do you target this location?".
  // Done literally, that recomputes every entry's targets for every node. The program instead:
  //
  //   1. computes the target nodes of each entry once, into `tg`;
  //   2. builds a table `app` from each location to the list of entries that target it;
  //   3. for each target node, reads its applicable set from the table.
  //
  // The proof shows that the table holds exactly the applicable sets. It is stated by two predicates,
  // TableUpTo (the table after i entries are added) and TableMid (the table while entry i is being added),
  // and a few small lemmas that each prove one step.
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

  // Unpacks TableUpTo for one location p and one entry j. (The predicate is opaque; see the header.)
  lemma TableAt(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, p: Path, j: nat)
    requires i <= |tg| && TableUpTo(app, tg, i)
    ensures (p in app && j in app[p]) <==> (j < i && p in PathsOf(tg[j]))
  { reveal TableUpTo(); }

  // The empty table is correct before any entry is added.
  lemma TableEmpty(tg: seq<seq<Node>>)
    ensures TableUpTo(map[], tg, 0)
  { reveal TableUpTo(); }

  // Unpacks TableMid for one location and one entry.
  lemma TableMidAt(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, m: nat, p: Path, j: nat)
    requires i < |tg| && m <= |tg[i]| && TableMid(app, tg, i, m)
    ensures (p in app && j in app[p]) <==> ((j < i && p in PathsOf(tg[j])) || (j == i && p in PathsOf(tg[i][..m])))
  { reveal TableMid(); }

  // A table that is correct after i entries is also correct "entry i, with 0 of its nodes added".
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

  // When all nodes of entry i are added, the table is correct after i + 1 entries.
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

  // Every entry number in the table is a real entry (less than i), so it is safe to look it up.
  lemma TableBound(app: map<Path, seq<nat>>, tg: seq<seq<Node>>, i: nat, p: Path)
    requires i <= |tg| && TableUpTo(app, tg, i) && p in app
    ensures forall j :: j in app[p] ==> j < i
  {
    forall j | j in app[p] ensures j < i { TableAt(app, tg, i, p, j); }
  }

  // Whether some entry in the list S lists the value v. This is the spec's ValueListed, for a list of entry
  // numbers read from the table. The long `assert ... by { }` shows that adding one more entry to the part of
  // S already checked changes the answer exactly as `||` would.
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

  // THE MAIN METHOD. Its promise is the theorem of this directory: the result equals the spec's Failures.
  // Api.Check calls it.
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
        // The table knows the applicable set of the node: entry i is in it (TableAt), every number in it is a
        // real entry (TableBound), and it is exactly the spec's applicable set (AppIsApplicable).
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

  // The string value of a node, as code. The spec's StrValue is ghost, so the program needs its own copy;
  // the `ensures` line proves the two agree.
  function StrValue'(n: Node): Option<string>
    ensures StrValue'(n) == StrValue(n)
  { if n.val.JStr? then Some(n.val.s) else None }

  // The key fact for step 3: for a node of an entry, the table's list for its location contains exactly the
  // entries of the spec's applicable set. So "some entry in the table's list lists the value" is the same as
  // the spec's ValueListed.
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
