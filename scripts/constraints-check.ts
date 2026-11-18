/**
 * The checks of the constraint manifest against the reference evaluator (openspec/specs/constraint-validation, CNS-019
 * and CNS-022), on the documents and the elements of scripts/constraints-docs.ts.
 *
 * The query check compares the nodes that the queries of each entry select with the nodes that the Metapath evaluator
 * selects for its constraint. The failure check compares the number of failures of each entry, as the RFC 9535
 * evaluation of the manifest gives it, with the number of the reference evaluation of the constraint.
 */
import { evaluate } from "./constraint-reference.js";
import type { CheckDocument, ElementSample } from "./constraints-docs.js";
import type { Entry } from "./constraints-lib.js";
import { evaluateManifest, type Form } from "./constraints-manifest.js";
import { run, runOnce, type Hit } from "./jsonpath.js";
import type { Constraint } from "./metaschema.js";
import { atomize, ebv, evalMp, localPart, MetapathError, parseMetapath, selectNodes, type Expr, type MNode } from "./metapath.js";

/** A document, or an element of an element type, that the checks run on. `data` is what the queries run on. */
export interface Unit {
  name: string;
  data: unknown;
  tree: MNode;
  nodes: MNode[];
  form: Form;
}

export const unitsOf = (docs: CheckDocument[], elements: ElementSample[]): Unit[] => [
  ...docs.map((d): Unit => ({ name: d.name, data: d.json, tree: d.tree, nodes: d.nodes, form: { document: true } })),
  ...elements.map((e): Unit => ({ name: `${e.name} as ${e.type}`, data: e.json, tree: e.tree, nodes: e.nodes, form: { element: e.type } })),
];

const label = (e: Entry, i: number) => `entry ${i} (${e.id ?? "no id"}, ${e.kind} on ${e.definition})`;

/** Messages grouped by text, with a count and the first examples. */
class Report {
  private readonly groups = new Map<string, { count: number; examples: string[] }>();
  add(message: string, example: string) {
    const g = this.groups.get(message) ?? { count: 0, examples: [] };
    g.count++;
    if (g.examples.length < 2) g.examples.push(example);
    this.groups.set(message, g);
  }
  messages(): string[] {
    return [...this.groups].map(([m, g]) => `${m} (${g.count}x, for example ${g.examples.join("; ")})`);
  }
}

const dedupe = (hits: Hit[]): Hit[] => {
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.path) ? false : (seen.add(h.path), true)));
};

