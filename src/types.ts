export type Point = { n: number; group: string; title: string; detail: string; original: string };
export type Plan = {
  updated: string;
  leadershipRule: string;
  groups: { id: string; title: string }[];
  points: Point[];
  loops: { name: string; points: number[]; meaning: string }[];
  failurePatterns: string[];
  first90: string[];
  guidance: { title: string; points: number[]; bullets: string[] }[];
  recommendations: { id: string; title: string; detail: string }[];
  rhythm: { cadence: string; what: string; points: number[] }[];
  managerBrings: string[];
  scorecard: string[];
  currentOps: { intent: string; already: string; gap: string }[];
  done90: string[];
  departments: { name: string; manager: string; designations: string; owns: string; app: string }[];
  gaps: string;
  seedSheets: Record<string, string>[];
  /** Operations task catalog (who does what); see src/tasks.ts. */
  tasks?: import("./tasks").TaskCatalog;
  /** Admin software status, parsed from OVERALL_PROJECT_STATUS.md. */
  software?: SoftwareStatus;
  /** Test data and logins (from docs/mss-nk/test-data.md, encrypted). */
  testData?: { updated: string; sections: { title: string; blocks: Block[] }[] };
};

export type Block =
  | { t: "p"; text: string }
  | { t: "ul"; items: { text: string; children: string[] }[] }
  | { t: "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] };
export type Group = { title: string; note: string; blocks: Block[] };
export type ModuleKind = "done" | "next" | "pending" | "legacy";
export type SoftwareModule = {
  n: number;
  title: string;
  what: string;
  status: string;
  kind: ModuleKind;
  tags: Record<"no backend" | "backend only" | "placeholder" | "demo", number>;
  features: Group[];
  apis: Block[];
  review: Group[];
  text: string;
  map: { n: number; name: string; screens: string; tables: string; apis: string } | null;
  testing?: ModuleTesting;
};
export type ModuleTesting = { pct: number | null; status: string; groups: { title: string; text: string; items: string[] }[] };
export type SoftwareStatus = {
  testing?: { updated: string; overallPct: number | null; overall: Block[]; info: { title: string; blocks: Block[] }[] };
  meta: { updated?: string; repos?: string; purpose?: string; full_endpoint_list?: string };
  info: { title: string; blocks: Block[] }[];
  modules: SoftwareModule[];
};
export type Row = Record<string, string> & { id: string };
