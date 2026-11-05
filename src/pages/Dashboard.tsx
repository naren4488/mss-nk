import type { Plan } from "../types";
import { isOverdue, today } from "../store";
import { useDeptManagers, usePending, usePeople, usePointState, useSheets } from "../data";
import { Md } from "../md";

export default function Dashboard({ plan }: { plan: Plan }) {
  const [state] = usePointState();
  const [pending] = usePending();
  const [people] = usePeople();
  const [sheets] = useSheets(plan);
  const [managers] = useDeptManagers();

  const st = (n: number) => state[n]?.status || "Not started";
  const done = plan.points.filter((p) => ["Done", "Habit (ongoing)"].includes(st(p.n))).length;
  const inProg = plan.points.filter((p) => st(p.n) === "In progress").length;
  const open = pending.filter((r) => r.status !== "done");
  const overdue = open.filter(isOverdue);
  const stuck = open.filter((r) => r.status === "stuck");
  const noManager = plan.departments.filter((d) => !(managers[d.name] ?? d.manager));
  const urgent = [...overdue, ...stuck.filter((s) => !overdue.includes(s))].sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="rule"><Md text={plan.leadershipRule} /></p>

      <div className="tiles">
        <Tile label="Points done / habit" value={`${done} / ${plan.points.length}`} href="#/points" />
        <Tile label="Points in progress" value={inProg} href="#/points" />
        <Tile label="Open issues & pending" value={open.length} href="#/pending" />
        <Tile label="Overdue" value={overdue.length} href="#/pending" alert={overdue.length > 0} />
        <Tile label="Stuck" value={stuck.length} href="#/pending" alert={stuck.length > 0} />
        <Tile label="Departments without manager" value={noManager.length} href="#/org" alert={noManager.length > 0} />
        <Tile label="People registered" value={people.length} href="#/org" />
        <Tile label="Sheets registered" value={sheets.length} href="#/sheets" />
      </div>

      <section>
        <h2>Overdue and stuck</h2>
        {urgent.length === 0 ? (
          <p className="empty">Nothing overdue or stuck{pending.length === 0 ? " — start the list on Issues & Pending (point 40)" : ""}.</p>
        ) : (
          <ul className="list">
            {urgent.slice(0, 10).map((r) => (
              <li key={r.id}>
                <strong>{r.what}</strong> <span className="muted">— {r.owner || "no owner"} · due {r.due || "—"} · {r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {noManager.length > 0 && (
        <section>
          <h2>Departments with no named manager</h2>
          <p>{noManager.map((d) => d.name).join(", ")}</p>
        </section>
      )}

      <section>
        <h2>Your rhythm</h2>
        <p className="muted small">Today: {today()}</p>
        <ul className="list">
          {plan.rhythm.map((r) => (
            <li key={r.cadence}>
              <strong>{r.cadence}</strong> — <Md text={r.what} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value, href, alert }: { label: string; value: string | number; href: string; alert?: boolean }) {
  return (
    <a className={`tile ${alert ? "alert" : ""}`} href={href}>
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
    </a>
  );
}
