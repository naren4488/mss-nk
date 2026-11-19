import { useState } from "react";
import type { Plan, Row } from "../types";
import { EditableTable } from "../components/EditableTable";
import { designationList, personDepts, splitList, useDeptManagers, usePeople } from "../data";
import { Md } from "../md";
import { useStored } from "../store";

export default function Org({ plan }: { plan: Plan }) {
  const [managers, setManagers] = useDeptManagers();
  const [people, setPeople] = usePeople(plan);
  const names = people.map((p) => p.name).filter(Boolean);
  const [mode, setMode] = useStored<"dept" | "table">("peopleView", "dept");
  const [q, setQ] = useState("");
  const [only, setOnly] = useState("");
  const managerOf = (dept: string) => managers[dept] || plan.departments.find((d) => d.name === dept)?.manager || "";
  const needle = q.trim().toLowerCase();
  const shown = people.filter(
    (p) =>
      (!needle || [p.name, p.designation, p.reportsTo, p.phone].some((v) => (v ?? "").toLowerCase().includes(needle))) &&
      (!only || personDepts(plan, p).includes(only)),
  );
  const counts = new Map(plan.departments.map((d) => [d.name, people.filter((p) => personDepts(plan, p).includes(d.name)).length]));
  const holders = (designation: string) =>
    people.filter((p) => splitList(p.designation).some((d) => d.toLowerCase() === designation.toLowerCase())).map((p) => p.name);

  return (
    <div className="page">
      <h1>Departments & people</h1>
      <p className="muted">Points 2, 3, 4, 15, 42 — every row ends with a named person, not a team. A person can hold several designations, as in the admin software.</p>

      <section>
        <h2>Employees</h2>
        <div className="dept-chips" role="group" aria-label="Show one department">
          <button className={`chip-btn ${only ? "" : "on"}`} onClick={() => setOnly("")}>
            All <b>{people.length}</b>
          </button>
          {plan.departments.map((d) => (
            <button key={d.name} className={`chip-btn ${only === d.name ? "on" : ""}`} onClick={() => setOnly(only === d.name ? "" : d.name)}>
              {d.name} <b>{counts.get(d.name)}</b>
            </button>
          ))}
        </div>
        <EditableTable
          rows={people}
          shown={shown}
          toolbarExtra={
            <>
              <input className="search" type="search" placeholder="Search name, designation, phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employees" />
              <div className="seg" role="group" aria-label="View">
                <button className={mode === "dept" ? "on" : ""} onClick={() => setMode("dept")}>By department</button>
                <button className={mode === "table" ? "on" : ""} onClick={() => setMode("table")}>Table</button>
              </div>
            </>
          }
          view={mode === "dept" ? (rows, edit) => <DeptGroups plan={plan} rows={rows} edit={edit} managerOf={managerOf} only={only} searching={!!needle} /> : undefined}
          setRows={setPeople}
          addLabel="Add employee"
          empty="No employees yet. Add each person with their work, sheets, and backup."
          columns={[
            { key: "name", label: "Employee" },
            { key: "department", label: "Department", display: (r) => personDepts(plan, r).join(", ") },
            { key: "designation", label: "Designations", type: "multi", options: designationList(plan).map((x) => x.name) },
            { key: "reportsTo", label: "Reports to", type: "multi", options: names },
            { key: "responsibilities", label: "Top 5 responsibilities", type: "textarea", inTable: false },
            { key: "sheets", label: "Sheets / data they maintain", type: "textarea" },
            { key: "checkpoints", label: "Checkpoints they verify (44)", type: "textarea", inTable: false },
            { key: "backup", label: "Backup person (35)", type: "select", options: names },
            { key: "phone", label: "Phone", inTable: false },
          ]}
        />
      </section>
      <section>
        <h2>Departments</h2>
        <div className="grid">
          {plan.departments.map((d) => {
            const m = managers[d.name] ?? d.manager;
            const staff = people.filter((p) => personDepts(plan, p).includes(d.name));
            return (
              <div key={d.name} className={`card ${m ? "" : "warn"}`}>
                <div className="card-title">{d.name}</div>
                <label className="field">
                  <span>Manager</span>
                  <input
                    list="people-names"
                    value={m}
                    placeholder="Name a manager"
                    onChange={(e) => setManagers((prev) => ({ ...prev, [d.name]: e.target.value }))}
                  />
                </label>
                <ul className="holders">
                  {splitList(d.designations).map((r) => {
                    const h = holders(r);
                    return (
                      <li key={r}>
                        <span className="role">{r}</span>
                        <span className={h.length ? "" : "muted"}>{h.length ? h.join(", ") : "nobody"}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="small"><strong>Owns:</strong> <Md text={d.owns} /></p>
                <p className="small muted"><strong>In admin app:</strong> {d.app}</p>
                <p className="small muted">{staff.length} {staff.length === 1 ? "person" : "people"}</p>
              </div>
            );
          })}
        </div>
        <datalist id="people-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
        {plan.gaps && <p className="muted small"><strong>Known gaps:</strong> <Md text={plan.gaps} /></p>}
      </section>

    </div>
  );
}

/** Employees grouped by department: manager first, then in the department's designation order. */
function DeptGroups({ plan, rows, edit, managerOf, only, searching }: {
  plan: Plan; rows: Row[]; edit: (r: Row) => void; managerOf: (dept: string) => string; only: string; searching: boolean;
}) {
  const depts = plan.departments.filter((d) => !only || d.name === only);
  const loose = only ? [] : rows.filter((p) => personDepts(plan, p).length === 0);
  if (rows.length === 0) return <p className="empty">Nobody matches.</p>;
  return (
    <div className="dept-groups">
      {depts.map((d) => {
        const order = splitList(d.designations).map((x) => x.toLowerCase());
        const rank = (p: Row) => Math.min(...splitList(p.designation).map((x) => order.indexOf(x.toLowerCase())).filter((i) => i >= 0), 99);
        const mgr = managerOf(d.name);
        const isMgr = (p: Row) => !!mgr && p.name.trim().toLowerCase() === mgr.trim().toLowerCase();
        const members = rows
          .filter((p) => personDepts(plan, p).includes(d.name))
          .sort((a, b) => Number(isMgr(b)) - Number(isMgr(a)) || rank(a) - rank(b) || a.name.localeCompare(b.name));
        if (members.length === 0 && searching) return null;
        return (
          <section key={d.name} className="dept-group">
            <header>
              <h3>{d.name}</h3>
              <span className="muted small">{members.length} {members.length === 1 ? "person" : "people"}{mgr ? ` · Manager: ${mgr}` : " · No manager"}</span>
            </header>
            {members.length === 0 ? (
              <p className="muted small">Nobody here yet.</p>
            ) : (
              <div className="people-grid">
                {members.map((p) => (
                  <PersonTile key={p.id} p={p} plan={plan} dept={d.name} manager={isMgr(p)} onOpen={() => edit(p)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
      {loose.length > 0 && (
        <section className="dept-group">
          <header><h3>No department</h3><span className="muted small">pick a designation to place them</span></header>
          <div className="people-grid">
            {loose.map((p) => <PersonTile key={p.id} p={p} plan={plan} dept="" manager={false} onOpen={() => edit(p)} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function PersonTile({ p, plan, dept, manager, onOpen }: { p: Row; plan: Plan; dept: string; manager: boolean; onOpen: () => void }) {
  const inDept = new Set(
    splitList(plan.departments.find((d) => d.name === dept)?.designations).map((x) => x.toLowerCase()),
  );
  const also = personDepts(plan, p).filter((x) => x !== dept);
  return (
    <button type="button" className={`person ${manager ? "mgr" : ""}`} onClick={onOpen} title="Open to edit">
      <span className="person-name">
        {p.name || "Unnamed"}
        {manager && <span className="badge">Manager</span>}
      </span>
      <span className="person-roles">
        {splitList(p.designation).map((x) => (
          <span key={x} className={`chip ${inDept.has(x.toLowerCase()) ? "on" : ""}`}>{x}</span>
        ))}
      </span>
      {p.reportsTo && <span className="small muted">Reports to {p.reportsTo}</span>}
      {also.length > 0 && <span className="small muted">Also in {also.join(", ")}</span>}
      {p.phone && <span className="small">{p.phone}</span>}
    </button>
  );
}
