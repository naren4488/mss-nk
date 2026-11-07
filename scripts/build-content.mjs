// Reads the director plan markdown, turns it into structured JSON, and
// encrypts it with the portal password (PBKDF2 → AES-GCM).
// The encrypted output is committed so hosts can build without the plan or password.
// Output: public/plan.enc.json — the only copy of the plan that ships.
//
// Password comes from DIRECTOR_PASSWORD (env) or .env.local.
// Plan path comes from PLAN_MD (env), default ../docs/DIRECTOR_COMPANY_IMPROVEMENT_PLAN.md

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto as crypto } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) return {};
  return Object.fromEntries(
    readFileSync(p, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

const env = { ...loadEnvLocal(), ...process.env };
const password = env.DIRECTOR_PASSWORD;
const planPath = resolve(root, env.PLAN_MD || "../docs/DIRECTOR_COMPANY_IMPROVEMENT_PLAN.md");
const encPath = resolve(root, "public/plan.enc.json");
// Operations task catalog (moved from the admin app on 7 Nov 2026).
const tasksPath = resolve(root, env.TASKS_JSON || "../docs/mss-nk/tasks-catalog.json");

// On a host (Vercel etc.) the plan markdown and password are not available.
// Fall back to the committed, already-encrypted plan.
if (!password || !existsSync(planPath)) {
  if (existsSync(encPath)) {
    console.log(`Using committed public/plan.enc.json (${!password ? "no DIRECTOR_PASSWORD" : "plan markdown not found"}).`);
    process.exit(0);
  }
  console.error(!password ? "DIRECTOR_PASSWORD missing. Put it in mss-nk/.env.local" : `Plan not found: ${planPath}`);
  process.exit(1);
}
const md = readFileSync(planPath, "utf8");
const lines = md.split("\n");

// ---------- helpers ----------
function section(startPrefix, endPrefix) {
  const s = lines.findIndex((l) => l.startsWith(startPrefix));
  if (s < 0) throw new Error(`Section not found: ${startPrefix}`);
  let e = endPrefix ? lines.findIndex((l, i) => i > s && l.startsWith(endPrefix)) : -1;
  if (e < 0) e = lines.length;
  return lines.slice(s + 1, e);
}
function tableRows(block) {
  return block
    .filter((l) => l.trim().startsWith("|"))
    .slice(2) // header + separator
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
}
const strip = (s) => s.replace(/\*\*/g, "").trim();
const nums = (s) => (s.match(/\d+/g) || []).map(Number);
function listAfter(block, marker, numbered) {
  const i = block.findIndex((l) => l.includes(marker));
  if (i < 0) return [];
  const out = [];
  let started = false;
  for (const l of block.slice(i + 1)) {
    const m = numbered ? l.match(/^\d+\.\s+(.*)$/) : l.match(/^-\s+(.*)$/);
    if (m) { out.push(m[1].trim()); started = true; }
    else if (started && l.trim() === "") { if (out.length) break; }
    else if (started) out[out.length - 1] += " " + l.trim();
  }
  return out;
}

// ---------- Part 1: points ----------
const part1 = section("## Part 1", "## Part 2");
const groups = [];
const points = [];
let group = null;
for (const l of part1) {
  const g = l.match(/^###\s+([A-Z])\.\s+(.*)$/);
  if (g) { group = { id: g[1], title: g[2].trim() }; groups.push(group); continue; }
  const p = l.match(/^\*\*(\d+)\.\*\*\s+\*\*(.+?)\*\*\s*(.*)$/);
  if (p && group) points.push({ n: Number(p[1]), group: group.id, title: p[2].replace(/\.$/, ""), detail: p[3] });
}

// original wording from appendix
const appendix = section("## Appendix", null);
const original = {};
for (const l of appendix) {
  const m = l.match(/^(\d+)\.\s+(.*?)\s*$/);
  if (m) original[Number(m[1])] = m[2];
}
for (const p of points) p.original = original[p.n] || "";

// ---------- Part 2 ----------
const part2 = section("## Part 2", "## Part 3");
const loops = tableRows(part2).map(([name, pts, meaning]) => ({ name: strip(name), points: nums(pts), meaning }));
const failurePatterns = listAfter(part2, "Typical failure patterns", false);
const first90 = listAfter(part2, "First 90-day order", true);

// ---------- Part 3A / 3B ----------
const part3a = section("### 3A.", "### 3B.");
const guidance = [];
let cur = null;
for (const l of part3a) {
  const h = l.match(/^####\s+(.*)$/);
  if (h) { cur = { title: h[1].replace(/\s*\(.*\)\s*$/, ""), points: nums((h[1].match(/\(([^)]*)\)\s*$/) || ["", ""])[1]), bullets: [] }; guidance.push(cur); continue; }
  const b = l.match(/^-\s+(.*)$/);
  if (b && cur) cur.bullets.push(b[1]);
}
const part3b = section("### 3B.", "## Part 4");
const recommendations = [];
for (const l of part3b) {
  const m = l.match(/^\*\*(R\d+)\.\*\*\s+\*\*(.+?)\*\*\s*(.*)$/);
  if (m) recommendations.push({ id: m[1], title: m[2].replace(/\.$/, ""), detail: m[3] });
}

// ---------- Part 4 ----------
const part4 = section("## Part 4", "## Part 5");
const rhythm = tableRows(part4.slice(0, part4.findIndex((l) => l.startsWith("### What every manager")))).map(
  ([cadence, what, pts]) => ({ cadence: strip(cadence), what, points: nums(pts) }),
);
const managerBrings = listAfter(part4, "### What every manager brings", true);
const scorecard = listAfter(part4, "### Scorecard to build", false).map(strip);

// ---------- Part 5 / 6 ----------
const part5 = section("## Part 5", "## Part 6");
const currentOps = tableRows(part5).map(([intent, already, gap]) => ({ intent, already, gap }));
const part6 = section("## Part 6", "## Part 7");
const done90 = listAfter(part6, "You will know this plan is working", true);

// ---------- Part 7 ----------
const part7 = section("## Part 7", "## Appendix");
const s71 = part7.slice(part7.findIndex((l) => l.startsWith("### 7.1")), part7.findIndex((l) => l.startsWith("### 7.2")));
const departments = tableRows(s71).map(([name, manager, designations, owns, app]) => ({
  name: strip(name),
  manager: manager.replace(/_TBD_/g, "").trim(),
  designations,
  owns,
  app,
}));
const gapsLine = part7.find((l) => l.startsWith("**Known gaps"));
const gaps = gapsLine ? gapsLine.replace(/^\*\*Known gaps[^*]*\*\*\s*/, "") : "";
const s73 = part7.slice(part7.findIndex((l) => l.startsWith("### 7.3")));
const seedSheets = tableRows(s73)
  .filter((r) => !r[0].startsWith("_"))
  .map(([name, dept, owner, readers, freq, tracks, replace, status]) => ({ name, dept, owner, readers, freq, tracks, replace, status }));

const leadershipRule = (lines.find((l) => l.startsWith("**Leadership rule:**")) || "").replace("**Leadership rule:**", "").trim();
const updated = (lines.find((l) => l.startsWith("**Updated:**")) || "").replace("**Updated:**", "").trim();

const plan = {
  updated, leadershipRule, groups, points, loops, failurePatterns, first90, guidance, recommendations,
  rhythm, managerBrings, scorecard, currentOps, done90, departments, gaps, seedSheets,
  tasks: existsSync(tasksPath) ? JSON.parse(readFileSync(tasksPath, "utf8")) : undefined,
};
if (!plan.tasks) console.warn(`Task catalog not found (${tasksPath}); the Tasks page will be empty.`);

if (points.length === 0) throw new Error("No points parsed — check the plan format");

// ---------- encrypt ----------
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const iterations = 250000;
const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
  baseKey,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"],
);
const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(plan))));
const b64 = (u) => Buffer.from(u).toString("base64");
writeFileSync(
  resolve(root, "public/plan.enc.json"),
  JSON.stringify({ v: 1, iterations, salt: b64(salt), iv: b64(iv), data: b64(cipher) }),
);
console.log(`plan.enc.json: ${points.length} points, ${recommendations.length} recs, ${departments.length} departments, ${plan.tasks?.departments?.length ?? 0} task departments (from ${planPath})`);
