/*
 * Ghost specification of the allowed-values kind of the OSCAL constraint manifest.
 *
 * Derived from openspec/specs/constraint-validation (CNS-006, CNS-007, CNS-008, CNS-017, CNS-021) and RFC 9535.
 * Everything below `datatype`s is ghost: it is never compiled. The datatypes are compiled (the harness builds them).
 *
 * Query subset (RFC 9535): segments `[ 'k' ]`, `[ * ]`, `[ n ]`, `[ ?filter ]` as child segments and the same
 * four selectors after `..` as descendant segments; filters with `!`, `||`, `&&`, existence of `@['k']`, and `==`
 * between string literals and `@['k']`. One selector per segment. See REPORT.md for what is outside the subset.
 */
module Spec {

  datatype Option<T> = None | Some(v: T)

  // ---------------------------------------------------------------------------------------------------------
  // JSON values. Object members are an ordered list (document order of the parse). A number is kept as its
  // lexeme: no query of the subset looks at a number.
  // ---------------------------------------------------------------------------------------------------------
  datatype Json =
    | JNull
    | JBool(b: bool)
    | JNum(lexeme: string)
    | JStr(s: string)
    | JArr(items: seq<Json>)
    | JObj(members: seq<Member>)
  datatype Member = Member(key: string, value: Json)

  // A Normalized Path of RFC 9535, as a list of segments, and a node: its location in the root and its value.
  datatype Seg = SKey(k: string) | SIdx(i: nat)
  type Path = seq<Seg>
  datatype Node = Node(path: Path, val: Json)

  // ---------------------------------------------------------------------------------------------------------
  // Query AST (the result of parsing; the parser is outside the claim).
  // ---------------------------------------------------------------------------------------------------------
  datatype Operand = OLit(s: string) | ORel(name: string)          // 'literal' | @['name']
  datatype LogExpr =
    | LOr(l: LogExpr, r: LogExpr)
    | LAnd(l: LogExpr, r: LogExpr)
    | LNot(e: LogExpr)
    | LExists(name: string)                                         // @['name']
    | LEq(a: Operand, b: Operand)
  datatype Selector = SelName(name: string) | SelWild | SelIndex(idx: nat) | SelFilter(f: LogExpr)
  datatype Segment = Child(sel: Selector) | Desc(sel: Selector)
  type Query = seq<Segment>                                         // the segments after `$`

  // One `allowed-values` entry of the manifest (CNS-005, CNS-007, CNS-008). `reportable` is not an input of
  // evaluation (CNS-021); it is not carried.
  datatype Entry = Entry(id: Option<string>, docContext: seq<Query>, target: seq<Query>,
                         values: seq<string>, allowOther: bool)

  // A failure has the id of its entry and a location (CNS-017).
  datatype Failure = Failure(id: Option<string>, location: Path)

  // ---------------------------------------------------------------------------------------------------------
  // JSON structure
  // ---------------------------------------------------------------------------------------------------------

  // The member of an object with a name: the first one (names are unique in I-JSON; not assumed here).
  ghost function FindKey(ms: seq<Member>, k: string): Option<Json> {
    if |ms| == 0 then None
    else if ms[0].key == k then Some(ms[0].value)
    else FindKey(ms[1..], k)
  }

  ghost function Lookup(j: Json, k: string): Option<Json> {
    if j.JObj? then FindKey(j.members, k) else None
  }

  // The children of a node, in order: array elements, or the member values of an object (RFC 9535, 1.1).
  ghost function ArrNodes(p: Path, xs: seq<Json>, k: nat): seq<Node> requires k <= |xs| {
    if k == 0 then [] else ArrNodes(p, xs, k - 1) + [Node(p + [SIdx(k - 1)], xs[k - 1])]
  }
  ghost function ObjNodes(p: Path, ms: seq<Member>, k: nat): seq<Node> requires k <= |ms| {
    if k == 0 then [] else ObjNodes(p, ms, k - 1) + [Node(p + [SKey(ms[k - 1].key)], ms[k - 1].value)]
  }
  ghost function Children(n: Node): seq<Node> {
    match n.val
    case JArr(xs) => ArrNodes(n.path, xs, |xs|)
    case JObj(ms) => ObjNodes(n.path, ms, |ms|)
    case _ => []
  }

