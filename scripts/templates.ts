/**
 * Generates and checks the generated files of the binding templates in templates/binding/ (openspec/specs/
 * binding-surface, SRF-009 and SRF-012):
 *
 * 1. `bin/check-binding.mjs`: the bundle of scripts/binding-check.ts, with its packages inside it.
 * 2. `openspec/config.yaml`: the store openspec/config.yaml, with the edits of EDITS and the entries of ADDED_RULES
 *    and REFERENCE.
 * 3. `README.md`: the install steps, and the packages of the bundle with their licenses, from the esbuild metafile.
 *
 * The other files of templates/binding/ are hand-written. The check also fails when the agent guide `AGENTS.md` cites
 * a store identifier that is neither live nor retired (SRF-009.05).
 *
 *   npm run templates:write       regenerate the generated files
 *   npm run templates:check       generate in memory and compare with the committed files
 *   npm run templates:self-test   run the scenarios of the generator, the bundle and the hook
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { build } from "esbuild";
import YAML, { isScalar, visit } from "yaml";

import { type StoreSpecs, storeSpecs } from "./check-spec-ids.js";
import { canonical, CITATION, isRetired, LEDGER, render } from "./spec-ids.js";
import { proseLines, readRepository, withoutCode } from "./spec-markdown.js";

export const DIR = "templates/binding";
export const BUNDLE = `${DIR}/bin/check-binding.mjs`;
export const CONFIG = `${DIR}/openspec/config.yaml`;
export const README = `${DIR}/README.md`;
export const HOOK = `${DIR}/hooks/pre-commit`;
export const GUIDE = `${DIR}/AGENTS.md`;
const STORE_CONFIG = "openspec/config.yaml";
const ENTRY = "scripts/binding-check.ts";

/** The store-specific texts of the store config, and their replacements for a binding. */
export const EDITS: Array<{ find: string; replace: string }> = [
  {
    find: "`npm run spec-ids` checks the identifier rules on the main specs.",
    replace: "The binding checker checks the identifier rules on the main specs.",
  },
  {
    find: "`npm run spec-ids` checks the citations on the main specs.",
    replace: "The binding checker checks the citations on the main specs.",
  },
  { find: "Then run `npm run spec-ids`.", replace: "Then run the binding checker." },
  { find: ", as CONTRIBUTING.md describes", replace: "" },
];

/** The rules.specs entries that only a binding has (SRF-008, SRF-010). */
export const ADDED_RULES = [
  "A prefix in `openspec/spec-ids.yaml` is never a prefix in the ledger `openspec/spec-ids.yaml` of the pinned spec " +
    "artifact of the store (SRF-008). The binding checker fails for such a prefix.",
  "A spec can cite a requirement or a scenario of the store, such as `[PRS-001]` or `[PRS-001.01]`. The citation " +
    "resolves in the pinned spec artifact of the store. The binding checker fails for a citation with a store prefix " +
    "that names no live or retired identifier of the store.",
];

/** The OpenSpec reference to the store, as README.md of the store shows it. */
export const REFERENCE = { id: "oscal-bindings-specs", remote: "https://github.com/cairn-proofs/oscal-bindings-specs.git" };

const CONFIG_HEADER = `# Generated from openspec/config.yaml of the OSCAL bindings spec store (oscal-bindings-specs).
# Copy it into openspec/config.yaml of a binding from the spec artifact that the binding pins. On each pin move,
# copy it again and add the entries of the binding again. The binding checker of the same spec artifact enforces the
# identifier rules.
`;

