/*
 * Parser from the query strings of the manifest to the AST of Spec.dfy, and the entry builder the harness calls.
 *
 * OUTSIDE THE TRUSTED CLAIM: there is no postcondition that relates a string to its AST. Dafny only checks that
 * this code terminates and does not index out of range. A query outside the subset gives an error, not a guess.
 *
 * Accepted (a subset of RFC 9535): `$` then segments `[sel]` and `..[sel]`, where sel is a single-quoted name
 * (escapes \' and \\ only), `*`, a non-negative integer without leading zeros, or `?` and a filter. A filter has
 * `||`, `&&`, `!` before an existence test or a parenthesis, parentheses, existence tests `@['k']` and `==`
 * between operands that are single-quoted literals or `@['k']`. Blank space is allowed between tokens.
 */
include "Spec.dfy"

module Parser {
  import opened Spec

  datatype Result<T> = Ok(value: T) | Err(msg: string)
  datatype PR<T> = POk(v: T, next: nat) | PErr(msg: string)

  function Ws(s: string, i: nat): (j: nat)
    requires i <= |s|
    ensures i <= j <= |s|
    decreases |s| - i
  {
    if i < |s| && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r') then Ws(s, i + 1) else i
  }

  predicate At(s: string, i: nat, t: string) {
    i + |t| <= |s| && s[i..i + |t|] == t
  }

  // A single-quoted string starting at s[i] == '\''. Returns the unescaped text and the position after the quote.
  function StrBody(s: string, i: nat, acc: string): PR<string>
    requires i <= |s|
    ensures StrBody(s, i, acc).POk? ==> i < StrBody(s, i, acc).next <= |s|
    decreases |s| - i
  {
    if i >= |s| then PErr("unterminated string")
    else if s[i] == '\'' then POk(acc, i + 1)
    else if s[i] == '\\' then
      if i + 1 >= |s| then PErr("unterminated escape")
      else if s[i + 1] == '\'' || s[i + 1] == '\\' then StrBody(s, i + 2, acc + [s[i + 1]])
      else PErr("unsupported escape")
    else if s[i] < ' ' then PErr("control character in string")
    else StrBody(s, i + 1, acc + [s[i]])
  }

  function ParseStr(s: string, i: nat): (r: PR<string>)
    requires i <= |s|
    ensures r.POk? ==> i < r.next <= |s|
  {
    if i < |s| && s[i] == '\'' then StrBody(s, i + 1, "") else PErr("expected a single-quoted string")
  }

  // `@['name']`
  function ParseRel(s: string, i: nat): (r: PR<string>)
    requires i <= |s|
    ensures r.POk? ==> i < r.next <= |s|
  {
    if !(i < |s| && s[i] == '@') then PErr("expected @")
    else
      var j := Ws(s, i + 1);
      if !(j < |s| && s[j] == '[') then PErr("only @['name'] is supported")
      else
        var k := Ws(s, j + 1);
        match ParseStr(s, k)
        case PErr(m) => PErr(m)
        case POk(name, e) =>
          var f := Ws(s, e);
          if f < |s| && s[f] == ']' then POk(name, f + 1) else PErr("expected ]")
  }

  function ParseOperand(s: string, i: nat): (r: PR<Operand>)
    requires i <= |s|
    ensures r.POk? ==> i < r.next <= |s|
  {
    if i < |s| && s[i] == '@' then
      match ParseRel(s, i)
      case POk(n, j) => POk(ORel(n), j)
      case PErr(m) => PErr(m)
    else
      match ParseStr(s, i)
      case POk(l, j) => POk(OLit(l), j)
      case PErr(m) => PErr(m)
  }

  // basic := '!' (paren | existence) | paren | comparison-or-existence
  function ParseBasic(s: string, i: nat): (r: PR<LogExpr>)
    requires i <= |s|
    ensures r.POk? ==> i < r.next <= |s|
    decreases |s| - i, 1
  {
    if i < |s| && s[i] == '!' then
      var j := Ws(s, i + 1);
      if j < |s| && s[j] == '(' then
        match ParseParen(s, j)
        case POk(e, k) => POk(LNot(e), k)
        case PErr(m) => PErr(m)
      else if j < |s| && s[j] == '@' then
        match ParseRel(s, j)
        case POk(n, k) => POk(LNot(LExists(n)), k)
        case PErr(m) => PErr(m)
      else PErr("! applies to a parenthesis or an existence test")
    else if i < |s| && s[i] == '(' then ParseParen(s, i)
    else
      match ParseOperand(s, i)
      case PErr(m) => PErr(m)
      case POk(a, j) =>
        var k := Ws(s, j);
        if At(s, k, "==") then
          var l := Ws(s, k + 2);
          match ParseOperand(s, l)
          case PErr(m) => PErr(m)
          case POk(b, e) => POk(LEq(a, b), e)
        else
          match a
          case ORel(n) => POk(LExists(n), j)
          case OLit(_) => PErr("a literal is not a test")
  }

  function ParseParen(s: string, i: nat): (r: PR<LogExpr>)
    requires i < |s| && s[i] == '('
    ensures r.POk? ==> i < r.next <= |s|
    decreases |s| - i, 0
  {
    var j := Ws(s, i + 1);
    match ParseOr(s, j)
    case PErr(m) => PErr(m)
    case POk(e, k) =>
      var l := Ws(s, k);
      if l < |s| && s[l] == ')' then POk(e, l + 1) else PErr("expected )")
  }

