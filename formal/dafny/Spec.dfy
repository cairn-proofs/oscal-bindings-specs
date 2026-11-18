/*
 * ===========================================================================================================
 * Formal specification of the `allowed-values` constraint kind of the OSCAL constraint manifest
 * ===========================================================================================================
 *
 * WHAT THIS FILE IS
 *
 * This file states, in a precise language, which failures a document gives for the `allowed-values` entries
 * of `manifest/<release>/constraints.json`. It is the same rule that the prose of
 * `openspec/specs/constraint-validation/spec.md` states (CNS-006, CNS-007, CNS-008, CNS-017, CNS-024,
 * CNS-025), with the query language of RFC 9535 (JSONPath).
 *
 * The file computes nothing at run time. It only defines things. `Impl.dfy` holds a program that computes the
 * failures, and Dafny proves that the program gives exactly the failures that this file defines
 * (see `Api.Check` in `Api.dfy`). `SpecProps.dfy` proves a property that the prose requires of this
 * definition.
 *
 * HOW TO READ DAFNY (the few constructs this file uses)
 *
 *   datatype T = A(x: int) | B         A type whose values are either `A` with a field `x`, or `B`.
 *                                      `v.A?` is true when `v` is an `A`. `v.x` reads the field.
 *   seq<T>                             A list. `[]` is empty, `[a, b]` has two items, `s + t` joins two
 *                                      lists, `|s|` is the length, `s[i]` is item i (from 0), `s[..k]` is
 *                                      the first k items, `s[1..]` is all items but the first.
 *   set<T>                             A set: no order, no repeats. `x in s` tests membership.
 *   Option<T>                          `Some(v)` holds a value; `None` holds nothing.
 *   ghost function F(x: T): U { e }    A definition: F(x) means the value of e. "ghost" means that the
 *                                      compiler never turns it into code. It exists only to be reasoned about.
 *   ghost predicate P(x: T) { e }      A ghost function whose value is true or false.
 *   requires c                         F is defined only when c holds (for example, an index in range).
 *   decreases e                        Tells Dafny why a recursive definition ends: e gets smaller on each
 *                                      call. It has no effect on the meaning.
 *   match v case A(x) => e1 case B => e2
 *                                      Picks e1 or e2 by the kind of v.
 *   set i | 0 <= i < n && c(i)         The set of each i from 0 to n-1 for which c(i) holds.
 *   exists j :: c(j)                   True when some j makes c(j) true.
 *
 * A PATTERN THAT REPEATS
 *
 * Many definitions below walk a list from its LAST item: the result for a list is the result for all items
 * but the last, followed by the result for the last item. For example:
 *
 *     F([a, b, c]) == F([a, b]) + G(c) == (F([a]) + G(b)) + G(c) == G(a) + G(b) + G(c)
 *
 * So the result is still in list order. This form only makes the proofs in `Impl.dfy` simpler. Read it as
 * "apply G to each item, in order, and join the results".
 *
 * READING ORDER
 *
 *   1. JSON values and nodes.               What a document and a location are.
 *   2. The query language.                  What a manifest query is, after parsing.
 *   3. Manifest entries and failures.       What the manifest gives us, and what we report.
 *   4. Walking a JSON value.                Children and descendants.
 *   5. Filters, selectors, segments.        How a query selects nodes (RFC 9535).
 *   6. Union of queries (CNS-006).          Several queries, each node once.
 *   7. Context and target nodes (CNS-007).  Which nodes an entry looks at.
 *   8. Failures (CNS-008, CNS-017).         When a node fails, and the final answer `Failures`.
 *
 * WHAT IS LEFT OUT
 *
 * Only the part of RFC 9535 that the manifest's `allowed-values` entries use is defined: one selector per
 * segment; selectors `['k']`, `[*]`, `[n]` and `[?filter]`; filters with `!`, `||`, `&&`, `@['k']` and `==`.
 * There are no functions (such as `match()`), no slices, no negative indexes and no `<`. REPORT.md lists
 * the rest of the limits.
 */
module Spec {

  // `Option<T>`: either `Some(v)`, which holds a value v, or `None`, which holds nothing.
  datatype Option<T> = None | Some(v: T)

  // =========================================================================================================
  // 1. JSON VALUES AND NODES
  // =========================================================================================================