  // The node and all its descendants, each node before its descendants, array elements in array order,
  // object members in member order (RFC 9535, 2.5.2.2: the order of object members is not guaranteed, so any
  // fixed order conforms).
  ghost function VisitJ(p: Path, j: Json): seq<Node> decreases j, 1 {
    [Node(p, j)] + match j
      case JArr(xs) => VisitArr(p, xs, |xs|)
      case JObj(ms) => VisitObj(p, ms, |ms|)
      case _ => []
  }
  ghost function VisitArr(p: Path, xs: seq<Json>, k: nat): seq<Node> requires k <= |xs| decreases xs, 0, k {
    if k == 0 then [] else VisitArr(p, xs, k - 1) + VisitJ(p + [SIdx(k - 1)], xs[k - 1])
  }
  ghost function VisitObj(p: Path, ms: seq<Member>, k: nat): seq<Node> requires k <= |ms| decreases ms, 0, k {
    if k == 0 then [] else VisitObj(p, ms, k - 1) + VisitJ(p + [SKey(ms[k - 1].key)], ms[k - 1].value)
  }
  ghost function Visit(n: Node): seq<Node> { VisitJ(n.path, n.val) }

  // ---------------------------------------------------------------------------------------------------------
  // Filter expressions (RFC 9535, 2.3.5)
  // ---------------------------------------------------------------------------------------------------------

  // The value of an operand for the current node; `None` is the RFC's Nothing (an empty nodelist).
  ghost function OperandValue(o: Operand, cur: Node): Option<Json> {
    match o
    case OLit(s) => Some(JStr(s))
    case ORel(k) => Lookup(cur.val, k)
  }

  // Equality of values. Scalars are compared as the RFC says (a number by its lexeme: see REPORT.md).
  // Arrays and objects: deep equality is NOT modeled, it gives false. No query of the subset can reach it.
  ghost predicate JEq(a: Json, b: Json) {
    match a
    case JNull => b.JNull?
    case JBool(x) => b.JBool? && x == b.b
    case JNum(x) => b.JNum? && x == b.lexeme
    case JStr(x) => b.JStr? && x == b.s
    case _ => false
  }

  // `==` of RFC 9535, 2.3.5.2.2: Nothing equals Nothing, and no value equals Nothing.
  ghost predicate CmpEq(a: Option<Json>, b: Option<Json>) {
    match (a, b)
    case (None, None) => true
    case (Some(x), Some(y)) => JEq(x, y)
    case _ => false
  }

  ghost predicate EvalLog(e: LogExpr, cur: Node) decreases e {
    match e
    case LOr(l, r) => EvalLog(l, cur) || EvalLog(r, cur)
    case LAnd(l, r) => EvalLog(l, cur) && EvalLog(r, cur)
    case LNot(x) => !EvalLog(x, cur)
    case LExists(k) => Lookup(cur.val, k).Some?
    case LEq(a, b) => CmpEq(OperandValue(a, cur), OperandValue(b, cur))
  }

  // The nodes of a list for which a filter holds, in order.
  ghost function FilterNodes(f: LogExpr, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then []
    else FilterNodes(f, ns[..|ns| - 1]) + (if EvalLog(f, ns[|ns| - 1]) then [ns[|ns| - 1]] else [])
  }

  // ---------------------------------------------------------------------------------------------------------
  // Selectors, segments, queries (RFC 9535, 2.3 to 2.5)
  // ---------------------------------------------------------------------------------------------------------

  // A selector applied to one node.
  ghost function ApplySel(s: Selector, n: Node): seq<Node> {
    match s
    case SelName(k) =>
      (match Lookup(n.val, k) case Some(v) => [Node(n.path + [SKey(k)], v)] case None => [])
    case SelWild => Children(n)
    case SelIndex(i) =>
      if n.val.JArr? && i < |n.val.items| then [Node(n.path + [SIdx(i)], n.val.items[i])] else []
    case SelFilter(f) => FilterNodes(f, Children(n))
  }

  // A selector applied to each node of a list, concatenated in order.
  ghost function ApplySelAll(s: Selector, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then [] else ApplySelAll(s, ns[..|ns| - 1]) + ApplySel(s, ns[|ns| - 1])
  }

  // A segment applied to one node. A descendant segment applies its selector to the node and to each of its
  // descendants, in visiting order.
  ghost function ApplySeg(g: Segment, n: Node): seq<Node> {
    match g
    case Child(s) => ApplySel(s, n)
    case Desc(s) => ApplySelAll(s, Visit(n))
  }

  ghost function ApplySegAll(g: Segment, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then [] else ApplySegAll(g, ns[..|ns| - 1]) + ApplySeg(g, ns[|ns| - 1])
  }

  // A query run on a nodelist: the segments one after the other. The result can hold a node twice.
  ghost function RunQuery(q: Query, ns: seq<Node>): seq<Node> decreases |q| {
    if |q| == 0 then ns else RunQuery(q[1..], ApplySegAll(q[0], ns))
  }

  // ---------------------------------------------------------------------------------------------------------
  // CNS-006: union of the queries of one entry for one purpose, each node once. A node is its location.
  // ---------------------------------------------------------------------------------------------------------
  ghost function PathsOf(ns: seq<Node>): set<Path> { set n | n in ns :: n.path }