  function ParseAnd(s: string, i: nat): (r: PR<LogExpr>)
    requires i <= |s|
    ensures r.POk? ==> i < r.next <= |s|
    decreases |s| - i, 2
  {
    match ParseBasic(s, i)
    case PErr(m) => PErr(m)
    case POk(l, j) => AndTail(s, j, l, i)
  }

  function AndTail(s: string, j: nat, acc: LogExpr, start: nat): (r: PR<LogExpr>)
    requires start < j <= |s|
    ensures r.POk? ==> start < r.next <= |s|
    decreases |s| - j, 1
  {
    var k := Ws(s, j);
    if At(s, k, "&&") then
      var l := Ws(s, k + 2);
      match ParseBasic(s, l)
      case PErr(m) => PErr(m)
      case POk(r2, e) => AndTail(s, e, LAnd(acc, r2), start)
    else POk(acc, j)
  }

  function ParseOr(s: string, i: nat): (r: PR<LogExpr>)
    requires i <= |s|
    ensures r.POk? ==> i < r.next <= |s|
    decreases |s| - i, 4
  {
    match ParseAnd(s, i)
    case PErr(m) => PErr(m)
    case POk(l, j) => OrTail(s, j, l, i)
  }

  function OrTail(s: string, j: nat, acc: LogExpr, start: nat): (r: PR<LogExpr>)
    requires start < j <= |s|
    ensures r.POk? ==> start < r.next <= |s|
    decreases |s| - j, 5
  {
    var k := Ws(s, j);
    if At(s, k, "||") then
      var l := Ws(s, k + 2);
      match ParseAnd(s, l)
      case PErr(m) => PErr(m)
      case POk(r2, e) => OrTail(s, e, LOr(acc, r2), start)
    else POk(acc, j)
  }

  function IsDigit(c: char): bool { '0' <= c <= '9' }

  function Digits(s: string, i: nat, acc: nat): (r: (nat, nat))
    requires i <= |s|
    ensures i <= r.1 <= |s|
    decreases |s| - i
  {
    if i < |s| && IsDigit(s[i]) then Digits(s, i + 1, acc * 10 + (s[i] as int - '0' as int)) else (acc, i)
  }

  // The selector inside brackets, and the position of the closing bracket.
  function ParseSelector(s: string, i: nat): (r: PR<Selector>)
    requires i <= |s|
    ensures r.POk? ==> i < r.next <= |s|
  {
    if i >= |s| then PErr("expected a selector")
    else if s[i] == '*' then POk(SelWild, i + 1)
    else if s[i] == '\'' then
      match ParseStr(s, i)
      case POk(n, j) => POk(SelName(n), j)
      case PErr(m) => PErr(m)
    else if s[i] == '?' then
      var j := Ws(s, i + 1);
      match ParseOr(s, j)
      case POk(e, k) => POk(SelFilter(e), k)
      case PErr(m) => PErr(m)
    else if IsDigit(s[i]) then
      var (n, j) := Digits(s, i, 0);
      if s[i] == '0' && j > i + 1 then PErr("leading zero")
      else if j > i then POk(SelIndex(n), j) else PErr("unreachable")
    else PErr("unsupported selector")
  }

  function ParseSegments(s: string, i: nat, acc: Query): Result<Query>
    requires i <= |s|
    decreases |s| - i
  {
    var j := Ws(s, i);
    if j == |s| then Ok(acc)
    else
      var desc := At(s, j, "..");
      var b := if desc then j + 2 else j;
      if !(b < |s| && s[b] == '[') then PErr'("expected a bracketed segment")
      else
        var k := Ws(s, b + 1);
        match ParseSelector(s, k)
        case PErr(m) => PErr'(m)
        case POk(sel, e) =>
          var f := Ws(s, e);
          if f < |s| && s[f] == ']' then
            ParseSegments(s, f + 1, acc + [if desc then Desc(sel) else Child(sel)])
          else PErr'("expected ]")
  }

  function PErr'(m: string): Result<Query> { Err(m) }

  function ParseQuery(s: string): Result<Query> {
    if |s| >= 1 && s[0] == '$' then ParseSegments(s, 1, []) else Err("a query starts with $")
  }

  // ---------------------------------------------------------------------------------------------------------
  // What the harness calls to build an entry from the strings of a manifest entry.
  // ---------------------------------------------------------------------------------------------------------
  function ParseAll(qs: seq<string>): Result<seq<Query>>
    decreases |qs|
  {
    if |qs| == 0 then Ok([])
    else
      match ParseAll(qs[..|qs| - 1])
      case Err(m) => Err(m)
      case Ok(done) =>
        match ParseQuery(qs[|qs| - 1])
        case Err(m) => Err("in query " + qs[|qs| - 1] + ": " + m)
        case Ok(q) => Ok(done + [q])
  }

  function BuildEntry(id: Option<string>, docContext: seq<string>, target: seq<string>,
                      values: seq<string>, allowOther: bool): Result<Entry>
  {
    match ParseAll(docContext)
    case Err(m) => Err(m)
    case Ok(dc) =>
      match ParseAll(target)
      case Err(m) => Err(m)
      case Ok(tg) => Ok(Entry(id, dc, tg, values, allowOther))
  }
}