  // A JSON value, as a parser gives it.
  //
  // - An object keeps its members in the order of the document, as a list of (key, value) pairs.
  //   Example: {"a": 1, "b": true} is JObj([Member("a", JNum("1")), Member("b", JBool(true))]).
  // - A number keeps its text ("lexeme"), for example "1.0". No query of the manifest compares numbers, so
  //   this file needs no arithmetic.
  datatype Json =
    | JNull
    | JBool(b: bool)
    | JNum(lexeme: string)
    | JStr(s: string)
    | JArr(items: seq<Json>)
    | JObj(members: seq<Member>)
  datatype Member = Member(key: string, value: Json)

  // A location in a document: the RFC 9535 Normalized Path, as a list of steps. Each step is a member name
  // (`SKey`) or an array index (`SIdx`). The empty list is the document itself (`$`).
  //
  // Example: the location `$['catalog']['controls'][0]` is [SKey("catalog"), SKey("controls"), SIdx(0)].
  datatype Seg = SKey(k: string) | SIdx(i: nat)
  type Path = seq<Seg>

  // A node: a value together with its location (RFC 9535, section 1.1). Two nodes are the same node when
  // they have the same location (CNS-024), even if a query reached them by different routes.
  datatype Node = Node(path: Path, val: Json)

  // =========================================================================================================
  // 2. THE QUERY LANGUAGE (after parsing)
  // =========================================================================================================
  //
  // The manifest stores each query as text. `Parser.dfy` turns the text into the values below. The parser is
  // NOT part of what is proved; this file starts from the parsed form.
  //
  // Example: the text  $..['parts'][?@['name'] == 'objective']  becomes
  //
  //     [ Desc(SelName("parts")),
  //       Child(SelFilter(LEq(ORel("name"), OLit("objective")))) ]

  // A value inside a filter: a string literal such as 'objective', or `@['name']`, which means "the member
  // `name` of the node that the filter is testing".
  datatype Operand = OLit(s: string) | ORel(name: string)

  // A filter expression, the part inside `[? ... ]`.
  datatype LogExpr =
    | LOr(l: LogExpr, r: LogExpr)           // l || r
    | LAnd(l: LogExpr, r: LogExpr)          // l && r
    | LNot(e: LogExpr)                      // !e
    | LExists(name: string)                 // @['name']  : true when the tested node has that member
    | LEq(a: Operand, b: Operand)           // a == b

  // A selector picks nodes from one node (RFC 9535, section 2.3):
  //   SelName("k")  is ['k']   the member k
  //   SelWild       is [*]     every child
  //   SelIndex(n)   is [n]     the array element n
  //   SelFilter(f)  is [?f]    every child for which f is true
  datatype Selector = SelName(name: string) | SelWild | SelIndex(idx: nat) | SelFilter(f: LogExpr)

  // A segment applies a selector (RFC 9535, section 2.5):
  //   Child(s)  is  [s]     to the node itself
  //   Desc(s)   is  ..[s]   to the node and to every node below it
  datatype Segment = Child(sel: Selector) | Desc(sel: Selector)

  // A query is its list of segments, without the leading `$`.
  type Query = seq<Segment>

  // =========================================================================================================
  // 3. MANIFEST ENTRIES AND FAILURES
  // =========================================================================================================

  // One `allowed-values` entry of the manifest, with only the fields that decide failures:
  //   id          the `id` of the entry (some entries have none)
  //   docContext  the document context queries: they select the context nodes (CNS-007)
  //   target      the target queries: they select target nodes from each context node (CNS-007)
  //   values      the allowed values
  //   allowOther  true when other values are also allowed (an "open" entry)
  //
  // `reportable` (CNS-021) is left out on purpose: it changes which corpus cases must exist, not which
  // failures a document gives.
  datatype Entry = Entry(id: Option<string>, docContext: seq<Query>, target: seq<Query>,
                         values: seq<string>, allowOther: bool)

  // A failure names its entry and its location (CNS-017).
  datatype Failure = Failure(id: Option<string>, location: Path)

  // =========================================================================================================
  // 4. WALKING A JSON VALUE
  // =========================================================================================================

  // The value of the member `k` of a list of members. If two members have the same name (which I-JSON
  // forbids), the first one counts.
  ghost function FindKey(ms: seq<Member>, k: string): Option<Json> {
    if |ms| == 0 then None
    else if ms[0].key == k then Some(ms[0].value)
    else FindKey(ms[1..], k)
  }

  // The value of the member `k` of a value; None when the value is not an object or has no such member.
  ghost function Lookup(j: Json, k: string): Option<Json> {
    if j.JObj? then FindKey(j.members, k) else None
  }

