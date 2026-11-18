import type { Plan, Row } from "./types";
import { useEffect } from "react";
import { newId, useStored } from "./store";

export const POINT_STATUSES = ["Not started", "In progress", "Done", "Habit (ongoing)"] as const;
export type PointState = { status?: string; owner?: string; note?: string };

export const usePointState = () => useStored<Record<number, PointState>>("points", {});
export const usePending = () => useStored<Row[]>("pending", []);
/** A person can hold several designations (as in the admin software), kept comma-separated. */
export const splitList = (s?: string) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const seedRows = (plan?: Plan) => (plan?.seedPeople ?? []).map((p) => ({ ...p, id: newId() }) as Row);
const key = (n?: string) => (n ?? "").trim().toLowerCase();
/** Names in an earlier seed signature (old format: names joined by "|"). */
function seededNames(sig: string): Set<string> {
  try { return new Set((JSON.parse(sig) as Record<string, string>[]).map((p) => key(p.name))); }
  catch { return new Set(sig.split("|")); }
}

/**
 * People register. The plan's list (Part 7.2) seeds it; when that list changes, people missing
 * by name are added and their empty fields filled from it, once. Edits and deletes made here win.
 */
export function usePeople(plan?: Plan) {
  const [rows, setRows] = useStored<Row[]>("people", seedRows(plan));
  const [seeded, setSeeded] = useStored<string>("peopleSeed", "");
  const sig = plan?.seedPeople?.length ? JSON.stringify(plan.seedPeople) : "";
  useEffect(() => {
    if (!plan || !sig || seeded === sig) return;
    const firstTime = seeded === "";
    setRows((prev) => {
      const seed = seedRows(plan);
      const byName = new Map(seed.map((p) => [key(p.name), p]));
      const merged = prev.map((r) => {
        const s = byName.get(key(r.name));
        if (!s) return r;
        const out = { ...r };
        for (const [k, v] of Object.entries(s)) if (k !== "id" && v && !out[k]) out[k] = v;
        return out;
      });
      const have = new Set(prev.map((p) => key(p.name)));
      // A person deleted here after the first seeding is not brought back.
      return [...merged, ...seed.filter((p) => !have.has(key(p.name)) && (firstTime || !(seededNames(seeded).has(key(p.name)))))];
    });
    setSeeded(sig);
  }, [plan, sig, seeded, setRows, setSeeded]);
  return [rows, setRows] as const;
}
export const useDeptManagers = () => useStored<Record<string, string>>("deptManagers", {});
export const useRecChoice = () => useStored<Record<string, string>>("recs", {});
export const useSheets = (plan: Plan) =>
  useStored<Row[]>(
    "sheets",
    plan.seedSheets.map((s) => ({ ...s, id: newId() }) as Row),
  );

export const PENDING_STATUSES = ["open", "in progress", "stuck", "done"];
export const deptNames = (plan: Plan) => plan.departments.map((d) => d.name);

/** Every designation with its department, from the department map (Part 7.1). */
export const designationList = (plan: Plan) =>
  plan.departments.flatMap((d) => splitList(d.designations).map((name) => ({ name, dept: d.name })));

/** Departments a person belongs to, from their designations (old rows: their saved department too). */
export function personDepts(plan: Plan, p: Row): string[] {
  const byName = new Map(designationList(plan).map((x) => [x.name.toLowerCase(), x.dept]));
  const out = splitList(p.designation).map((d) => byName.get(d.toLowerCase())).filter((d): d is string => !!d);
  if (p.department) out.push(p.department);
  return [...new Set(out)];
}
