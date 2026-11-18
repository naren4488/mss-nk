import { useState } from "react";
import type { Row } from "../types";
import { newId } from "../store";

export type Column = {
  key: string;
  label: string;
  /** multi: tick several options, saved comma-separated */
  type?: "text" | "date" | "select" | "textarea" | "multi";
  options?: string[];
  /** shown in the table; hidden columns still appear in the form */
  inTable?: boolean;
  /** worked out from the row: shown in the table only, never edited */
  display?: (r: Row) => string;
};

type Props = {
  columns: Column[];
  rows: Row[];
  setRows: (fn: (prev: Row[]) => Row[]) => void;
  addLabel: string;
  empty: string;
  defaults?: Record<string, string>;
  rowTone?: (r: Row) => "warn" | "done" | undefined;
};

export function EditableTable({ columns, rows, setRows, addLabel, empty, defaults = {}, rowTone }: Props) {
  const [editing, setEditing] = useState<Row | null>(null);
  const visible = columns.filter((c) => c.inTable !== false);

  function save(r: Row) {
    setRows((prev) => (prev.some((p) => p.id === r.id) ? prev.map((p) => (p.id === r.id ? r : p)) : [...prev, r]));
    setEditing(null);
  }
  function remove(id: string) {
    if (confirm("Delete this row?")) setRows((prev) => prev.filter((p) => p.id !== id));
    setEditing(null);
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn primary" onClick={() => setEditing({ id: newId(), ...defaults } as Row)}>
          + {addLabel}
        </button>
        <span className="muted">{rows.length} rows</span>
      </div>
      {rows.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {visible.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={rowTone?.(r) ?? ""} onClick={() => setEditing(r)} title="Click to edit">
                  {visible.map((c) => (
                    <td key={c.key}>{(c.display ? c.display(r) : r[c.key]) || <span className="muted">—</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <RowForm
          columns={columns}
          row={editing}
          isNew={!rows.some((r) => r.id === editing.id)}
          onSave={save}
          onCancel={() => setEditing(null)}
          onDelete={() => remove(editing.id)}
        />
      )}
    </div>
  );
}

function RowForm({
  columns,
  row,
  isNew,
  onSave,
  onCancel,
  onDelete,
}: {
  columns: Column[];
  row: Row;
  isNew: boolean;
  onSave: (r: Row) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Row>(row);
  const set = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div className="modal-back" onClick={onCancel}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        <h3>{isNew ? "Add" : "Edit"}</h3>
        {columns.filter((c) => !c.display).map((c) => c.type === "multi" ? (
          <fieldset key={c.key} className="field multi">
            <legend>{c.label}</legend>
            <MultiPick options={c.options ?? []} value={draft[c.key] ?? ""} onChange={(v) => set(c.key, v)} />
          </fieldset>
        ) : (
          <label key={c.key} className="field">
            <span>{c.label}</span>
            {c.type === "select" ? (
              <select value={draft[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)}>
                <option value="">—</option>
                {c.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : c.type === "textarea" ? (
              <textarea rows={3} value={draft[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />
            ) : (
              <input type={c.type === "date" ? "date" : "text"} value={draft[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />
            )}
          </label>
        ))}
        <div className="modal-actions">
          {!isNew && (
            <button type="button" className="btn ghost danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/** Tick boxes; the value is a comma-separated list in the options' order (unknown old values kept at the end). */
function MultiPick({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const picked = value.split(",").map((x) => x.trim()).filter(Boolean);
  const has = (o: string) => picked.some((p) => p.toLowerCase() === o.toLowerCase());
  const extra = picked.filter((p) => !options.some((o) => o.toLowerCase() === p.toLowerCase()));
  function toggle(o: string) {
    const next = has(o) ? picked.filter((p) => p.toLowerCase() !== o.toLowerCase()) : [...picked, o];
    const ordered = options.filter((x) => next.some((p) => p.toLowerCase() === x.toLowerCase()));
    onChange([...ordered, ...extra.filter((e) => next.includes(e))].join(", "));
  }
  return (
    <div className="multi-pick">
      {[...options, ...extra].map((o) => (
        <label key={o} className={`pick-box ${has(o) ? "on" : ""}`}>
          <input type="checkbox" checked={has(o)} onChange={() => toggle(o)} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}