  // Keeps the first node of each location.
  ghost function Dedup(ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then []
    else
      var d := Dedup(ns[..|ns| - 1]);
      if ns[|ns| - 1].path in PathsOf(d) then d else d + [ns[|ns| - 1]]
  }

  ghost function RunAll(qs: seq<Query>, ns: seq<Node>): seq<Node> decreases |qs| {
    if |qs| == 0 then [] else RunAll(qs[..|qs| - 1], ns) + RunQuery(qs[|qs| - 1], ns)
  }

  // ---------------------------------------------------------------------------------------------------------
  // CNS-007: context nodes and target nodes
  // ---------------------------------------------------------------------------------------------------------

  // The context nodes of an entry: its document context queries run on the document.
  ghost function ContextNodes(e: Entry, doc: Json): seq<Node> {
    Dedup(RunAll(e.docContext, [Node([], doc)]))
  }

  // A node of the array that holds only the context node, as a node of the document: `$[0]` is the context node.
  ghost function Rebase(c: Node, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then []
    else Rebase(c, ns[..|ns| - 1]) +
         (var n := ns[|ns| - 1];
          if |n.path| >= 1 && n.path[0] == SIdx(0) then [Node(c.path + n.path[1..], n.val)] else [])
  }

  // The target nodes of one context node: the target queries run on an array that holds only that node.
  ghost function TargetsOf(e: Entry, c: Node): seq<Node> {
    Dedup(Rebase(c, RunAll(e.target, [Node([], JArr([c.val]))])))
  }

  ghost function TargetsOfAll(e: Entry, cs: seq<Node>): seq<Node> decreases |cs| {
    if |cs| == 0 then [] else TargetsOfAll(e, cs[..|cs| - 1]) + TargetsOf(e, cs[|cs| - 1])
  }

  // All target nodes of an entry in a document, each location once.
  ghost function Targets(e: Entry, doc: Json): seq<Node> {
    Dedup(TargetsOfAll(e, ContextNodes(e, doc)))
  }

  // ---------------------------------------------------------------------------------------------------------
  // CNS-008: failure of an allowed-values entry
  // ---------------------------------------------------------------------------------------------------------

  // The value of a target node is the string at the node. A node that holds no string is listed by no entry.
  ghost function StrValue(n: Node): Option<string> { if n.val.JStr? then Some(n.val.s) else None }

  ghost predicate Lists(e: Entry, v: Option<string>) { v.Some? && v.v in e.values }

  // The applicable set of a location: each entry whose target nodes (in this document) include it.
  ghost function Applicable(es: seq<Entry>, doc: Json, p: Path): set<nat> {
    set i | 0 <= i < |es| && p in PathsOf(Targets(es[i], doc))
  }

  // Some entry of the applicable set of the node lists its value.
  ghost predicate ValueListed(es: seq<Entry>, doc: Json, n: Node) {
    exists j :: j in Applicable(es, doc, n.path) && Lists(es[j], StrValue(n))
  }

  // The failures that entry i gives for a node it selects: one when the entry is closed and no entry of the
  // applicable set lists the value (so the node gives one failure for each closed entry of its set).
  ghost function NodeFailure(es: seq<Entry>, doc: Json, i: nat, n: Node): seq<Failure> requires i < |es| {
    if !es[i].allowOther && !ValueListed(es, doc, n) then [Failure(es[i].id, n.path)] else []
  }

  ghost function NodeFailures(es: seq<Entry>, doc: Json, i: nat, ns: seq<Node>): seq<Failure>
    requires i < |es| decreases |ns| {
    if |ns| == 0 then []
    else NodeFailures(es, doc, i, ns[..|ns| - 1]) + NodeFailure(es, doc, i, ns[|ns| - 1])
  }

  ghost function EntryFailures(es: seq<Entry>, doc: Json, i: nat): seq<Failure> requires i < |es| {
    NodeFailures(es, doc, i, Targets(es[i], doc))
  }

  // The failures of the first k entries, in entry order, then target order.
  ghost function FailuresUpTo(es: seq<Entry>, doc: Json, k: nat): seq<Failure> requires k <= |es| decreases k {
    if k == 0 then [] else FailuresUpTo(es, doc, k - 1) + EntryFailures(es, doc, k - 1)
  }

  ghost function Failures(es: seq<Entry>, doc: Json): seq<Failure> { FailuresUpTo(es, doc, |es|) }

  // CNS-017, restricted to allowed-values entries: a document meets the manifest when no entry fails for it.
  ghost predicate Meets(es: seq<Entry>, doc: Json) { Failures(es, doc) == [] }
}
