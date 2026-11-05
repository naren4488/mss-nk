import { useEffect, useState } from "react";
import type { Row } from "./types";

const PREFIX = "mss-nk:data:";

export function useStored<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage blocked */ }
  }, [key, value]);
  return [value, setValue];
}

export const newId = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);

export function isOverdue(r: Row) {
  return !!r.due && r.status !== "done" && r.due < today();
}

/** Everything the director has entered, for backup / moving to another device. */
export function exportAll(): string {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k)!);
  }
  return JSON.stringify({ exported: new Date().toISOString(), data: out }, null, 2);
}
export function importAll(json: string) {
  const parsed = JSON.parse(json) as { data: Record<string, unknown> };
  for (const [k, v] of Object.entries(parsed.data)) localStorage.setItem(PREFIX + k, JSON.stringify(v));
}
