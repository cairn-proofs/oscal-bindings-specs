/**
 * The naming manifest: JSON pointers, the derivation of canonical type names from the complete OSCAL schema, the
 * writer, and the manifest validator. The rules are in openspec/specs/model-derivation and
 * openspec/specs/naming-manifest. design.md of the change define-names-manifest-format explains the choices.
 *
 * The derivation walks the schema without following `$ref`, so recursive OSCAL types cannot make it loop. Pointers
 * resolve through own properties only, so keys such as `__proto__` or `constructor` never resolve to inherited
 * members. Keyed tables are `Map`s.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import { Ajv, type ValidateFunction } from "ajv";

export const FORMAT = 1;
export const NAME = /^[A-Z][A-Za-z0-9]*$/;
export const KEY = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const POINTER_CHARS = /^#(\/([A-Za-z0-9:._-]|~[01])*)*$/;

// ---------------------------------------------------------------------------------------------------------------
// JSON pointers (RFC 6901, "#" fragment form, ~0 and ~1 escapes, no percent-encoding)

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** Splits a pointer into its reference tokens. Returns undefined for a malformed pointer. */
export function parsePointer(pointer: string): string[] | undefined {
  if (typeof pointer !== "string" || !pointer.startsWith("#") || pointer.includes("%")) return undefined;
  const body = pointer.slice(1);
  if (body === "") return [];
  if (!body.startsWith("/")) return undefined;
  const tokens: string[] = [];
  for (const raw of body.slice(1).split("/")) {
    if (/~(?![01])/.test(raw)) return undefined;
    tokens.push(raw.replace(/~1/g, "/").replace(/~0/g, "~"));
  }
  return tokens;
}

