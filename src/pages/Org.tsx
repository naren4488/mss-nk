import type { Plan } from "../types";
import { EditableTable } from "../components/EditableTable";
import { deptNames, useDeptManagers, usePeople } from "../data";
import { Md } from "../md";

export default function Org({ plan }: { plan: Plan }) {
  const [managers, setManagers] = useDeptManagers();
  const [people, setPeople] = usePeople();
  const names = people.map((p) => p.name).filter(Boolean);

  return (
    <div className="page">
      <h1>Departments & people</h1>
      <p className="muted">Points 2, 3, 4, 15, 42 — every row ends with a named person, not a team.</p>

      <section>
        <h2>Departments</h2>
        <div className="grid">
          {plan.departments.map((d) => {
            const m = managers[d.name] ?? d.manager;
            const staff = people.filter((p) => p.department === d.name);
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
                <p className="small"><strong>Roles:</strong> {d.designations}</p>
                <p className="small"><strong>Owns:</strong> <Md text={d.owns} /></p>
                <p className="small muted"><strong>In admin app:</strong> {d.app}</p>
                <p className="small muted">{staff.length} people registered</p>
              </div>
            );
          })}
        </div>
        <datalist id="people-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
        {plan.gaps && <p className="muted small"><strong>Known gaps:</strong> <Md text={plan.gaps} /></p>}
      </section>

      <section>
        <h2>People register</h2>
        <EditableTable
          rows={people}
          setRows={setPeople}
          addLabel="Add employee"
          empty="No employees yet. Add each person with their work, sheets, and backup."
          columns={[
            { key: "name", label: "Employee" },
            { key: "department", label: "Department", type: "select", options: deptNames(plan) },
            { key: "designation", label: "Designation" },
            { key: "reportsTo", label: "Reports to" },
            { key: "responsibilities", label: "Top 5 responsibilities", type: "textarea", inTable: false },
            { key: "sheets", label: "Sheets / data they maintain", type: "textarea" },
            { key: "checkpoints", label: "Checkpoints they verify (44)", type: "textarea", inTable: false },
            { key: "backup", label: "Backup person (35)" },
            { key: "phone", label: "Phone", inTable: false },
          ]}
        />
      </section>
    </div>
  );
}