/** The template config for the store config text `storeConfig`, or failures. */
export function generateConfig(storeConfig: string): { output?: string; failures: string[] } {
  const failures: string[] = [];
  const doc = YAML.parseDocument(storeConfig);
  const used = new Set<string>();
  visit(doc, {
    Scalar(_key, node) {
      if (typeof node.value !== "string") return;
      let value = node.value;
      for (const edit of EDITS) {
        if (value.includes(edit.find)) {
          value = value.split(edit.find).join(edit.replace);
          used.add(edit.find);
        }
      }
      node.value = value;
    },
  });
  for (const edit of EDITS) {
    if (!used.has(edit.find)) failures.push(`[template-edit] ${STORE_CONFIG} has no text "${edit.find}". Review EDITS in scripts/templates.ts.`);
  }
  const specs = doc.getIn(["rules", "specs"], true);
  if (!YAML.isSeq(specs)) {
    failures.push(`[template-edit] ${STORE_CONFIG} has no rules.specs list.`);
    return { failures };
  }
  for (const rule of ADDED_RULES) {
    const node = doc.createNode(rule);
    if (isScalar(node)) node.type = "BLOCK_FOLDED";
    specs.items.push(node);
  }
  const references = doc.createNode([REFERENCE], { flow: false });
  doc.contents && YAML.isMap(doc.contents) && doc.contents.items.splice(1, 0, doc.createPair("references", references));
  if (failures.length) return { failures };
  return { output: CONFIG_HEADER + doc.toString({ lineWidth: 116 }), failures };
}

interface Package {
  name: string;
  version: string;
  license: string;
}

/** The bundle text of the binding checker, and the packages in it. */
export async function generateBundle(root: string): Promise<{ output: string; packages: Package[] }> {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [ENTRY],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    legalComments: "inline",
    // The node build of yaml is CommonJS and calls require(), which an ES module does not have.
    banner: { js: 'import { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);' },
    metafile: true,
    write: false,
    logLevel: "silent",
  });
  const names = new Set<string>();
  for (const input of Object.keys(result.metafile!.inputs)) {
    const m = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(input);
    if (m) names.add(m[1]);
  }
  const packages = [...names].sort().map((name) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "node_modules", name, "package.json"), "utf8"));
    return { name, version: pkg.version as string, license: pkg.license as string };
  });
  return { output: result.outputFiles![0].text, packages };
}

/** The template README, with the packages of the bundle. */
export function generateReadme(packages: Package[]): string {
  const list = packages.map((p, i) => `${i + 1}. \`${p.name}\` ${p.version}: ${p.license}`).join("\n");
  return `# Binding templates

<!-- Generated by scripts/templates.ts of the store. Do not edit. -->

These files let a binding check its OpenSpec specs and its traceability record before each commit. They come from the
spec artifact of the OSCAL bindings spec store that the binding pins (openspec/specs/binding-surface, SRF-009).

## Files

1. \`openspec/config.yaml\`: the OpenSpec config of a binding. The store generates it from its own config (SRF-012).
2. \`openspec/spec-ids.yaml\`: an empty identifier ledger.
3. \`openspec/traceability.json\`: a traceability record with no operation.
4. \`bin/check-binding.mjs\`: the binding checker (SRF-010, SRF-011). It runs with Node.js 22 or later and git, and
   needs no installed package.
5. \`hooks/pre-commit\`: a POSIX shell git hook. It verifies the pinned archive by its sha256, extracts it, and runs
   the checker of the archive and \`openspec validate --all --strict\` on the staged files.
6. \`AGENTS.md\`: the agent guide of a binding. It states how the binding relates to the store, and where each kind
   of change goes.

## Install

1. Keep the pinned spec artifact, the \`.tar.gz\` file, at a path in the binding repository.
2. Copy \`openspec/config.yaml\`, \`openspec/spec-ids.yaml\` and \`openspec/traceability.json\` into \`openspec/\` of
   the binding. Keep a record that the binding has already. Add the prefixes of the binding to the ledger. A prefix
   of the store is not allowed (SRF-008).
3. Copy \`hooks/pre-commit\` into the binding, and set the three variables at its top: the path of the archive, its
   sha256, and the path of the record. Install it with \`git config core.hooksPath <dir>\`, or copy it into
   \`.git/hooks/pre-commit\`. Keep its executable bit.
4. Copy \`AGENTS.md\` into the root of the binding, and add the facts of the binding to its section "Binding notes".

On each pin move, set the archive path and the sha256 in the hook again. Copy \`openspec/config.yaml\` again, and add
the entries of the binding again. Copy \`AGENTS.md\` again, and keep its section "Binding notes".

## Run the checker

\`\`\`sh
node <extracted archive>/templates/binding/bin/check-binding.mjs --store <extracted archive> [--record <path>]
\`\`\`

Run it in the root directory of the binding. \`<extracted archive>\` is the top directory of the extracted spec
artifact. The default record is \`openspec/traceability.json\`. \`SPEC_IDS_BASE\` sets the git ref whose scenario
identifiers must not vanish. The default is \`HEAD\`. Each failure starts with the name of its rule. The exit code is 1
on a failure, 2 on a usage error, and 0 otherwise.

## Packages in the bundle

The bundle holds these packages. It keeps their license comments.

${list}
`;
}

