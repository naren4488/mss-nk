import type { Plan } from "./types";

const PASS_KEY = "mss-nk:pass";

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Decrypts the shipped plan with the password. Throws on a wrong password. */
export async function unlock(password: string): Promise<Plan> {
  const res = await fetch(`${import.meta.env.BASE_URL}plan.enc.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("Plan file missing");
  const box = (await res.json()) as { iterations: number; salt: string; iv: string; data: string };
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(box.salt), iterations: box.iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.data));
  return JSON.parse(new TextDecoder().decode(plain)) as Plan;
}

export function savedPassword(): string | null {
  try { return localStorage.getItem(PASS_KEY); } catch { return null; }
}
export function savePassword(p: string) {
  try { localStorage.setItem(PASS_KEY, p); } catch { /* storage blocked */ }
}
export function forgetPassword() {
  try { localStorage.removeItem(PASS_KEY); } catch { /* storage blocked */ }
}
