import fs from "node:fs";
import { evaluateManifest } from "./scripts/constraints-manifest.js";
const man = JSON.parse(fs.readFileSync("manifest/1.2.3/constraints.json", "utf8"));
const entries = man.entries.filter((e: any) => e.kind === "allowed-values");
const out: Record<string, string[]> = {};
const dirs = ["corpus/1.2.3/documents/valid", "corpus/1.2.3/documents/invalid/constraints"];
for (const d of dirs) for (const f of fs.readdirSync(d)) if (f.endsWith(".json")) {
  const doc = JSON.parse(fs.readFileSync(`${d}/${f}`, "utf8"));
  out[`${d}/${f}`] = evaluateManifest(entries, doc, { document: true }).map((x) => String(x.id)).sort();
}
const extra = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const c of extra) out["extra/" + c.id] = evaluateManifest(entries, c.document, { document: true }).map((x) => String(x.id)).sort();
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