/** CNS-019: the queries of each entry select the nodes that the reference evaluator selects for its constraint. */
export function checkQueries(constraints: Constraint[], entries: Entry[], units: Unit[]): string[] {
  const report = new Report();
  const parsed = new Map<string, Expr>();
  const parse = (s: string): Expr => {
    let e = parsed.get(s);
    if (!e) parsed.set(s, (e = parseMetapath(s)));
    return e;
  };
  // Many entries share their context queries, so each query runs once for each unit.
  const runOnUnit = new Map<Unit, (query: string) => readonly Hit[]>(units.map((u) => [u, runOnce(u.data)]));
  for (const [i, e] of entries.entries()) {
    const c = constraints[i];
    const at = label(e, i);
    const { expr } = localPart(parse(c.target));
    const keyExprs = (c.keyFields ?? []).map((kf) => parse(kf.target));
    const test = c.test === undefined ? undefined : parse(c.test);
    const valued = c.kind === "allowed-values" || c.kind === "matches";
    for (const u of units) {
      const queries = "document" in u.form ? e.context.document : e.context.elements[u.form.element];
      const refContexts = u.nodes.filter((n) => n.def === c.def && n.kind !== "doc");
      if (queries === undefined) {
        // CNS-009: an allowed-values entry can lack the element context queries of a type.
        if (c.kind !== "allowed-values" && refContexts.length) report.add(`${at}: no context queries for ${JSON.stringify(u.form)}, and the element holds context nodes`, u.name);
        continue;
      }
      const contexts = dedupe(queries.flatMap((q) => runOnUnit.get(u)!(q)));
      const have = new Set(contexts.map((h) => h.path));
      const want = new Set(refContexts.map((n) => n.path));
      for (const p of have) if (!want.has(p)) report.add(`${at}: the context queries select a node that is no context node`, `${u.name} ${p}`);
      for (const p of want) if (!have.has(p)) report.add(`${at}: the context queries miss a context node`, `${u.name} ${p}`);
      if (!expr) continue;
      const byPath = new Map(contexts.map((h) => [h.path, h]));
      for (const ctx of refContexts) {
        const hit = byPath.get(ctx.path);
        if (!hit) continue;
        let reference: MNode[];
        try {
          reference = selectNodes(expr, ctx);
        } catch (error) {
          if (error instanceof MetapathError) continue; // an error gives no node
          throw error;
        }
        const targets = dedupe(e.target.flatMap((q) => run(q, [hit.value]).map((h) => ({ value: h.value, path: ctx.path + h.path.slice(4) }))));
        const found = new Set(targets.map((h) => h.path));
        const byTarget = new Map(reference.map((n) => [valued ? n.valuePath() : n.path, n]));
        for (const p of found) if (!byTarget.has(p)) report.add(`${at}: the target queries select a node that is no target node`, `${u.name} ${p}`);
        for (const p of byTarget.keys()) if (!found.has(p)) report.add(`${at}: the target queries miss a target node`, `${u.name} ${p}`);
        for (const t of targets) {
          const node = byTarget.get(t.path);
          if (!node) continue;
          for (const [k, kexpr] of keyExprs.entries()) {
            let values: string[];
            try {
              values = [...new Set(evalMp(kexpr, node).map(atomize).filter((x) => x !== null).map(String))].sort();
            } catch (error) {
              if (error instanceof MetapathError) continue;
              throw error;
            }
            const got = [...new Set(dedupe(e["key-fields"]![k].target.flatMap((q) => run(q, [t.value]))).map((h) => String(h.value)))].sort();
            if (JSON.stringify(values) !== JSON.stringify(got))
              report.add(`${at}: the queries of key field ${k} select other values than the reference evaluator`, `${u.name} ${t.path}: ${JSON.stringify(got)} is not ${JSON.stringify(values)}`);
          }
          if (test) {
            let expected: boolean;
            try {
              expected = ebv(evalMp(test, node));
            } catch (error) {
              if (error instanceof MetapathError) continue;
              throw error;
            }
            if (expected !== run(e.test!, [t.value]).length > 0) report.add(`${at}: the test query and the reference evaluator disagree`, `${u.name} ${t.path}`);
          }
        }
      }
    }
  }
  return report.messages();
}

/** CNS-022: the number of failures of each entry equals the number of the reference evaluator for its constraint. */
export function checkFailures(constraints: Constraint[], entries: Entry[], units: Unit[]): string[] {
  const report = new Report();
  for (const u of units) {
    const manifest = new Array<number>(entries.length).fill(0);
    for (const f of evaluateManifest(entries, u.data, u.form)) manifest[f.entry]++;
    // CNS-018: an element meets the entries that have element context queries for its type, except the index kinds.
    const applies = (i: number) =>
      "document" in u.form || (entries[i].context.elements[u.form.element] !== undefined && entries[i].kind !== "index" && entries[i].kind !== "index-has-key");
    const index = new Map<Constraint, number>();
    const subset: Constraint[] = [];
    for (let i = 0; i < entries.length; i++)
      if (applies(i)) {
        index.set(constraints[i], i);
        subset.push(constraints[i]);
      }
    const reference = new Array<number>(entries.length).fill(0);
    for (const f of evaluate(subset, u.tree).failures) reference[index.get(f.constraint)!]++;
    for (let i = 0; i < entries.length; i++)
      if (manifest[i] !== reference[i]) report.add(`${label(entries[i], i)}: the manifest gives other failures than the reference evaluator`, `${u.name}: ${manifest[i]} is not ${reference[i]}`);
  }
  return report.messages();
}