/** A failure for each citation of the agent guide with a store prefix that names no live or retired identifier. */
export function checkGuideCitations(text: string, store: StoreSpecs): string[] {
  const failures: string[] = [];
  for (const [lineNo, line] of proseLines(text)) {
    for (const [, cited] of withoutCode(line).matchAll(CITATION)) {
      const key = canonical(cited)!;
      if (!store.ledger.prefixes.has(key.split("-")[0])) continue;
      if (!store.live.has(key) && !isRetired(store.ledger, key)) {
        failures.push(`[guide-citation] ${GUIDE}:${lineNo}: citation [${render(key)}] is neither live nor retired.`);
      }
    }
  }
  return failures;
}

/** Each generated file and its text, or failures. */
async function generate(root: string, storeConfig: string): Promise<{ files: Map<string, string>; failures: string[] }> {
  const config = generateConfig(storeConfig);
  const bundle = await generateBundle(root);
  const files = new Map<string, string>([
    [BUNDLE, bundle.output],
    [README, generateReadme(bundle.packages)],
  ]);
  if (config.output !== undefined) files.set(CONFIG, config.output);
  return { files, failures: config.failures };
}

/** A failure for each generated file that differs from `committed`. */
export function compare(generated: Map<string, string>, committed: (file: string) => string | undefined): string[] {
  const failures: string[] = [];
  for (const [file, text] of generated) {
    if (committed(file) !== text) failures.push(`[templates] ${file} differs from the generator output. Run npm run templates:write.`);
  }
  return failures;
}

const readCommitted = (root: string) => (file: string) => {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : undefined;
};

async function main(mode: "write" | "check"): Promise<number> {
  const root = process.cwd();
  const { files, failures } = await generate(root, fs.readFileSync(path.join(root, STORE_CONFIG), "utf8"));
  if (mode === "write" && failures.length === 0) {
    for (const [file, text] of files) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), text);
      console.log(`wrote ${file}`);
    }
    return 0;
  }
  failures.push(...compare(files, readCommitted(root)));
  const store = storeSpecs(readRepository(root, [LEDGER]), failures);
  if (store) failures.push(...checkGuideCitations(readCommitted(root)(GUIDE) ?? "", store));
  for (const failure of failures) console.error(failure);
  console.log(failures.length ? `\n${failures.length} template failure(s)` : "templates: ok");
  return failures.length ? 1 : 0;
}

