/**
 * The constraint failures of a corpus input (openspec/specs/constraint-validation, CNS-020). The failures come from the
 * reference evaluator (CNS-019) and the entries of the committed constraint manifest. The failures of an element follow
 * CNS-018: the entries that have element context queries for its type, except the index kinds.
 */
import fs from "node:fs";
import { evaluate } from "./constraint-reference.js";
import type { ConstraintManifest, ElementTarget, Entry } from "./constraints-lib.js";
import { Generator } from "./constraints-lib.js";
import type { Constraint } from "./metaschema.js";
import { loadDoc, loadElement, type JsonValue } from "./metapath.js";

export interface EntryFailure {
  /** The position of the entry in the manifest. */
  entry: number;
  id: string | null;
  /** The location of the failure: the target node, or the context node of a `has-cardinality` entry. */
  location: string;
}

export class CorpusConstraints {
  readonly entries: Entry[];
  private readonly constraints: Constraint[];
  private readonly targets: Map<string, ElementTarget>;
  private constructor(
    private readonly gen: Generator,
    entries: Entry[],
  ) {
    this.entries = entries;
    this.constraints = gen.select().selected;
    this.targets = gen.targets();
    if (this.constraints.length !== entries.length) throw new Error("the constraint manifest does not match the vendored metaschema. Run npm run constraints:write.");
  }
  static load(release: string): CorpusConstraints {
    const manifest = JSON.parse(fs.readFileSync(`manifest/${release}/constraints.json`, "utf8")) as ConstraintManifest;
    return new CorpusConstraints(new Generator(release), manifest.entries);
  }
  /** The failures of a document that conforms to the schema. */
  ofDocument(json: unknown): EntryFailure[] {
    return this.collect(evaluate(this.constraints, loadDoc(json as JsonValue, this.gen.model.roots), this.gen.release).failures);
  }
  /** The failures of an element of an element type. An element type that has no definition has no failure. */
  ofElement(type: string, json: unknown): EntryFailure[] {
    const target = this.targets.get(type);
    if (!target) return [];
    const applies = this.constraints.filter((c) => {
      const e = this.entries[this.constraints.indexOf(c)];
      return e.context.elements[type] !== undefined && e.kind !== "index" && e.kind !== "index-has-key";
    });
    const tree = target.def ? loadElement(json as JsonValue, target.def) : loadDoc(json as JsonValue, this.gen.model.roots, "$[0]");
    return this.collect(evaluate(applies, tree, this.gen.release).failures);
  }
  private collect(failures: Array<{ constraint: Constraint; location: string }>): EntryFailure[] {
    return failures.map((f) => {
      const entry = this.constraints.indexOf(f.constraint);
      return { entry, id: this.entries[entry].id, location: f.location };
    });
  }
}
