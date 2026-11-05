import { useState } from "react";
import type { Plan } from "../types";
import { EditableTable } from "../components/EditableTable";
import { PENDING_STATUSES, deptNames, usePending } from "../data";
import { isOverdue, today } from "../store";

export default function Pending({ plan }: { plan: Plan }) {
  const [rows, setRows] = usePending();
  const [filter, setFilter] = useState("active");

  const shown = rows
    .filter((r) => (filter === "active" ? r.status !== "done" : filter === "all" ? true : r.status === filter))
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.due || "9").localeCompare(b.due || "9"));

  return (
    <div className="page">
      <h1>Issues & pending work</h1>
      <p className="muted">
        Point 40: one list — what is broken, what is pending, owner, date. Review this first in every manager meeting. New targets come after old
        items have an owner and a date.
      </p>
      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="active">Not done</option>
          <option value="all">All</option>
          {PENDING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <EditableTable
        rows={shown}
        setRows={(fn) => setRows((prev) => {
          // edits come in against the filtered view; merge back into the full list
          const next = fn(shown);
          const shownIds = new Set(shown.map((r) => r.id));
          return [...prev.filter((r) => !shownIds.has(r.id)), ...next];
        })}
        addLabel="Add issue / pending item"
        empty="No items here yet."
        defaults={{ status: "open", since: today() }}
        rowTone={(r) => (r.status === "done" ? "done" : isOverdue(r) || r.status === "stuck" ? "warn" : undefined)}
        columns={[
          { key: "what", label: "What is wrong / pending", type: "textarea" },
          { key: "where", label: "Where", type: "select", options: [...deptNames(plan), "Client / project", "Internal"] },
          { key: "owner", label: "Owner" },
          { key: "since", label: "Pending since", type: "date", inTable: false },
          { key: "next", label: "Next action", type: "textarea" },
          { key: "due", label: "Due", type: "date" },
          { key: "status", label: "Status", type: "select", options: PENDING_STATUSES },
          { key: "blocked", label: "Blocked by", inTable: false },
          { key: "points", label: "Linked points (e.g. 24, 26)", inTable: false },
        ]}
      />
    </div>
  );
}
