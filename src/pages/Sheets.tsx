import type { Plan } from "../types";
import { EditableTable } from "../components/EditableTable";
import { deptNames, useSheets } from "../data";

export default function Sheets({ plan }: { plan: Plan }) {
  const [rows, setRows] = useSheets(plan);
  return (
    <div className="page">
      <h1>Sheets & data register</h1>
      <p className="muted">
        Point 43 (documented, safe, organized) and point 19 (admin software). Every business sheet gets one row — then it is either moved into the
        admin app or kept on purpose with a clear owner.
      </p>
      <EditableTable
        rows={rows}
        setRows={setRows}
        addLabel="Add sheet / file"
        empty="No sheets registered yet."
        columns={[
          { key: "name", label: "Sheet / file" },
          { key: "dept", label: "Department", type: "select", options: deptNames(plan) },
          { key: "owner", label: "Owner (updates it)" },
          { key: "readers", label: "Who reads it" },
          { key: "freq", label: "How often", type: "select", options: ["Daily", "Weekly", "Monthly", "On change"] },
          { key: "tracks", label: "What it tracks", type: "textarea" },
          { key: "link", label: "Drive link", inTable: false },
          { key: "replace", label: "Move into admin app?" },
          { key: "status", label: "Status", type: "select", options: ["Not reviewed", "Keep as sheet", "Migrating", "Migrated", "Retire"] },
        ]}
      />
    </div>
  );
}