/** Appends one reference token to a pointer, with the RFC 6901 escapes. */
export function childPointer(pointer: string, token: string | number): string {
  return `${pointer}/${String(token).replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

/** Resolves a pointer through own properties and array indexes only. The target must be an object or a boolean. */
export function resolvePointer(root: Json, pointer: string): Json | undefined {
  const tokens = parsePointer(pointer);
  if (tokens === undefined) return undefined;
  let node: Json | undefined = root;
  for (const token of tokens) {
    if (Array.isArray(node)) {
      if (!/^(0|[1-9]\d*)$/.test(token) || Number(token) >= node.length) return undefined;
      node = node[Number(token)];
    } else if (node !== null && typeof node === "object") {
      if (!Object.hasOwn(node, token)) return undefined;
      node = node[token];
    } else {
      return undefined;
    }
  }
  return node !== null && (typeof node === "object" || typeof node === "boolean") ? node : undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Writer

/** A copy of a JSON value with the keys of every object in code-unit order. */
function sortKeys(value: Json): Json {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

/** Two-space indentation, sorted keys, and a final newline. The same value always gives the same bytes. */
export function serialize(value: Json): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

/** A compact form with sorted keys, for structural comparison. */
const fingerprint = (value: Json): string => JSON.stringify(sortKeys(value));

export const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------------------------------------------
// Manifest and override shapes

export type Kind = "object" | "document" | "document-union" | "union" | "enum" | "single-or-many";

export interface Entry {
  name: string;
  kind: Kind;
  sites: string[];
  "body-field"?: string;
  members?: string[];
  variants?: Array<{ type: string; property: string }>;
  closed?: boolean;
  item?: string;
}

export interface Manifest {
  format: number;
  "oscal-release": string;
  schema: { file: string; sha256: string };
  types: Entry[];
}

export interface Overrides {
  format: number;
  "oscal-release": string;
  "local-names": Record<string, string>;
  names: Record<string, string>;
  merges: string[][];
}

export const emptyOverrides = (release: string): Overrides => ({
  format: FORMAT,
  "oscal-release": release,
  "local-names": {},
  names: {},
  merges: [],
});

// ---------------------------------------------------------------------------------------------------------------
// Derivation

export interface DeriveInput {
  release: string;
  schemaFile: string;
  schemaBytes: Buffer | string;
  overrides: Overrides;
  /** The manifest of the previous OSCAL release, already validated, when the store holds one. */
  previous?: Manifest;
}

export interface DeriveResult {
  manifest?: Manifest;
  /** Guard and override failures. A result with failures has no manifest. */
  failures: string[];
  /** Names of the previous manifest that the new manifest does not keep. */
  dropped: string[];
}

type Obj = { [key: string]: Json };
const isObject = (v: Json | undefined): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);
const pascal = (local: string) =>
  local
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

/** A union: an `anyOf` of two or more branches that each define properties. */
const isUnion = (v: Json | undefined): v is Obj =>
  isObject(v) &&
  Array.isArray(v.anyOf) &&
  v.anyOf.length >= 2 &&
  v.anyOf.every((b) => isObject(b) && isObject(b.properties));

/** An object type: `type: object` that is not a union. Properties are optional. */
const isObjectType = (v: Json | undefined): v is Obj => isObject(v) && v.type === "object" && !isUnion(v);

/** The enum branch of an `anyOf` (open) or `allOf` (closed) with a base datatype. */
function enumBranch(v: Json | undefined): { index: number; closed: boolean } | undefined {
  if (!isObject(v)) return undefined;
  for (const [key, closed] of [["anyOf", false], ["allOf", true]] as const) {
    const list = v[key];
    if (!Array.isArray(list)) continue;
    const hits = list.flatMap((b, i) => (isObject(b) && Object.hasOwn(b, "enum") ? [i] : []));
    if (hits.length === 1) return { index: hits[0], closed };
  }
  return undefined;
}

/** A single-or-many property: `anyOf` of one item and a list of the same item. */
function singleOrMany(v: Json | undefined): Json | undefined {
  if (!isObject(v) || !Array.isArray(v.anyOf) || v.anyOf.length !== 2) return undefined;
  const [a, b] = v.anyOf;
  const list = isObject(b) && b.type === "array" ? b : isObject(a) && a.type === "array" ? a : undefined;
  const item = list === b ? a : b;
  if (!list || !isObject(list) || item === undefined) return undefined;
  return fingerprint(list.items) === fingerprint(item) ? item : undefined;
}

/** One place in the schema that produces a type, before merges. */
interface Place {
  pointer: string;
  /** The pointer with each union branch index replaced by `*`. Places with the same key are branch copies. */
  key: string;
  kind: Kind;
  name: string;
  /** The rule-derived or pinned name, before the override name of this place. Used to detect unused overrides. */
  baseName: string;
  node: Json;
  closed?: boolean;
  bodyField?: string;
  item?: string;
  variants?: Array<{ type: string; property: string }>;
  members?: string[];
}

export function derive(input: DeriveInput): DeriveResult {
  const failures: string[] = [];
  const dropped: string[] = [];
  const fail = (rule: string, message: string) => failures.push(`[${rule}] ${message}`);
  let schema: Json;
  try {
    schema = JSON.parse(input.schemaBytes.toString()) as Json;
  } catch {
    return { failures: ["[schema] the schema is not JSON"], dropped };
  }
  if (!isObject(schema)) return { failures: ["[schema] the schema is not a JSON object"], dropped };
  const root = schema;
  const ov = input.overrides;
  const localNames = new Map(Object.entries(ov["local-names"] ?? {}));
  const overrideNames = new Map(Object.entries(ov.names ?? {}));
  const usedLocal = new Set<string>();
  const pinned = new Map<string, string>();
  for (const entry of input.previous?.types ?? []) for (const site of entry.sites) pinned.set(site, entry.name);

  // Override pointers must resolve (NAM-005).
  const overridePointers = [
    ...localNames.keys(),
    ...overrideNames.keys(),
    ...(ov.merges ?? []).flat(),
  ];
  for (const pointer of overridePointers) {
    if (resolvePointer(root, pointer) === undefined) fail("override-pointer", `${pointer} does not resolve in the schema`);
  }

  const places: Place[] = [];
  const nameOf = (pointer: string, ruleName: string): { name: string; baseName: string } => {
    const baseName = pinned.get(pointer) ?? ruleName;
    return { name: overrideNames.get(pointer) ?? baseName, baseName };
  };

  // Definitions: canonical names first, because a single-or-many item can reference any definition.
  const definitions = isObject(root.definitions) ? root.definitions : {};
  const typeDefinitions: Array<{ key: string; local: string; module: string; node: Obj }> = [];
  for (const [key, node] of Object.entries(definitions)) {
    if (!key.includes(":") || !isObject(node)) continue;
    if (!isObjectType(node) && !isUnion(node) && !enumBranch(node)) continue; // scalar definition (NAM-001)
    const [namespace, local] = key.split(":");
    typeDefinitions.push({ key, local, module: namespace.replace(/^oscal-complete-oscal-/, ""), node });
  }
  const localCount = new Map<string, number>();
  for (const d of typeDefinitions) localCount.set(d.local, (localCount.get(d.local) ?? 0) + 1);
  const definitionName = new Map<string, string>();
  for (const d of typeDefinitions) {
    const rule = (localCount.get(d.local) ?? 0) > 1 ? pascal(d.module) + pascal(d.local) : pascal(d.local);
    definitionName.set(`#/definitions/${d.key}`, nameOf(childPointer("#/definitions", d.key), rule).name);
  }

  // Walk one type's properties. `parent` is the canonical name of the enclosing type (the union for a branch).
  const walkProperties = (node: Obj, pointer: string, key: string, parent: string) => {
    if (!isObject(node.properties)) return;
    for (const [prop, child] of Object.entries(node.properties)) {
      const p = childPointer(childPointer(pointer, "properties"), prop);
      const k = childPointer(childPointer(key, "properties"), prop);
      walkValue(child, p, k, parent, prop, false);
    }
  };

  // Classify one property value, or one list item when `isItem` is true. `local` is the local name of the place.
  const walkValue = (value: Json, pointer: string, key: string, parent: string, local: string, isItem: boolean) => {
    if (!isObject(value)) return;
    if (!isItem && value.type === "array" && isObject(value.items)) {
      const items = value.items;
      if (!isObjectType(items) && !isUnion(items) && !enumBranch(items)) return; // a list of $ref or of scalars
      const itemPointer = childPointer(pointer, "items");
      const singular = localNames.get(itemPointer);
      if (singular === undefined) {
        fail("missing-singular", `the list ${pointer} needs a singular local name for ${itemPointer}`);
      } else {
        usedLocal.add(itemPointer);
      }
      walkValue(items, itemPointer, childPointer(key, "items"), parent, singular ?? local, true);
      return;
    }
    const som = isItem ? undefined : singleOrMany(value);
    if (som !== undefined) {
      const { name, baseName } = nameOf(pointer, parent + pascal(local));
      const ref = isObject(som) && typeof som.$ref === "string" ? som.$ref : undefined;
      const item = ref !== undefined ? definitionName.get(ref) : undefined;
      if (item === undefined) fail("single-or-many", `${pointer} holds an item that is not a reference to a type`);
      places.push({ pointer, key, kind: "single-or-many", name, baseName, node: value, item: item ?? "" });
      return;
    }
    const e = enumBranch(value);
    if (e !== undefined) {
      const combinator = e.closed ? "allOf" : "anyOf";
      const site = childPointer(childPointer(pointer, combinator), e.index);
      const { name, baseName } = nameOf(site, parent + pascal(local));
      const node = (value[combinator] as Json[])[e.index];
      places.push({ pointer: site, key: childPointer(childPointer(key, combinator), e.index), kind: "enum", name, baseName, node, closed: e.closed });
      return;
    }
    if (isUnion(value)) {
      walkUnion(value, pointer, key, parent + pascal(local));
      return;
    }
    if (isObjectType(value)) {
      const { name, baseName } = nameOf(pointer, parent + pascal(local));
      places.push({ pointer, key, kind: "object", name, baseName, node: value });
      walkProperties(value, pointer, key, name);
    }
  };

  // A union and its branches. `ruleName` is the rule-derived name of the union.
  const walkUnion = (node: Obj, pointer: string, key: string, ruleName: string) => {
    const { name, baseName } = nameOf(pointer, ruleName);
    const branches = node.anyOf as Obj[];
    const own = branches.map((b) => new Set(Object.keys(b.properties as Obj)));
    const required = branches.map((b) => new Set(Array.isArray(b.required) ? (b.required as string[]) : []));
    const variants: Array<{ type: string; property: string }> = [];
    branches.forEach((branch, i) => {
      const others = (sets: Array<Set<string>>) => new Set(sets.flatMap((s, j) => (j === i ? [] : [...s])));
      const onlyHere = [...own[i]].filter((p) => !others(own).has(p));
      const requiredHere = [...required[i]].filter((p) => !others(required).has(p));
      const property = onlyHere.length === 1 ? onlyHere[0] : requiredHere.length === 1 ? requiredHere[0] : undefined;
      const bp = childPointer(childPointer(pointer, "anyOf"), i);
      const bk = childPointer(childPointer(key, "anyOf"), "*");
      if (property === undefined) {
        fail("branch", `the union branch ${bp} has no single distinguishing property`);
        return;
      }
      const branchName = nameOf(bp, `${name}With${pascal(property)}`);
      variants.push({ type: branchName.name, property });
      places.push({ pointer: bp, key: `${bk}#${property}`, kind: "object", ...branchName, node: branch });
      walkProperties(branch, bp, bk, name);
    });
    places.push({ pointer, key, kind: "union", name, baseName, node, variants });
  };

  // Definitions.
  for (const d of typeDefinitions) {
    const pointer = childPointer("#/definitions", d.key);
    const rule = (localCount.get(d.local) ?? 0) > 1 ? pascal(d.module) + pascal(d.local) : pascal(d.local);
    if (isUnion(d.node)) {
      walkUnion(d.node, pointer, pointer, rule);
    } else if (isObjectType(d.node)) {
      const { name, baseName } = nameOf(pointer, rule);
      places.push({ pointer, key: pointer, kind: "object", name, baseName, node: d.node });
      walkProperties(d.node, pointer, pointer, name);
    } else {
      const e = enumBranch(d.node)!;
      const combinator = e.closed ? "allOf" : "anyOf";
      const site = childPointer(childPointer(pointer, combinator), e.index);
      const { name, baseName } = nameOf(site, rule);
      places.push({ pointer: site, key: site, kind: "enum", name, baseName, node: (d.node[combinator] as Json[])[e.index], closed: e.closed });
    }
  }

  // Document wrappers and the document union (MDL-002, guards 1 and 2 of MDL-007).
  const oneOf = Array.isArray(root.oneOf) ? root.oneOf : [];
  const members: string[] = [];
  for (const [i, wrapper] of oneOf.entries()) {
    const pointer = childPointer("#/oneOf", i);
    if (!isObject(wrapper) || !isObject(wrapper.properties)) continue;
    const body = Object.keys(wrapper.properties).filter((p) => p !== "$schema");
    if (body.length !== 1) {
      return { failures: [`[ambiguous-wrapper] ${pointer} has the body fields ${JSON.stringify(body)}, not one`], dropped };
    }
    const { name, baseName } = nameOf(pointer, `${pascal(body[0])}Document`);
    members.push(name);
    places.push({ pointer, key: pointer, kind: "document", name, baseName, node: wrapper, bodyField: body[0] });
  }
  if (members.length !== oneOf.length) {
    fail("wrapper-count", `derived ${members.length} document wrappers, but the schema has ${oneOf.length} document types`);
  }
  {
    const { name, baseName } = nameOf("#", "OscalDocument");
    places.push({ pointer: "#", key: "#", kind: "document-union", name, baseName, node: null, members: [...members].sort(byCodeUnit) });
  }

  // Unused overrides (NAM-005).
  const placeByPointer = new Map(places.map((p) => [p.pointer, p]));
  for (const pointer of localNames.keys()) {
    if (!usedLocal.has(pointer)) fail("unused-override", `local-names ${pointer} is not a list item that needs a name`);
  }
  for (const [pointer, value] of overrideNames) {
    const place = placeByPointer.get(pointer);
    if (place === undefined) fail("unused-override", `names ${pointer} is not a place that produces a type`);
    else if (place.baseName === value) fail("unused-override", `names ${pointer} = ${value} is the name the rules give`);
  }

  // Merges (MDL-013): branch copies by key, then explicit merges.
  const groups = new Map<string, Place[]>();
  for (const place of places) {
    const id = `${place.key}\u0000${place.name}`;
    groups.set(id, [...(groups.get(id) ?? []), place]);
  }
  const groupOf = new Map<string, string>();
  for (const [id, list] of groups) for (const p of list) groupOf.set(p.pointer, id);
  for (const [i, set] of (ov.merges ?? []).entries()) {
    const ids = [...new Set(set.map((pointer) => groupOf.get(pointer)))];
    if (ids.some((id) => id === undefined)) {
      fail("unused-override", `merges[${i}] names a pointer that is not a place that produces a type`);
      continue;
    }
    if (ids.length < 2) {
      fail("unused-override", `merges[${i}] names places that already form one type`);
      continue;
    }
    const target = ids[0] as string;
    const name = groups.get(target)![0].name;
    for (const id of ids.slice(1) as string[]) {
      for (const p of groups.get(id)!) {
        p.name = name;
        groupOf.set(p.pointer, target);
      }
      groups.set(target, [...groups.get(target)!, ...groups.get(id)!]);
      groups.delete(id);
    }
  }
  for (const list of groups.values()) {
    const first = list[0];
    const different = list.filter(
      (p) => p.kind !== first.kind || p.closed !== first.closed || fingerprint(p.node) !== fingerprint(first.node),
    );
    if (different.length) {
      fail("merge-structure", `${first.pointer} and ${different.map((p) => p.pointer).join(", ")} merge but differ in structure`);
    }
  }

  // Collisions (guard 3 of MDL-007): one name for two types.
  const byName = new Map<string, string[]>();
  for (const list of groups.values()) byName.set(list[0].name, [...(byName.get(list[0].name) ?? []), list[0].pointer]);
  for (const [name, pointers] of byName) {
    if (pointers.length > 1) fail("collision", `${name} names ${pointers.length} types: ${pointers.join(", ")}`);
  }
  for (const list of groups.values()) {
    if (!NAME.test(list[0].name)) fail("name", `${JSON.stringify(list[0].name)} at ${list[0].pointer} is not a valid name`);
  }

  // Pinned names that the new manifest does not keep (NAM-007).
  for (const entry of input.previous?.types ?? []) {
    const kept = entry.sites.some((site) => placeByPointer.get(site)?.name === entry.name);
    if (!kept) dropped.push(`${entry.name} (${entry.sites[0]})`);
  }

  if (failures.length) return { failures, dropped };
  const types: Entry[] = [...groups.values()].map((list) => {
    const first = list[0];
    const entry: Entry = { name: first.name, kind: first.kind, sites: list.map((p) => p.pointer).sort(byCodeUnit) };
    if (first.bodyField !== undefined) entry["body-field"] = first.bodyField;
    if (first.members !== undefined) entry.members = first.members;
    if (first.closed !== undefined) entry.closed = first.closed;
    if (first.item !== undefined) entry.item = first.item;
    if (first.variants !== undefined) {
      entry.variants = [...first.variants].sort((a, b) => byCodeUnit(a.type, b.type));
    }
    return entry;
  });
  types.sort((a, b) => byCodeUnit(a.name, b.name));
  return {
    manifest: {
      format: FORMAT,
      "oscal-release": input.release,
      schema: { file: input.schemaFile, sha256: sha256(input.schemaBytes) },
      types,
    },
    failures,
    dropped,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Validation (NAM-003, NAM-004)

const cache = new Map<string, ValidateFunction>();
function validatorFor(file: string): ValidateFunction {
  let validate = cache.get(file);
  if (!validate) {
    const ajv = new Ajv({ allErrors: true, strict: true });
    validate = ajv.compile(JSON.parse(fs.readFileSync(file, "utf8")));
    cache.set(file, validate);
  }
  return validate;
}

const schemaErrors = (validate: ValidateFunction, data: unknown, label: string): string[] =>
  validate(data)
    ? []
    : (validate.errors ?? []).slice(0, 10).map((e) => `[json-schema] ${label}${e.instancePath} ${e.message ?? ""}`.trim());

/** Checks an override file against its JSON Schema. */
export function validateOverrides(data: unknown, schemaPath = "manifest/overrides.schema.json"): string[] {
  return schemaErrors(validatorFor(schemaPath), data, "overrides.json");
}

/**
 * Checks a manifest against its JSON Schema and against the rules that a JSON Schema cannot express. `schemaBytes`
 * are the bytes of the complete schema that the consumer uses, and `release` is its OSCAL release.
 */
export function validateManifest(
  data: unknown,
  schemaBytes: Buffer | string,
  release: string,
  schemaPath = "manifest/names.schema.json",
): string[] {
  const failures = schemaErrors(validatorFor(schemaPath), data, "names.json");
  if (failures.length) return failures;
  const manifest = data as Manifest;
  const fail = (message: string) => failures.push(`[manifest] ${message}`);
  if (manifest["oscal-release"] !== release) fail(`oscal-release ${manifest["oscal-release"]} is not ${release}`);
  if (manifest.schema.sha256 !== sha256(schemaBytes)) fail(`schema.sha256 does not match the schema`);
  const schema = JSON.parse(schemaBytes.toString()) as Json;
  const names = new Map<string, Entry>();
  const seenSites = new Set<string>();
  for (const entry of manifest.types) {
    if (names.has(entry.name)) fail(`the name ${entry.name} occurs more than once`);
    names.set(entry.name, entry);
    for (const site of entry.sites) {
      if (seenSites.has(site)) fail(`the pointer ${site} occurs in more than one entry`);
      seenSites.add(site);
      if (resolvePointer(schema, site) === undefined) fail(`${entry.name}: the pointer ${site} does not resolve`);
    }
  }
  for (const entry of manifest.types) {
    const refs = [...(entry.members ?? []), ...(entry.item ? [entry.item] : []), ...(entry.variants ?? []).map((v) => v.type)];
    for (const ref of refs) if (!names.has(ref)) fail(`${entry.name}: the reference ${ref} names no entry`);
    for (const variant of entry.variants ?? []) {
      const branch = names.get(variant.type);
      const ok = branch?.sites.every((site) => {
        const node = resolvePointer(schema, site);
        return isObject(node) && isObject(node.properties) && Object.hasOwn(node.properties, variant.property);
      });
      if (branch && !ok) fail(`${entry.name}: ${variant.property} is not a property of the branch ${variant.type}`);
    }
    if (entry["body-field"] !== undefined) {
      const ok = entry.sites.every((site) => {
        const node = resolvePointer(schema, site);
        return isObject(node) && isObject(node.properties) && Object.hasOwn(node.properties, entry["body-field"]!);
      });
      if (!ok) fail(`${entry.name}: ${entry["body-field"]} is not a property of the wrapper`);
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------------------------------------------
// Store layout

const RELEASE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const releaseOrder = (a: string, b: string) => {
  const [x, y] = [a, b].map((r) => r.split(".").map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

/** The releases under manifest/ that hold an override file, in release order. */
export function storeReleases(root = "."): string[] {
  const dir = `${root}/manifest`;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && RELEASE.test(e.name) && fs.existsSync(`${dir}/${e.name}/overrides.json`))
    .map((e) => e.name)
    .sort(releaseOrder);
}

export { POINTER_CHARS };
