import type { Plan, Row } from "./types";
import { newId, useStored } from "./store";

export const POINT_STATUSES = ["Not started", "In progress", "Done", "Habit (ongoing)"] as const;
export type PointState = { status?: string; owner?: string; note?: string };

export const usePointState = () => useStored<Record<number, PointState>>("points", {});
export const usePending = () => useStored<Row[]>("pending", []);
export const usePeople = () => useStored<Row[]>("people", []);
export const useDeptManagers = () => useStored<Record<string, string>>("deptManagers", {});
export const useRecChoice = () => useStored<Record<string, string>>("recs", {});
export const useSheets = (plan: Plan) =>
  useStored<Row[]>(
    "sheets",
    plan.seedSheets.map((s) => ({ ...s, id: newId() }) as Row),
  );

export const PENDING_STATUSES = ["open", "in progress", "stuck", "done"];
export const deptNames = (plan: Plan) => plan.departments.map((d) => d.name);
