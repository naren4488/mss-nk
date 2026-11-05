import { useState } from "react";
import type { Row } from "../types";
import { newId } from "../store";

export type Column = {
  key: string;
  label: string;
  type?: "text" | "date" | "select" | "textarea";
  options?: string[];
  /** shown in the table; hidden columns still appear in the form */
  inTable?: boolean;
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
                    <td key={c.key}>{r[c.key] || <span className="muted">—</span>}</td>
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
        {columns.map((c) => (
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
