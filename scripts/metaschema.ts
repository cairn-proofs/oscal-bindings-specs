/**
 * Loads the vendored OSCAL metaschema modules of a release into a small model: the definitions, their flags and
 * children, and their constraints (CNS-002). Store tooling only.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { DOMParser } from "@xmldom/xmldom";

export const metaschemaDir = (release: string) => `metaschema/${release}`;

export type DefKind = "assembly" | "field" | "flag";

export interface FlagInst {
  name: string; // flag name (JSON property name unless useName)
  def: Def;
  required: boolean;
  defaultValue?: string;
}

export interface ChildInst {
  def: Def;
  kind: "assembly" | "field";
  useName: string; // Metapath step name (use-name, else definition use-name, else name)
  jsonKey: string; // JSON property holding the instance(s)
  grouped: boolean; // JSON value is an array (or BY_KEY map) of instances
  inJson?: string; // ARRAY | SINGLETON_OR_ARRAY (the default) | BY_KEY
  min: number;
  max: number | "unbounded";
}

export interface KeyField {
  target: string;
  pattern?: string;
}

export interface Constraint {
  uid: string; // unique key: kind|id|module|declaringDefinition|ordinal
  id: string | null;
  kind: "allowed-values" | "matches" | "has-cardinality" | "is-unique" | "index" | "index-has-key" | "expect";
  level: string;
  target: string;
  module: string;
  def: Def; // declaring definition
  allowOther?: boolean;
  enums?: string[];
  regex?: string;
  datatype?: string;
  minOccurs?: number;
  maxOccurs?: number;
  keyFields?: KeyField[];
  indexName?: string;
  test?: string;
  ordinal: number;
}

export interface Def {
  kind: DefKind;
  name: string;
  module: string;
  inline: boolean;
  parentDef?: Def; // for inline definitions
  rootName?: string;
  useName?: string;
  asType?: string;
  flags: FlagInst[];
  children: ChildInst[];
  jsonValueKey?: string;
  jsonValueKeyFlag?: string;
  jsonKeyFlag?: string;
  collapsible?: boolean;
  constraints: Constraint[];
  id: string; // unique definition id
}

const NS = "http://csrc.nist.gov/ns/oscal/metaschema/1.0";

function els(parent: Element, ...names: string[]): Element[] {
  const out: Element[] = [];
  for (let n = parent.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && names.includes((n as Element).localName)) out.push(n as Element);
  }
  return out;
}
function el(parent: Element, name: string): Element | undefined {
  return els(parent, name)[0];
}

/** The text of a module. The modules of a release hold no external entity, so no entity needs inclusion. */
export const readModuleText = (path: string): string => readFileSync(path, "utf8");
const loadXml = (path: string): Document => new DOMParser().parseFromString(readModuleText(path), "text/xml") as unknown as Document;

/** The metaschema datatypes of the constraints, with the name of their simple type in metaschema-datatypes.xsd. */
const DATATYPE_TYPES: Record<string, string> = {
  uuid: "UUIDDatatype",
  date: "DateDatatype",
  "date-time": "DateTimeDatatype",
  "date-time-with-timezone": "DateTimeWithTimezoneDatatype",
  integer: "IntegerDatatype",
  "ip-v4-address": "IPV4AddressDatatype",
  "ip-v6-address": "IPV6AddressDatatype",
  uri: "URIDatatype",
  "uri-reference": "URIReferenceDatatype",
};

/** The first `xs:pattern` of the datatype in `metaschema-datatypes.xsd`, as written there, or undefined when it has none. */
export function datatypePattern(release: string, datatype: string): string | undefined {
  const type = DATATYPE_TYPES[datatype];
  if (type === undefined) return undefined;
  const doc = new DOMParser().parseFromString(readFileSync(join(metaschemaDir(release), "metaschema-datatypes.xsd"), "utf8"), "text/xml");
  const simple = Array.from(doc.getElementsByTagNameNS("http://www.w3.org/2001/XMLSchema", "simpleType")).find((e) => e.getAttribute("name") === type);
  return simple?.getElementsByTagNameNS("http://www.w3.org/2001/XMLSchema", "pattern")[0]?.getAttribute("value") ?? undefined;
}