  // The children of a node, in order (RFC 9535, section 1.1): the elements of an array, or the member values
  // of an object. Each child's location is the parent's location plus one step.
  //
  // Example: the children of Node([], JArr([x, y])) are Node([SIdx(0)], x) and Node([SIdx(1)], y).
  //
  // ArrNodes and ObjNodes build that list for the first k items; Children calls them with all items.
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
    case _ => []                                     // a string, number, boolean or null has no children
  }

  // A node and all the nodes below it, each node before the nodes below it ("pre-order").
  //
  // Example: for {"a": [1]} at `$`, the order is: $, then $['a'], then $['a'][0].
  //
  // RFC 9535 (section 2.5.2.2) does not fix the order of the members of an object. This file uses the order of
  // the document. Any fixed order would do: the failures do not depend on it, because each location is
  // counted once (section 6).
  //
  // VisitJ, VisitArr and VisitObj call each other: VisitJ visits one value, VisitArr the first k elements
  // of an array, and VisitObj the first k members of an object.
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

  // =========================================================================================================
  // 5. FILTERS, SELECTORS, SEGMENTS AND QUERIES (RFC 9535, sections 2.3 to 2.5)
  // =========================================================================================================

  // The value of an operand, for the node that the filter tests (`cur`). `None` is what RFC 9535 calls
  // "Nothing": `@['name']` gives Nothing when the node has no member `name`.
  ghost function OperandValue(o: Operand, cur: Node): Option<Json> {
    match o
    case OLit(s) => Some(JStr(s))
    case ORel(k) => Lookup(cur.val, k)
  }

  // Equality of two values. Two strings are equal when they have the same characters in the same order,
  // with no change of case and no Unicode normalization (CNS-025).
  //
  // Arrays and objects are never equal here. RFC 9535 compares them member by member, but no query of the
  // manifest compares an array or an object, so this file does not define it.
  ghost predicate JEq(a: Json, b: Json) {
    match a
    case JNull => b.JNull?
    case JBool(x) => b.JBool? && x == b.b
    case JNum(x) => b.JNum? && x == b.lexeme
    case JStr(x) => b.JStr? && x == b.s
    case _ => false
  }

  // `==` of RFC 9535 (section 2.3.5.2.2): Nothing equals Nothing, and a value never equals Nothing.
  ghost predicate CmpEq(a: Option<Json>, b: Option<Json>) {
    match (a, b)
    case (None, None) => true
    case (Some(x), Some(y)) => JEq(x, y)
    case _ => false
  }

  // Whether a filter expression is true for the node `cur`.
  //
  // Example: for `!@['ns'] || @['ns'] == 'http://csrc.nist.gov/ns/oscal'`, a node passes when it has no
  // member `ns`, or when its `ns` is that exact string.
  ghost predicate EvalLog(e: LogExpr, cur: Node) decreases e {
    match e
    case LOr(l, r) => EvalLog(l, cur) || EvalLog(r, cur)
    case LAnd(l, r) => EvalLog(l, cur) && EvalLog(r, cur)
    case LNot(x) => !EvalLog(x, cur)
    case LExists(k) => Lookup(cur.val, k).Some?
    case LEq(a, b) => CmpEq(OperandValue(a, cur), OperandValue(b, cur))
  }

  // The nodes of a list for which a filter is true, in their order. (The "walk from the last item" pattern.)
  ghost function FilterNodes(f: LogExpr, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then []
    else FilterNodes(f, ns[..|ns| - 1]) + (if EvalLog(f, ns[|ns| - 1]) then [ns[|ns| - 1]] else [])
  }

  // The nodes that one selector picks from one node.
  ghost function ApplySel(s: Selector, n: Node): seq<Node> {
    match s
    case SelName(k) =>                               // ['k']: the member k, if there is one
      (match Lookup(n.val, k) case Some(v) => [Node(n.path + [SKey(k)], v)] case None => [])
    case SelWild => Children(n)                      // [*]: every child
    case SelIndex(i) =>                              // [i]: the array element i, if there is one
      if n.val.JArr? && i < |n.val.items| then [Node(n.path + [SIdx(i)], n.val.items[i])] else []
    case SelFilter(f) => FilterNodes(f, Children(n)) // [?f]: the children for which f is true
  }

  // One selector applied to each node of a list; the results joined in order.
  ghost function ApplySelAll(s: Selector, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then [] else ApplySelAll(s, ns[..|ns| - 1]) + ApplySel(s, ns[|ns| - 1])
  }

  // The nodes that one segment selects from one node. A child segment `[s]` applies s to the node. A
  // descendant segment `..[s]` applies s to the node and to each node below it, in the order of Visit.
  //
  // Example: `..['parts']` on a control finds the `parts` member of the control, and of every part below it.
  ghost function ApplySeg(g: Segment, n: Node): seq<Node> {
    match g
    case Child(s) => ApplySel(s, n)
    case Desc(s) => ApplySelAll(s, Visit(n))
  }

  // One segment applied to each node of a list; the results joined in order.
  ghost function ApplySegAll(g: Segment, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then [] else ApplySegAll(g, ns[..|ns| - 1]) + ApplySeg(g, ns[|ns| - 1])
  }

  // A whole query: start from a list of nodes, and apply each segment in turn to the result of the one
  // before it (RFC 9535, section 2.1.2).
  //
  // The result can hold the same node more than once. Section 6 removes repeats.
  ghost function RunQuery(q: Query, ns: seq<Node>): seq<Node> decreases |q| {
    if |q| == 0 then ns else RunQuery(q[1..], ApplySegAll(q[0], ns))
  }

  // =========================================================================================================
  // 6. UNION OF QUERIES, EACH NODE ONCE (CNS-006, CNS-024)
  // =========================================================================================================
  //
  // An entry can have several queries for one purpose (for example, several context queries). CNS-006 takes
  // the union of their nodes, each node once, and CNS-024 says two nodes are the same when they have the same
  // location. So we remove every node whose location is already in the list.

  // The set of locations of a list of nodes.
  ghost function PathsOf(ns: seq<Node>): set<Path> { set n | n in ns :: n.path }

  // A list of nodes with repeats removed: for each location, the first node is kept.
  //
  // Example: [n1 at $['a'], n2 at $['b'], n3 at $['a']] becomes [n1, n2].
  ghost function Dedup(ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then []
    else
      var d := Dedup(ns[..|ns| - 1]);
      if ns[|ns| - 1].path in PathsOf(d) then d else d + [ns[|ns| - 1]]
  }

  // Several queries run on the same start nodes; all results joined in order (repeats still present).
  ghost function RunAll(qs: seq<Query>, ns: seq<Node>): seq<Node> decreases |qs| {
    if |qs| == 0 then [] else RunAll(qs[..|qs| - 1], ns) + RunQuery(qs[|qs| - 1], ns)
  }

  // =========================================================================================================
  // 7. CONTEXT NODES AND TARGET NODES (CNS-007, CNS-024)
  // =========================================================================================================
  //
  // Each entry first finds its CONTEXT nodes in the document, then finds TARGET nodes from each context node.
  // The value of each target node is what the entry checks.
  //
  // Example: the entry `oscal-control-part-name` has the context query `$..['controls'][*]` (every control,
  // at any depth) and a target query `$[0]['parts'][?...]['name']` (the name of each OSCAL part of that
  // control).

  // The context nodes of an entry: its document context queries, run on the whole document, repeats removed.
  ghost function ContextNodes(e: Entry, doc: Json): seq<Node> {
    Dedup(RunAll(e.docContext, [Node([], doc)]))
  }

  // Target queries do not run on the document. They run on an array that holds only the context node, so
  // that `$[0]` means "the context node" (CNS-007). The nodes they find therefore have locations inside that
  // small array. Rebase turns each such location into a location in the document (CNS-024): it replaces the
  // leading `[0]` with the location of the context node.
  //
  // Example: context node at $['catalog']['controls'][2]; target found at $[0]['parts'][1]['name'];
  // its location in the document is $['catalog']['controls'][2]['parts'][1]['name'].
  //
  // A location that does not start with `[0]` would be outside the context node; it is dropped. (No
  // manifest query can produce one.)
  ghost function Rebase(c: Node, ns: seq<Node>): seq<Node> decreases |ns| {
    if |ns| == 0 then []
    else Rebase(c, ns[..|ns| - 1]) +
         (var n := ns[|ns| - 1];
          if |n.path| >= 1 && n.path[0] == SIdx(0) then [Node(c.path + n.path[1..], n.val)] else [])
  }

  // The target nodes of one context node: the entry's target queries, run on the array that holds only that
  // context node, moved to document locations, repeats removed.
  ghost function TargetsOf(e: Entry, c: Node): seq<Node> {
    Dedup(Rebase(c, RunAll(e.target, [Node([], JArr([c.val]))])))
  }

  // The target nodes of each context node in a list; joined in order.
  ghost function TargetsOfAll(e: Entry, cs: seq<Node>): seq<Node> decreases |cs| {
    if |cs| == 0 then [] else TargetsOfAll(e, cs[..|cs| - 1]) + TargetsOf(e, cs[|cs| - 1])
  }

  // All target nodes of an entry in a document, each location once.
  //
  // The final Dedup matters: two context nodes can select the same target. For example, a control inside a
  // control: the descendant query `$[0]..['parts']` reaches the inner control's parts from BOTH controls.
  // That part is still one node and gives at most one failure (CNS-017.03, CNS-024.01).
  ghost function Targets(e: Entry, doc: Json): seq<Node> {
    Dedup(TargetsOfAll(e, ContextNodes(e, doc)))
  }

  // =========================================================================================================
  // 8. FAILURES (CNS-008, CNS-025, CNS-017)
  // =========================================================================================================
  //
  // The rule in one paragraph: look at every node that some allowed-values entry targets. Collect every entry
  // that targets that node: this is the node's APPLICABLE SET. If any entry in the set lists the node's value,
  // the node is fine. If none does, each CLOSED entry in the set (allowOther == false) gives one failure for
  // that node. OPEN entries never fail, but the values they list still count.
  //
  // Example (CNS-008.01): a closed entry lists only `assessment`, and an open entry for the same node lists
  // `objective`. A node with the value `objective` gives no failure, because the open entry lists it.

  // The value of a target node: its string. A node that holds a number, boolean, null, array or object has
  // no string value, so no entry lists it. (The schema only puts strings at these targets, so this case does
  // not occur in a document that conforms to the schema.)
  ghost function StrValue(n: Node): Option<string> { if n.val.JStr? then Some(n.val.s) else None }

  // Whether an entry lists a value. `in` compares strings character by character (CNS-025).
  ghost predicate Lists(e: Entry, v: Option<string>) { v.Some? && v.v in e.values }

  // The applicable set of a location: the positions (in the manifest) of every entry whose target nodes, in
  // this document, include that location.
  ghost function Applicable(es: seq<Entry>, doc: Json, p: Path): set<nat> {
    set i | 0 <= i < |es| && p in PathsOf(Targets(es[i], doc))
  }

  // Whether some entry of the node's applicable set lists the node's value.
  ghost predicate ValueListed(es: seq<Entry>, doc: Json, n: Node) {
    exists j :: j in Applicable(es, doc, n.path) && Lists(es[j], StrValue(n))
  }

  // The failure that entry number i gives for one node it targets: one failure when the entry is closed and
  // no entry of the applicable set lists the value; otherwise none.
  ghost function NodeFailure(es: seq<Entry>, doc: Json, i: nat, n: Node): seq<Failure> requires i < |es| {
    if !es[i].allowOther && !ValueListed(es, doc, n) then [Failure(es[i].id, n.path)] else []
  }

  // The failures that entry number i gives for each node of a list; joined in order.
  ghost function NodeFailures(es: seq<Entry>, doc: Json, i: nat, ns: seq<Node>): seq<Failure>
    requires i < |es| decreases |ns| {
    if |ns| == 0 then []
    else NodeFailures(es, doc, i, ns[..|ns| - 1]) + NodeFailure(es, doc, i, ns[|ns| - 1])
  }

  // All failures of entry number i: one check per target node.
  ghost function EntryFailures(es: seq<Entry>, doc: Json, i: nat): seq<Failure> requires i < |es| {
    NodeFailures(es, doc, i, Targets(es[i], doc))
  }

  // The failures of the first k entries: entry 0's failures, then entry 1's, and so on.
  ghost function FailuresUpTo(es: seq<Entry>, doc: Json, k: nat): seq<Failure> requires k <= |es| decreases k {
    if k == 0 then [] else FailuresUpTo(es, doc, k - 1) + EntryFailures(es, doc, k - 1)
  }

  // ---------------------------------------------------------------------------------------------------------
  // THE ANSWER. All failures that the allowed-values entries `es` give for the document `doc`, in entry order
  // and then in target order. This is the value that `Api.Check` is proved to return.
  //
  // The order is only for reading. The corpus compares failures without order, and an entry can give at most
  // one failure for one location (proved in SpecProps.dfy).
  // ---------------------------------------------------------------------------------------------------------
  ghost function Failures(es: seq<Entry>, doc: Json): seq<Failure> { FailuresUpTo(es, doc, |es|) }

  // CNS-017, for allowed-values entries only: a document meets the manifest when no entry fails for it.
  ghost predicate Meets(es: seq<Entry>, doc: Json) { Failures(es, doc) == [] }
}
