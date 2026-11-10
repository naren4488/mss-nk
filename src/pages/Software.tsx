import { useMemo, useState } from "react";
import type { Block, Group, ModuleKind, Plan, SoftwareModule } from "../types";
import { Accordion } from "../components/Accordion";
import { Md } from "../md";

const KIND_LABEL: Record<ModuleKind, string> = {
  done: "Reviewed",
  next: "Next in review",
  pending: "Not reviewed",
  legacy: "Superseded",
};
const TAG_LABEL: Record<string, string> = {
  placeholder: "placeholder",
  "no backend": "no backend",
  "backend only": "backend only",
  demo: "demo",
};
type Tab = "features" | "apis" | "review";

export default function Software({ plan }: { plan: Plan }) {
  const sw = plan.software;
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | ModuleKind>("");
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [infoOpen, setInfoOpen] = useState<Set<string>>(new Set());

  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => (sw?.modules ?? []).filter((m) => (!kind || m.kind === kind) && (!query || m.text.includes(query) || m.title.toLowerCase().includes(query))),
    [sw, kind, query],
  );

  if (!sw) return <div className="page"><h1>Admin software</h1><p className="empty">The status document was not available when this site was built.</p></div>;

  const count = (k: ModuleKind) => sw.modules.filter((m) => m.kind === k).length;
  const done = count("done");
  const next = sw.modules.find((m) => m.kind === "next");
  const tagTotals = Object.keys(TAG_LABEL).map((t) => [t, sw.modules.reduce((n, m) => n + (m.tags as Record<string, number>)[t], 0)] as const);
  const toggle = (n: number) => setOpen((s) => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x; });
  const [updatedDate, updatedNote] = splitParen(sw.meta.updated ?? "");

  return (
    <div className="page">
      <h1>Admin software</h1>
      <p className="muted small">
        Updated {updatedDate}
        {sw.meta.repos && <> · <Md text={sw.meta.repos} /></>}
      </p>
      {updatedNote && <p className="small">{updatedNote}</p>}

      <div className="tiles">
        <div className="tile static">
          <div className="tile-value">{done} / {sw.modules.length}</div>
          <div className="tile-label">Modules reviewed</div>
          <div className="bar" aria-hidden="true"><span style={{ width: `${(done / sw.modules.length) * 100}%` }} /></div>
        </div>
        <div className="tile static">
          <div className="tile-value small-value">{next ? `${next.n}. ${next.title}` : "—"}</div>
          <div className="tile-label">Next in review</div>
        </div>
        <div className="tile static">
          <div className="tile-value">{count("pending")}</div>
          <div className="tile-label">Not reviewed yet</div>
        </div>
        <div className="tile static">
          <div className="tile-value">{sw.modules.length}</div>
          <div className="tile-label">Modules (FE + BE)</div>
        </div>
      </div>
      <div className="tag-totals">
        {tagTotals.map(([t, n]) => (
          <span key={t} className="small muted"><span className={`tag tag-${t.replace(/\s+/g, "-")}`}>{TAG_LABEL[t]}</span> {n}</span>
        ))}
      </div>

      <section>
        <h2>About this status</h2>
        {sw.meta.purpose && <p className="muted small"><Md text={sw.meta.purpose} /></p>}
        {sw.info.map((s) => (
          <Accordion
            key={s.title}
            level={2}
            open={infoOpen.has(s.title)}
            onToggle={() => setInfoOpen((x) => { const y = new Set(x); if (y.has(s.title)) y.delete(s.title); else y.add(s.title); return y; })}
            header={<span className="acc-name">{s.title}</span>}
          >
            <Blocks blocks={s.blocks} />
          </Accordion>
        ))}
      </section>

      {plan.testData && plan.testData.sections.length > 0 && (
        <section>
          <h2>Test data and logins</h2>
          {plan.testData.updated && <p className="muted small">Updated {plan.testData.updated}</p>}
          {plan.testData.sections.map((s) => {
            const id = `td:${s.title}`;
            return (
              <Accordion
                key={id}
                level={2}
                open={infoOpen.has(id)}
                onToggle={() => setInfoOpen((x) => { const y = new Set(x); if (y.has(id)) y.delete(id); else y.add(id); return y; })}
                header={<span className="acc-name">{s.title}</span>}
              >
                <Blocks blocks={s.blocks} />
              </Accordion>
            );
          })}
        </section>
      )}

      <section>
        <h2>Modules</h2>
        <div className="toolbar">
          <input placeholder="Search screens, features, APIs…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="seg">
            {(["", "done", "next", "pending", "legacy"] as const).map((k) => (
              <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
                {k ? KIND_LABEL[k] : "All"}
              </button>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <button className="btn ghost small" onClick={() => setOpen(new Set(shown.map((m) => m.n)))}>Expand all</button>
          <button className="btn ghost small" onClick={() => setOpen(new Set())}>Collapse all</button>
        </div>
        {shown.length === 0 && <p className="empty">No module matches.</p>}
        {shown.map((m) => (
          <Accordion key={m.n} open={open.has(m.n) || (!!query && shown.length <= 3)} onToggle={() => toggle(m.n)} header={<ModuleHeader m={m} />}>
            <ModuleBody m={m} query={query} />
          </Accordion>
        ))}
      </section>
    </div>
  );
}

function ModuleHeader({ m }: { m: SoftwareModule }) {
  const tags = Object.entries(m.tags).filter(([, n]) => n > 0);
  return (
    <>
      <span className="num">{m.n}</span>
      <span className="acc-main">
        <span className="acc-name">{m.title}</span>
        {m.what && <span className="acc-sub"><Md text={m.what} /></span>}
      </span>
      <span className="acc-meta">
        <span className={`status status-${m.kind}`}>{KIND_LABEL[m.kind]}</span>
        {m.map?.apis && <span className="small muted nowrap">{m.map.apis} APIs</span>}
        {tags.map(([t, n]) => (
          <span key={t} className={`tag tag-${t.replace(/\s+/g, "-")}`} title={`${n} × ${t}`}>{t} {n}</span>
        ))}
      </span>
    </>
  );
}

function ModuleBody({ m, query }: { m: SoftwareModule; query: string }) {
  const [tab, setTab] = useState<Tab>("features");
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set());
  const allOpen = openGroups.size === m.features.length;

  const groupMatches = (g: Group) => !!query && JSON.stringify(g).replace(/[*`]/g, "").toLowerCase().includes(query);

  return (
    <div>
      {m.map && (
        <dl className="facts">
          <div><dt>Screens</dt><dd><Md text={m.map.screens} /></dd></div>
          <div><dt>Main tables</dt><dd><Md text={m.map.tables} /></dd></div>
        </dl>
      )}
      <div className="toolbar">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === "features"} className={tab === "features" ? "on" : ""} onClick={() => setTab("features")}>
            Features ({m.features.length})
          </button>
          <button role="tab" aria-selected={tab === "apis"} className={tab === "apis" ? "on" : ""} onClick={() => setTab("apis")}>APIs</button>
          <button role="tab" aria-selected={tab === "review"} className={tab === "review" ? "on" : ""} onClick={() => setTab("review")}>Review</button>
        </div>
        {tab === "features" && m.features.length > 1 && (
          <button className="btn ghost small" onClick={() => setOpenGroups(allOpen ? new Set() : new Set(m.features.map((_, i) => i)))}>
            {allOpen ? "Collapse features" : "Expand features"}
          </button>
        )}
      </div>

      {tab === "features" &&
        (m.features.length === 0 ? (
          <p className="empty">No features listed.</p>
        ) : (
          m.features.map((g, i) => (
            <Accordion
              key={i}
              level={2}
              open={openGroups.has(i) || groupMatches(g)}
              onToggle={() => setOpenGroups((s) => { const x = new Set(s); if (x.has(i)) x.delete(i); else x.add(i); return x; })}
              header={
                <span className="acc-main">
                  <span className="acc-name"><Md text={g.title} /></span>
                  {g.note && <span className="acc-sub"><Md text={g.note} /></span>}
                </span>
              }
            >
              <Blocks blocks={g.blocks} />
            </Accordion>
          ))
        ))}

      {tab === "apis" && <Blocks blocks={m.apis} />}

      {tab === "review" && (
        <div>
          <p className={`review-status status-${m.kind}`}><strong>Status:</strong> <Md text={m.status || "—"} /></p>
          {m.review.map((g, i) => (
            <div key={i} className="review-group">
              <h4><Md text={g.title} /></h4>
              <Blocks blocks={g.blocks} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blocks">
      {blocks.map((b, i) => {
        if (b.t === "p") return <p key={i}><Md text={b.text} /></p>;
        if (b.t === "ol") return <ol key={i}>{b.items.map((x, j) => <li key={j}><Md text={x} /></li>)}</ol>;
        if (b.t === "ul")
          return (
            <ul key={i}>
              {b.items.map((x, j) => (
                <li key={j}>
                  <Md text={x.text} />
                  {x.children.length > 0 && <ul>{x.children.map((c, k) => <li key={k}><Md text={c} /></li>)}</ul>}
                </li>
              ))}
            </ul>
          );
        return (
          <div key={i} className="table-wrap">
            <table>
              <thead><tr>{b.head.map((h, j) => <th key={j}><Md text={h} /></th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j} className="static">{r.map((c, k) => <td key={k}><Md text={c} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function splitParen(s: string): [string, string] {
  const m = s.match(/^([^(]+)\((.*)\)\s*$/);
  return m ? [m[1].trim(), m[2].trim()] : [s, ""];
}