export interface Model {
  defs: Def[];
  roots: Def[];
  constraints: Constraint[];
  flagDefs: Map<string, Def>; // module:name
}

export function loadModel(release = "1.2.3", dir = metaschemaDir(release)): Model {
  const METASCHEMA_DIR = dir;
  const files = readdirSync(METASCHEMA_DIR)
    .filter((f) => f.endsWith("_metaschema_RESOLVED.xml") && f !== "oscal_complete_metaschema_RESOLVED.xml")
    .sort();
  const defs: Def[] = [];
  const constraints: Constraint[] = [];
  interface Pending { fn: () => void }
  const pending: Pending[] = [];
  const global = { assembly: new Map<string, Def>(), field: new Map<string, Def>(), flag: new Map<string, Def>() };
  const imports = new Map<string, string[]>(); // module short-name -> imported short names (not needed: names are unique globally)

  const byModule = new Map<string, Def>();
  const localDefs = new Set<Def>();
  const fileToModule = new Map<string, string>();
  const importsOf = new Map<string, string[]>(); // module -> imported module files
  function resolve_(kind: DefKind, module: string, ref: string): Def | undefined {
    const own = byModule.get(`${kind}|${module}|${ref}`);
    if (own) return own;
    const seen = new Set<string>([module]);
    const queue = [...(importsOf.get(module) ?? [])];
    while (queue.length) {
      const f = queue.shift()!; const mod = fileToModule.get(f)!;
      if (seen.has(mod)) continue; seen.add(mod);
      const d = byModule.get(`${kind}|${mod}|${ref}`);
      if (d && !localDefs.has(d)) return d;
      queue.push(...(importsOf.get(mod) ?? []));
    }
    return undefined;
  }
  let uidCounter = 0;
  function mkDef(e: Element, kind: DefKind, module: string, inline: boolean, parentDef?: Def): Def {
    const d: Def = {
      kind, name: e.getAttribute("name")!, module, inline, parentDef,
      asType: e.getAttribute("as-type") || undefined,
      flags: [], children: [], constraints: [], id: `${module}:${kind}:${e.getAttribute("name")}#${uidCounter++}`,
      collapsible: e.getAttribute("collapsible") === "yes",
    };
    const un = el(e, "use-name"); if (un) d.useName = un.textContent!.trim();
    const rn = el(e, "root-name"); if (rn) d.rootName = rn.textContent!.trim();
    const jvk = el(e, "json-value-key");
    if (jvk) { if (jvk.getAttribute("flag-name")) d.jsonValueKeyFlag = jvk.getAttribute("flag-name")!; else d.jsonValueKey = jvk.textContent!.trim(); }
    const jk = el(e, "json-key"); if (jk) d.jsonKeyFlag = jk.getAttribute("flag-name")!;
    defs.push(d);
    return d;
  }

  function parseConstraints(owner: Element, d: Def, module: string) {
    const cons = els(owner, "constraint");
    for (const c of cons) {
      let ord = 0;
      for (const ce of els(c, "allowed-values", "matches", "has-cardinality", "is-unique", "index", "index-has-key", "expect")) {
        const kind = ce.localName as Constraint["kind"];
        const k: Constraint = {
          uid: "", id: ce.getAttribute("id"), kind, level: ce.getAttribute("level") || "ERROR",
          target: ce.hasAttribute("target") ? ce.getAttribute("target")! : ".", module, def: d, ordinal: ord++,
        };
        if (kind === "allowed-values") {
          k.allowOther = ce.getAttribute("allow-other") === "yes";
          k.enums = els(ce, "enum").map((x) => x.getAttribute("value")!);
        } else if (kind === "matches") {
          if (ce.hasAttribute("regex")) k.regex = ce.getAttribute("regex")!;
          if (ce.hasAttribute("datatype")) k.datatype = ce.getAttribute("datatype")!;
        } else if (kind === "has-cardinality") {
          if (ce.hasAttribute("min-occurs")) k.minOccurs = Number(ce.getAttribute("min-occurs"));
          if (ce.hasAttribute("max-occurs")) k.maxOccurs = Number(ce.getAttribute("max-occurs"));
        } else if (kind === "is-unique" || kind === "index" || kind === "index-has-key") {
          k.keyFields = els(ce, "key-field").map((x) => ({ target: x.getAttribute("target")!, pattern: x.getAttribute("pattern") || undefined }));
          if (kind !== "is-unique") k.indexName = ce.getAttribute("name") || undefined;
        } else if (kind === "expect") {
          k.test = ce.getAttribute("test")!;
        }
        k.uid = `${kind}|${k.id ?? "(no id)"}|${module}|${d.kind}:${d.name}|${k.ordinal}`;
        d.constraints.push(k);
        constraints.push(k);
      }
    }
  }

  function parseDefBody(e: Element, d: Def, module: string) {
    // flags
    for (const f of els(e, "flag", "define-flag")) {
      if (f.localName === "define-flag") {
        const fd = mkDef(f, "flag", module, true, d);
        parseConstraints(f, fd, module);
        d.flags.push({ name: fd.name, def: fd, required: f.getAttribute("required") === "yes", defaultValue: f.getAttribute("default") || undefined });
      } else {
        const ref = f.getAttribute("ref")!;
        pending.push({ fn: () => {
          const fd = resolve_("flag", module, ref);
          if (!fd) throw new Error(`flag ref ${ref} unresolved in ${module}`);
          const fun = el(f, "use-name")?.textContent?.trim();
          d.flags.push({ name: fun || fd.useName || ref, def: fd, required: f.getAttribute("required") === "yes", defaultValue: f.getAttribute("default") || undefined });
        } });
      }
    }
    const model = el(e, "model");
    if (model) parseModel(model, d, module);
    parseConstraints(e, d, module);
  }

  function parseModel(model: Element, d: Def, module: string) {
    const walk = (parent: Element) => {
      for (let n = parent.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 1) continue;
        const c = n as Element;
        const ln = c.localName;
        if (ln === "choice") { walk(c); continue; }
        if (ln !== "assembly" && ln !== "field" && ln !== "define-assembly" && ln !== "define-field") continue;
        const kind: "assembly" | "field" = ln.endsWith("assembly") ? "assembly" : "field";
        const min = Number(c.getAttribute("min-occurs") || 0);
        const maxA = c.getAttribute("max-occurs") || "1";
        const max: number | "unbounded" = maxA === "unbounded" ? "unbounded" : Number(maxA);
        const ga = el(c, "group-as");
        const un = el(c, "use-name")?.textContent?.trim();
        const mk = (def: Def) => {
          const useName = un ?? def.useName ?? def.name;
          const grouped = !!ga && (max === "unbounded" || (max as number) > 1);
          const jsonKey = grouped ? ga!.getAttribute("name")! : useName;
          d.children.push({ def, kind, useName, jsonKey, grouped, inJson: ga ? ga.getAttribute("in-json") || "SINGLETON_OR_ARRAY" : undefined, min, max });
        };
        if (ln.startsWith("define-")) {
          const cd = mkDef(c, kind, module, true, d);
          parseDefBody(c, cd, module);
          mk(cd);
        } else {
          const ref = c.getAttribute("ref")!;
          pending.push({ fn: () => {
            const cd = resolve_(kind, module, ref);
            if (!cd) throw new Error(`${kind} ref ${ref} unresolved in ${module}`);
            mk(cd);
          } });
        }
      }
    };
    walk(model);
  }

  const roots: Def[] = [];
  for (const f of files) {
    const doc = loadXml(join(METASCHEMA_DIR, f));
    const root = doc.documentElement as unknown as Element;
    const module = el(root, "short-name")!.textContent!.trim();
    fileToModule.set(f, module);
    importsOf.set(module, els(root, "import").map((i) => i.getAttribute("href")!));
    for (const e of els(root, "define-assembly", "define-field", "define-flag")) {
      const kind = e.localName.replace("define-", "") as DefKind;
      const d = mkDef(e, kind, module, false);
      byModule.set(`${kind}|${module}|${d.name}`, d);
      if (e.getAttribute("scope") === "local") localDefs.add(d);
      parseDefBody(e, d, module);
      if (d.rootName) roots.push(d);
    }
  }
  // flag refs resolved in ref order: global flags defined later are only visible after the whole load
  for (const p of pending) p.fn();
  return { defs, roots, constraints, flagDefs: global.flag };
}

