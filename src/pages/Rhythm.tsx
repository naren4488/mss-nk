import type { Plan } from "../types";
import { Md } from "../md";

export default function Rhythm({ plan }: { plan: Plan }) {
  return (
    <div className="page">
      <h1>Operating rhythm</h1>
      <p className="muted">Inspect, do not execute.</p>

      <section>
        <h2>Director calendar</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cadence</th><th>What</th><th>Points</th></tr></thead>
            <tbody>
              {plan.rhythm.map((r) => (
                <tr key={r.cadence}><td><strong>{r.cadence}</strong></td><td><Md text={r.what} /></td><td>{r.points.join(", ")}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid two">
        <section className="card">
          <h2>What every manager brings</h2>
          <ol>{plan.managerBrings.map((x, i) => <li key={i}><Md text={x} /></li>)}</ol>
        </section>
        <section className="card">
          <h2>Department scorecard</h2>
          <ul>{plan.scorecard.map((x, i) => <li key={i}><Md text={x} /></li>)}</ul>
        </section>
        <section className="card">
          <h2>First 90 days — order</h2>
          <ol>{plan.first90.map((x, i) => <li key={i}><Md text={x} /></li>)}</ol>
        </section>
        <section className="card">
          <h2>Done in 90 days looks like</h2>
          <ol>{plan.done90.map((x, i) => <li key={i}><Md text={x} /></li>)}</ol>
        </section>
      </div>

      <section>
        <h2>Typical failure patterns</h2>
        <ul className="list">{plan.failurePatterns.map((x, i) => <li key={i}><Md text={x} /></li>)}</ul>
      </section>

      <section>
        <h2>How this sits on current operations</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Director intent</th><th>Already in the company</th><th>Gap to close</th></tr></thead>
            <tbody>
              {plan.currentOps.map((r, i) => (
                <tr key={i}><td><Md text={r.intent} /></td><td><Md text={r.already} /></td><td><Md text={r.gap} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