async function selfTest(): Promise<number> {
  const root = process.cwd();
  const storeConfig = fs.readFileSync(path.join(root, STORE_CONFIG), "utf8");
  const committed = readCommitted(root);
  let failed = 0;
  const test = async (name: string, fn: () => boolean | string | Promise<boolean | string>) => {
    let out: boolean | string;
    try {
      out = await fn();
    } catch (error) {
      out = `threw ${(error as Error).message}`;
    }
    const ok = out === true;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || out === false ? "" : `\n      ${out}`}`);
  };
  const { files } = await generate(root, storeConfig);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "templates-"));
  try {
    console.log("## generated files");
    await test("the committed generated files match the generator output", () => {
      const out = compare(files, committed);
      return out.length === 0 || out.join("; ");
    });
    await test("SRF-009.02 a changed bundle fails the check", () => {
      const out = compare(files, (file) => (file === BUNDLE ? `${committed(file)}\n// changed\n` : committed(file)));
      return out.length === 1 && out[0].includes(BUNDLE);
    });
    await test("the package list of the template README matches the esbuild metafile", async () => {
      const { packages } = await generateBundle(root);
      const readme = files.get(README)!;
      const listed = [...readme.matchAll(/^\d+\. `([^`]+)` /gm)].map((m) => m[1]);
      return (
        JSON.stringify(listed) === JSON.stringify(packages.map((p) => p.name)) &&
        packages.every((p) => p.license && readme.includes(`\`${p.name}\` ${p.version}: ${p.license}`)) ||
        `listed ${listed.join(", ")}`
      );
    });

    console.log("\n## agent guide");
    const store = storeSpecs(readRepository(root, [LEDGER]), [])!;
    await test("SRF-009.05 a guide that cites an unknown store identifier fails and names it", () => {
      const out = checkGuideCitations("Follow [PRS-999] and `[PRS-998]`.\n", store);
      return (out.length === 1 && out[0].startsWith("[guide-citation]") && out[0].includes("[PRS-999]")) || out.join("; ");
    });
    await test("the committed agent guide cites only live or retired store identifiers", () => {
      const out = checkGuideCitations(committed(GUIDE) ?? "", store);
      return (committed(GUIDE) !== undefined && out.length === 0) || out.join("; ") || "the guide is missing";
    });

    console.log("\n## template config");
    await test("SRF-012.01 a changed store rule fails the check until the template follows", () => {
      const changed = storeConfig.replace("Never reuse an identifier.", "Never reuse an identifier, ever.");
      if (changed === storeConfig) return "the store config has no text to change";
      const config = generateConfig(changed);
      const out = compare(new Map([[CONFIG, config.output!]]), committed);
      return out.length === 1 && out[0].includes(CONFIG);
    });
    await test("SRF-012.02 a store config without the find text of an edit fails and names the text", () => {
      const reworded = storeConfig.replace("Then run `npm run spec-ids`.", "Then run the spec-ids check.");
      if (reworded === storeConfig) return "the store config has no text to reword";
      const config = generateConfig(reworded);
      return (
        config.output === undefined &&
        config.failures.some((f) => f.startsWith("[template-edit]") && f.includes("Then run `npm run spec-ids`."))
      );
    });
    await test("SRF-012.03 the template names the binding checker for each store command", () => {
      const config = files.get(CONFIG)!;
      const parsed = YAML.parse(config);
      const entries = [...parsed.rules.specs, ...parsed.operations.archive.guidance] as string[];
      const checker = entries.filter((e) => e.includes("The binding checker checks") || e.includes("run the binding checker"));
      return (
        (!config.includes("npm run") && !config.includes("CONTRIBUTING.md") && checker.length === 3) ||
        `entries that name the binding checker: ${checker.length}`
      );
    });
    await test("the template keeps each other entry of the store config", () => {
      const store = YAML.parse(storeConfig);
      const template = YAML.parse(files.get(CONFIG)!);
      const edit = (s: string) => EDITS.reduce((v, e) => v.split(e.find).join(e.replace), s);
      return (
        template.context === store.context &&
        template.schema === store.schema &&
        JSON.stringify(template.rules.specs) === JSON.stringify([...store.rules.specs.map(edit), ...ADDED_RULES]) &&
        JSON.stringify(template.operations) === JSON.stringify(JSON.parse(JSON.stringify(store.operations, (_k, v) => (typeof v === "string" ? edit(v) : v)))) &&
        JSON.stringify(template.references) === JSON.stringify([REFERENCE])
      );
    });

    console.log("\n## binding checker bundle");
    // The bundle runs from a directory with no node_modules, against binding fixtures and this repository as the store.
    const bin = path.join(tmp, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "check-binding.mjs"), files.get(BUNDLE)!);
    const fixture = (name: string, mutate: (dir: string) => void = () => {}) => {
      const dir = path.join(tmp, name);
      fs.mkdirSync(path.join(dir, "openspec/specs/python-api"), { recursive: true });
      fs.copyFileSync(path.join(root, DIR, "openspec/spec-ids.yaml"), path.join(dir, "openspec/spec-ids.yaml"));
      fs.writeFileSync(path.join(dir, "openspec/config.yaml"), files.get(CONFIG)!);
      fs.writeFileSync(
        path.join(dir, "openspec/spec-ids.yaml"),
        fs.readFileSync(path.join(dir, "openspec/spec-ids.yaml"), "utf8").replace(
          "prefixes: {}",
          "prefixes:\n  PYB:\n    capability: python-api\n    next: 2",
        ),
      );
      fs.writeFileSync(
        path.join(dir, "openspec/specs/python-api/spec.md"),
        "# python-api Specification\n\n## Purpose\n\nThe Python API of the binding, as a test fixture.\n\n## Requirements\n\n" +
          "### Requirement: PYB-001 Parse with a callback\n\nThe binding SHALL call the callback with the result of [PRS-001].\n\n" +
          "#### Scenario: PYB-001.01 Callback gets the result\n\n- **WHEN** a caller parses a document with a callback\n" +
          "- **THEN** the callback gets the result\n",
      );
      const record = JSON.parse(fs.readFileSync(path.join(root, DIR, "openspec/traceability.json"), "utf8"));
      record.operations.push({ name: "parse_oscal", requirements: ["PRS-001"] }, { name: "parse_with_callback", "binding-local": "PYB-001" });
      fs.writeFileSync(path.join(dir, "openspec/traceability.json"), JSON.stringify(record, null, 2) + "\n");
      mutate(dir);
      execFileSync("git", ["init", "-q", dir]);
      return dir;
    };
    const run = (dir: string) =>
      spawnSync("node", [path.join(bin, "check-binding.mjs"), "--store", root], { cwd: dir, encoding: "utf8" });
    await test("SRF-009.03 the bundle runs with no node_modules and passes a valid binding", () => {
      const r = run(fixture("valid"));
      return r.status === 0 || `exit ${r.status}: ${r.stderr}`;
    });
    await test("the bundle fails a binding with a store prefix", () => {
      const r = run(
        fixture("store-prefix", (dir) => {
          const ledger = path.join(dir, "openspec/spec-ids.yaml");
          fs.writeFileSync(ledger, fs.readFileSync(ledger, "utf8").replace("prefixes:", "prefixes:\n  PRS:\n    capability: other\n    next: 1"));
        }),
      );
      return (r.status === 1 && r.stderr.includes("[store-prefix]")) || `exit ${r.status}: ${r.stderr}`;
    });
    await test("the bundle fails a binding with a duplicate operation name", () => {
      const r = run(
        fixture("duplicate", (dir) => {
          const file = path.join(dir, "openspec/traceability.json");
          const record = JSON.parse(fs.readFileSync(file, "utf8"));
          record.operations.push({ name: "parse_oscal", requirements: ["PRS-003"] });
          fs.writeFileSync(file, JSON.stringify(record));
        }),
      );
      return (r.status === 1 && r.stderr.includes("[record-duplicate]")) || `exit ${r.status}: ${r.stderr}`;
    });

    console.log("\n## pre-commit hook");
    await test("SRF-009.04 the hook fails for an archive with another hash, and runs no checker", () => {
      const dir = fixture("hook-hash");
      const archive = path.join(tmp, "store.tar.gz");
      execFileSync("tar", ["-czf", archive, "-C", root, "VERSION"]);
      const r = spawnSync("sh", [path.join(root, HOOK)], {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, OSCAL_SPECS_ARCHIVE: archive, OSCAL_SPECS_SHA256: "0".repeat(64) },
      });
      return (
        (r.status === 1 && r.stderr.includes("not the pinned") && !`${r.stdout}${r.stderr}`.includes("binding check")) ||
        `exit ${r.status}: ${r.stdout}${r.stderr}`
      );
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(failed ? `\n${failed} FAILED` : "\nall template scenarios pass");
  return failed ? 1 : 0;
}

if (process.argv[1] !== undefined && path.basename(process.argv[1]) === "templates.ts") {
  const exit = process.argv.includes("--self-test")
    ? selfTest()
    : main(process.argv.includes("--write") ? "write" : "check");
  exit.then((code) => process.exit(code));
}
