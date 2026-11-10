// Parses mahisolarsolution-frontend/docs/OVERALL_PROJECT_STATUS.md into
// structured data for the "Admin Software" page.
//
// Block types (rendered by src/pages/Software.tsx):
//   { t: "p", text }                 paragraph
//   { t: "ul", items: [{ text, children: [text] }] }
//   { t: "ol", items: [text] }
//   { t: "table", head: [..], rows: [[..]] }

const TAG_RE = /\[(no backend|backend only|placeholder|demo)\]/gi;

export function toBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim() || l.trim() === "---") { i++; continue; }
    if (l.trim().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i++;
      }
      blocks.push({ t: "table", head: rows[0], rows: rows.slice(2) });
      continue;
    }
    if (/^- /.test(l)) {
      const items = [];
      while (i < lines.length && /^(\s+)?- /.test(lines[i])) {
        const m = lines[i].match(/^(\s*)- (.*)$/);
        if (m[1].length > 0 && items.length) items[items.length - 1].children.push(m[2]);
        else items.push({ text: m[2], children: [] });
        i++;
      }
      blocks.push({ t: "ul", items });
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, "")); i++; }
      blocks.push({ t: "ol", items });
      continue;
    }
    blocks.push({ t: "p", text: l.trim() });
    i++;
  }
  return blocks;
}

/**
 * Splits a Features section into groups. A group starts at:
 *  - a heading line: "**Login (`/login`)**" or "**Teams list (...)** (note)" → title + note
 *  - a label line: "**Automatic:** text" → its own group, text as the body
 */
function toGroups(lines) {
  const groups = [];
  let cur = null;
  const push = (title, note) => { cur = { title, note, lines: [] }; groups.push(cur); };
  for (const l of lines) {
    const label = l.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    const heading = l.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
    if (label && !label[2].trim()) { push(label[1], ""); continue; } // "**Open:**" then bullets
    if (label) { push(label[1], ""); cur.lines.push(label[2]); cur = null; continue; }
    if (heading) { push(heading[1], heading[2].replace(/^[—–-]\s*/, "").replace(/^\((.*)\)$/, "$1")); continue; }
    if (!cur) { if (!l.trim()) continue; push("General", ""); }
    cur.lines.push(l);
  }
  return groups.map((g) => ({ title: g.title, note: g.note, blocks: toBlocks(g.lines) })).filter((g) => g.blocks.length || g.note);
}

function statusKind(s) {
  const x = s.toLowerCase();
  // "reviewed and done (…)" or "reviewed 8 Nov 2026 (…)"; not "not reviewed" / "review not done"
  if (/^reviewed\b/.test(x)) return "done";
  if (x.includes("next in the review") || x.includes("in progress")) return "next";
  if (x.includes("superseded")) return "legacy";
  return "pending";
}

export function parseStatus(md) {
  const lines = md.split("\n");
  const meta = {};
  for (const l of lines.slice(0, 12)) {
    const m = l.match(/^\*\*(Updated|Repos|Purpose|Full endpoint list):\*\*\s*(.*)$/);
    if (m) meta[m[1].toLowerCase().replace(/ /g, "_")] = m[2];
  }

  // split by "## "
  const sections = [];
  let cur = null;
  for (const l of lines) {
    const h = l.match(/^## (.*)$/);
    if (h) { cur = { title: h[1].trim(), lines: [] }; sections.push(cur); continue; }
    if (cur) cur.lines.push(l);
  }

  const info = [];
  const modules = [];
  let moduleMap = [];
  for (const s of sections) {
    const num = s.title.match(/^(\d+)\.\s+(.*)$/);
    if (!num) {
      if (/^Module map/i.test(s.title)) {
        const t = toBlocks(s.lines).find((b) => b.t === "table");
        moduleMap = t ? t.rows.map(([n, name, screens, tables, apis]) => ({ n: Number(n), name, screens, tables, apis })) : [];
        continue;
      }
      info.push({ title: s.title, blocks: toBlocks(s.lines) });
      continue;
    }
    // module: preamble + ### subsections
    const subs = { pre: [] };
    let key = "pre";
    for (const l of s.lines) {
      const h3 = l.match(/^### (.*)$/);
      if (h3) { key = h3[1].trim().toLowerCase(); subs[key] = []; continue; }
      subs[key].push(l);
    }
    const what = (subs.pre.find((l) => l.startsWith("**What it does:**")) || "").replace("**What it does:**", "").trim();
    const review = subs["review status"] || [];
    const statusLine = (review.find((l) => l.startsWith("**Status:**")) || "").replace("**Status:**", "").trim();
    const all = s.lines.join("\n");
    const tags = { "no backend": 0, "backend only": 0, placeholder: 0, demo: 0 };
    for (const m of all.matchAll(TAG_RE)) tags[m[1].toLowerCase()]++;
    tags["backend only"] += (all.match(/\*\*Backend only:\*\*/g) || []).length;
    modules.push({
      n: Number(num[1]),
      title: num[2].trim(),
      what,
      status: statusLine,
      kind: statusKind(statusLine),
      tags,
      features: toGroups(subs.features || []),
      apis: toBlocks(subs.apis || []),
      review: toGroups(review.filter((l) => !l.startsWith("**Status:**"))),
      text: all.replace(/[*`]/g, "").toLowerCase(),
    });
  }
  for (const m of modules) m.map = moduleMap.find((r) => r.n === m.n) || null;
  return { meta, info, modules };
}

// Test data and logins page block: "# title", "**Updated:** …", then "## section" blocks.
export function parseTestData(md) {
  const lines = md.split("\n");
  const updated = (lines.find((l) => l.startsWith("**Updated:**")) || "").replace("**Updated:**", "").trim();
  const sections = [];
  let cur = null;
  for (const l of lines) {
    if (l.startsWith("## ")) {
      cur = { title: l.slice(3).trim(), lines: [] };
      sections.push(cur);
    } else if (cur) cur.lines.push(l);
  }
  return { updated, sections: sections.map((x) => ({ title: x.title, blocks: toBlocks(x.lines) })) };
}
