import { useEffect, useState } from "react";
import type { Plan } from "./types";
import { forgetPassword, savePassword, savedPassword, unlock } from "./crypto";
import { exportAll, importAll } from "./store";
import Dashboard from "./pages/Dashboard";
import Points from "./pages/Points";
import Pending from "./pages/Pending";
import Org from "./pages/Org";
import Sheets from "./pages/Sheets";
import Rhythm from "./pages/Rhythm";
import Recommendations from "./pages/Recommendations";

const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "points", label: "45 Points" },
  { id: "pending", label: "Issues & Pending" },
  { id: "org", label: "Departments & People" },
  { id: "sheets", label: "Sheets & Data" },
  { id: "rhythm", label: "Operating Rhythm" },
  { id: "recs", label: "Recommendations" },
] as const;
type PageId = (typeof PAGES)[number]["id"];

const pageFromHash = (): PageId => {
  const h = location.hash.replace("#/", "") as PageId;
  return PAGES.some((p) => p.id === h) ? h : "dashboard";
};

export default function App() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const p = savedPassword();
    if (!p) return setChecking(false);
    unlock(p)
      .then(setPlan)
      .catch(() => forgetPassword()) // password changed since last visit
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="center muted">Loading…</div>;
  if (!plan) return <Login onUnlock={setPlan} />;
  return (
    <Shell
      plan={plan}
      onLock={() => {
        forgetPassword();
        setPlan(null);
      }}
    />
  );
}

function Login({ onUnlock }: { onUnlock: (p: Plan) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="center">
      <form
        className="login"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            const plan = await unlock(pw);
            savePassword(pw);
            onUnlock(plan);
          } catch {
            setErr("Wrong password");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>MSS-NK</h1>
        <p className="muted">Management portal — Mahi Solar Solution</p>
        <input type="password" autoFocus placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <p className="error">{err}</p>}
        <button className="btn primary" disabled={busy || !pw}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

function Shell({ plan, onLock }: { plan: Plan; onLock: () => void }) {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const on = () => setPage(pageFromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  function backup() {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mss-nk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  function restore() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        importAll(await f.text());
        location.reload();
      } catch {
        alert("That file is not a valid backup.");
      }
    };
    input.click();
  }

  return (
    <div className="shell">
      <header className="top">
        <button className="btn ghost menu" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
          ☰
        </button>
        <div className="brand">MSS-NK</div>
        <span className="muted small hide-sm">Plan updated {plan.updated}</span>
        <span style={{ flex: 1 }} />
        <button className="btn ghost small" onClick={backup} title="Download everything you entered">
          Backup
        </button>
        <button className="btn ghost small hide-sm" onClick={restore}>
          Restore
        </button>
        <button className="btn ghost small" onClick={onLock}>
          Lock
        </button>
      </header>
      <nav className={`side ${menuOpen ? "open" : ""}`}>
        {PAGES.map((p) => (
          <a key={p.id} href={`#/${p.id}`} className={page === p.id ? "active" : ""} onClick={() => setMenuOpen(false)}>
            {p.label}
          </a>
        ))}
      </nav>
      <main>
        {page === "dashboard" && <Dashboard plan={plan} />}
        {page === "points" && <Points plan={plan} />}
        {page === "pending" && <Pending plan={plan} />}
        {page === "org" && <Org plan={plan} />}
        {page === "sheets" && <Sheets plan={plan} />}
        {page === "rhythm" && <Rhythm plan={plan} />}
        {page === "recs" && <Recommendations plan={plan} />}
      </main>
    </div>
  );
}
