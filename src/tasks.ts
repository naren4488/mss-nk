// Operations task catalog (who does what), moved here from the admin app's
// temporary "Tasks List" page on 7 Nov 2026. Source: docs/mss-nk/tasks-catalog.json,
// exported from docs/BUSINESS_OPERATIONS_TASKS_BY_DESIGNATION.md; shipped encrypted with the plan.

export type OpsMultiMode = "shared" | "either" | "collaborate" | "handoff";
export type OpsTask = { id: string; title: string; outcome: string; who?: string; parties?: string[]; multiMode?: OpsMultiMode };
export type OpsTaskGroup = { title: string; tasks: OpsTask[] };
export type OpsRole = { code: string; name: string; goal: string; modelNotes: string[]; groups: OpsTaskGroup[]; outOfScope?: string[]; extrasNote?: string };
export type OpsDepartment = { id: string; name: string; description: string; roles: OpsRole[] };
export type TaskCatalog = { source: string; exported: string; departments: OpsDepartment[] };

const NOT_A_PARTY = /^(anyone|any|self|incl\.?|including|mostly|usually|optional|system|assignee)$/i;

/** Party chips: explicit parties, else split the free-text "who" line. */
export function taskParties(t: OpsTask): string[] {
  if (t.parties?.length) return t.parties;
  if (!t.who?.trim()) return [];
  const seen = new Set<string>();
  return t.who
    .replace(/\([^)]*\)/g, " ")
    .split(/\s*(?:\/|,|\+|·|&|\bor\b|\band\b|→|->)\s*/i)
    .map((p) => p.replace(/^[\s\-–—]+|[\s\-–—]+$/g, "").trim())
    .filter((p) => p && !NOT_A_PARTY.test(p))
    .filter((p) => (seen.has(p.toLowerCase()) ? false : (seen.add(p.toLowerCase()), true)));
}

export const isMultiParty = (t: OpsTask) => !!t.multiMode || taskParties(t).length > 1;

export function modeLabel(m?: OpsMultiMode): string | null {
  return m === "shared" ? "Shared: any of these roles"
    : m === "either" ? "Either role can do this"
    : m === "collaborate" ? "Several roles involved"
    : m === "handoff" ? "Hand-off between roles"
    : null;
}

export const roleTaskCount = (r: OpsRole) => r.groups.reduce((n, g) => n + g.tasks.length, 0);
/** Distinct task ids in a department (shared task lists count once). */
export const deptTaskCount = (d: OpsDepartment) => new Set(d.roles.flatMap((r) => r.groups.flatMap((g) => g.tasks.map((t) => t.id)))).size;

export function matches(t: OpsTask, q: string): boolean {
  if (!q) return true;
  return `${t.id} ${t.title} ${t.outcome} ${t.who ?? ""} ${taskParties(t).join(" ")}`.toLowerCase().includes(q);
}
