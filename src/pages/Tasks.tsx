import { useMemo, useState } from "react";
import type { Plan } from "../types";
import { deptTaskCount, isMultiParty, matches, modeLabel, roleTaskCount, taskParties, type OpsRole, type OpsTask } from "../tasks";

/** Who does what: the operations task catalog per department and designation. */
export default function Tasks({ plan }: { plan: Plan }) {
  const depts = plan.tasks?.departments ?? [];
  const [deptId, setDeptId] = useState(depts[0]?.id ?? "");
  const dept = depts.find((d) => d.id === deptId) ?? depts[0];
  const [roleCode, setRoleCode] = useState(dept?.roles[0]?.code ?? "");
  const role = dept?.roles.find((r) => r.code === roleCode) ?? dept?.roles[0];
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // With a search, list every role's matching tasks across departments.
  const hits = useMemo(() => {
    if (!q) return [];
    const out: { dept: string; role: OpsRole; tasks: OpsTask[] }[] = [];
    for (const d of depts) for (const r of d.roles) {
      const ts = r.groups.flatMap((g) => g.tasks).filter((t) => matches(t, q));
      if (ts.length) out.push({ dept: d.name, role: r, tasks: ts });
    }
    return out;
  }, [depts, q]);

  if (!depts.length) {
    return (
      <div className="page">
        <h1>Tasks</h1>
        <p className="empty">The task catalog isn't in this build. Run <code>npm run content</code> with docs/mss-nk/tasks-catalog.json present.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Tasks: who does what</h1>
      <p className="muted" style={{ overflowWrap: "anywhere" }}>
        Every operational task by department and designation. The app's access rights are set from this list (designation matrix).
        Source: {plan.tasks?.source.split("/").pop()}, exported {plan.tasks?.exported}.
      </p>
      <div className="toolbar">
        <input type="search" placeholder="Search all tasks, e.g. DISCOM, payment, S12" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tasks" />
      </div>

      {q ? (
        hits.length === 0 ? (
          <p className="empty">No task matches “{query.trim()}”.</p>
        ) : (
          hits.map((h) => (
            <section key={h.role.code} className="card">
              <div className="card-title">{h.role.name} <span className="muted small">· {h.dept} · {h.tasks.length} match{h.tasks.length === 1 ? "" : "es"}</span></div>
              <ul className="task-list">{h.tasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
            </section>
          ))
        )
      ) : (
        <>
          <div className="chips-scroll" role="tablist" aria-label="Departments">
            {depts.map((d) => (
              <button key={d.id} role="tab" aria-selected={d.id === dept.id} className={`pick ${d.id === dept.id ? "on" : ""}`}
                onClick={() => { setDeptId(d.id); setRoleCode(d.roles[0]?.code ?? ""); }}>
                <span>{d.name}</span>
                <span className="small muted">{d.roles.length} roles · {deptTaskCount(d)} tasks</span>
              </button>
            ))}
          </div>
          <p className="muted small">{dept.description}</p>
          <div className="chips-scroll" role="tablist" aria-label="Roles">
            {dept.roles.map((r) => (
              <button key={r.code} role="tab" aria-selected={r.code === role?.code} className={`pick ${r.code === role?.code ? "on" : ""}`} onClick={() => setRoleCode(r.code)}>
                <span>{r.name}</span>
                <span className="small muted">{roleTaskCount(r)} tasks</span>
              </button>
            ))}
          </div>
          {role && <RolePanel role={role} />}
        </>
      )}
    </div>
  );
}

function RolePanel({ role }: { role: OpsRole }) {
  const multi = role.groups.reduce((n, g) => n + g.tasks.filter(isMultiParty).length, 0);
  return (
    <div className="card">
      <div className="muted small">{role.code}</div>
      <h2 style={{ marginTop: 2 }}>{role.name}</h2>
      <p>{role.goal}</p>
      <div className="row">
        <span className="chip on">{roleTaskCount(role)} tasks</span>
        {multi > 0 && <span className="chip">{multi} involve several roles</span>}
      </div>
      {role.modelNotes.length > 0 && (
        <div className="guidance">
          <strong className="small">How this role works</strong>
          <ul>{role.modelNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}
      {role.groups.map((g) => (
        <section key={g.title}>
          <h3 style={{ marginTop: 18 }}>{g.title}</h3>
          <ul className="task-list">{g.tasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
        </section>
      ))}
      {role.extrasNote && <p className="muted small">{role.extrasNote}</p>}
      {role.outOfScope?.length ? (
        <div className="guidance">
          <strong className="small">Not this role's job</strong>
          <ul>{role.outOfScope.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

function TaskRow({ t }: { t: OpsTask }) {
  const parties = taskParties(t);
  const multi = isMultiParty(t);
  const mode = modeLabel(t.multiMode);
  return (
    <li className={multi ? "multi" : ""}>
      <span className="num">{t.id}</span>
      <div style={{ minWidth: 0 }}>
        <div className="card-title">{t.title}</div>
        <div className="muted small">→ {t.outcome}</div>
        {(parties.length > 0 || t.who) && (
          <div className="who">
            {mode && <span className="small muted">{mode}: </span>}
            {parties.map((p) => <span key={p} className={`chip ${multi ? "on" : ""}`}>{p}</span>)}
            {t.who && (parties.length === 0 || multi) && <div className="small muted">{t.who}</div>}
          </div>
        )}
      </div>
    </li>
  );
}
