import type { Plan } from "../types";
import { useRecChoice } from "../data";
import { Md } from "../md";

const CHOICES = ["Undecided", "Adopt", "Skip"];

export default function Recommendations({ plan }: { plan: Plan }) {
  const [choice, setChoice] = useRecChoice();
  return (
    <div className="page">
      <h1>Recommendations R1–R{plan.recommendations.length}</h1>
      <p className="muted">Not in your {plan.points.length}. Adopt only what you agree with.</p>
      {plan.recommendations.map((r) => {
        const c = choice[r.id] || "Undecided";
        return (
          <div key={r.id} className={`card ${c === "Adopt" ? "done" : ""}`}>
            <div className="card-head">
              <span className="num">{r.id}</span>
              <div style={{ flex: 1 }}>
                <div className="card-title">{r.title}</div>
                <div className="muted small"><Md text={r.detail} /></div>
              </div>
              <div className="seg">
                {CHOICES.map((x) => (
                  <button key={x} className={c === x ? "on" : ""} onClick={() => setChoice((p) => ({ ...p, [r.id]: x }))}>{x}</button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
