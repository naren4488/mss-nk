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

/**
 * People register. The plan's list (Part 7.2) seeds it; when that list changes, people missing
 * by name are added once. Edits and deletes made here stay in this browser.
 */
export function usePeople(plan?: Plan) {
  const [rows, setRows] = useStored<Row[]>("people", seedRows(plan));
  const [seeded, setSeeded] = useStored<string>("peopleSeed", "");
  const sig = (plan?.seedPeople ?? []).map((p) => key(p.name)).join("|");
  useEffect(() => {
    if (!plan || !sig || seeded === sig) return;
    setRows((prev) => {
      const have = new Set(prev.map((p) => key(p.name)));
      return [...prev, ...seedRows(plan).filter((p) => !have.has(key(p.name)))];
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
