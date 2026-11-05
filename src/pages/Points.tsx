import { useMemo, useState } from "react";
import type { Plan, Point } from "../types";
import { POINT_STATUSES, usePointState } from "../data";
import { Md } from "../md";

export default function Points({ plan }: { plan: Plan }) {
  const [state, setState] = usePointState();
  const [view, setView] = useState<"theme" | "loop">("theme");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const byN = useMemo(() => new Map(plan.points.map((p) => [p.n, p])), [plan]);
  const match = (p: Point) => {
    const s = state[p.n]?.status || "Not started";
    if (status && s !== status) return false;
    if (!q) return true;
    const hay = `${p.n} ${p.title} ${p.detail} ${p.original} ${state[p.n]?.owner ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const sections =
    view === "theme"
      ? plan.groups.map((g) => ({ key: g.id, title: `${g.id}. ${g.title}`, sub: "", points: plan.points.filter((p) => p.group === g.id) }))
      : plan.loops.map((l) => ({ key: l.name, title: l.name, sub: l.meaning, points: l.points.map((n) => byN.get(n)!).filter(Boolean) }));

  return (
    <div className="page">
      <h1>Director's {plan.points.length} points</h1>
      <div className="toolbar">
        <div className="seg">
          <button className={view === "theme" ? "on" : ""} onClick={() => setView("theme")}>By theme</button>
          <button className={view === "loop" ? "on" : ""} onClick={() => setView("loop")}>By loop</button>
        </div>
        <input placeholder="Search points…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {POINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {sections.map((s) => {
        const pts = s.points.filter(match);
        if (pts.length === 0) return null;
        return (
          <section key={s.key}>
            <h2>{s.title}</h2>
            {s.sub && <p className="muted"><Md text={s.sub} /></p>}
            {pts.map((p) => (
              <PointCard
                key={p.n}
                p={p}
                plan={plan}
                st={state[p.n] ?? {}}
                onChange={(patch) => setState((prev) => ({ ...prev, [p.n]: { ...prev[p.n], ...patch } }))}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function PointCard({
  p,
  plan,
  st,
  onChange,
}: {
  p: Point;
  plan: Plan;
  st: { status?: string; owner?: string; note?: string };
  onChange: (patch: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const guidance = plan.guidance.filter((g) => g.points.includes(p.n));
  const status = st.status || "Not started";
  return (
    <div className={`card ${status === "Done" || status === "Habit (ongoing)" ? "done" : ""}`}>
      <div className="card-head" onClick={() => setOpen((o) => !o)}>
        <span className="num">{p.n}</span>
        <div style={{ flex: 1 }}>
          <div className="card-title">{p.title}</div>
          <div className="muted small"><Md text={p.detail} /></div>
        </div>
        <span className={`chip ${status === "In progress" ? "on" : ""}`}>{status}</span>
      </div>
      {open && (
        <div className="card-body">
          <div className="row">
            <label className="field">
              <span>Status</span>
              <select value={status} onChange={(e) => onChange({ status: e.target.value })}>
                {POINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Owner</span>
              <input value={st.owner ?? ""} placeholder="Named person" onChange={(e) => onChange({ owner: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Note / next step</span>
            <textarea rows={2} value={st.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} />
          </label>
          {p.original && (
            <p className="muted small"><strong>Your words:</strong> {p.original}</p>
          )}
          {guidance.map((g) => (
            <div key={g.title} className="guidance">
              <div className="small"><strong>How to operate — {g.title}</strong></div>
              <ul>
                {g.bullets.map((b, i) => <li key={i}><Md text={b} /></li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
