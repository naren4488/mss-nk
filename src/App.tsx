import { useEffect, useState } from "react";
import type { Plan } from "./types";
import { WrongPasswordError, forgetPassword, preloadPlan, savePassword, savedPassword, unlock } from "./crypto";
import { exportAll, importAll } from "./store";
import Dashboard from "./pages/Dashboard";
import Points from "./pages/Points";
import Pending from "./pages/Pending";
import Org from "./pages/Org";
import Sheets from "./pages/Sheets";
import Rhythm from "./pages/Rhythm";
import Recommendations from "./pages/Recommendations";
import Tasks from "./pages/Tasks";

const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "points", label: "45 Points" },
  { id: "pending", label: "Issues & Pending" },
  { id: "org", label: "Departments & People" },
  { id: "tasks", label: "Tasks: who does what" },
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
  const [loadError, setLoadError] = useState("");

  function autoLogin() {
    const p = savedPassword();
    preloadPlan().catch(() => {}); // start the download right away, even before login
    if (!p) return setChecking(false);
    setChecking(true);
    setLoadError("");
    unlock(p)
      .then(setPlan)
      .catch((e) => {
        if (e instanceof WrongPasswordError) forgetPassword(); // password changed since last visit
        else setLoadError(e instanceof Error ? e.message : "Could not load the portal.");
      })
      .finally(() => setChecking(false));
  }
  useEffect(autoLogin, []);

  if (checking) return <div className="center muted">Loading…</div>;
  if (loadError)
    return (
      <div className="center">
        <div className="login">
          <h1>MSS-NK</h1>
          <p className="error">{loadError}</p>
          <button className="btn primary" onClick={autoLogin}>Retry</button>
        </div>
      </div>
    );
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
  const [show, setShow] = useState(false);
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
          } catch (e) {
            setErr(e instanceof WrongPasswordError ? "Wrong password" : e instanceof Error ? e.message : "Something went wrong");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>MSS-NK</h1>
        <p className="muted">Management portal — Mahi Solar Solution</p>
        <div className="pw-wrap">
          <input
            type={show ? "text" : "password"}
            autoFocus
            autoComplete="current-password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button
            type="button"
            className="pw-eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            title={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {err && <p className="error">{err}</p>}
        <button className="btn primary" disabled={busy || !pw}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function Eye() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M2 2l20 20" />
    </svg>
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
        {page === "tasks" && <Tasks plan={plan} />}
        {page === "sheets" && <Sheets plan={plan} />}
        {page === "rhythm" && <Rhythm plan={plan} />}
        {page === "recs" && <Recommendations plan={plan} />}
      </main>
    </div>
  );
}
