import type { Plan } from "./types";

const PASS_KEY = "mss-nk:pass";
const FETCH_TIMEOUT_MS = 20000;

type Box = { v?: number; z?: "gzip"; iterations: number; salt: string; iv: string; data: string };

/** Thrown only when the password cannot decrypt the plan. */
export class WrongPasswordError extends Error {}

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let boxPromise: Promise<Box> | null = null;

async function fetchBox(): Promise<Box> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // Default cache mode: the host's ETag lets the browser reuse the file with a quick 304.
    const res = await fetch(`${import.meta.env.BASE_URL}plan.enc.json`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Could not load the portal data (HTTP ${res.status}).`);
    return (await res.json()) as Box;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error("The connection is too slow. Check your internet and try again.");
    if (e instanceof TypeError) throw new Error("No connection. Check your internet and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Start downloading the encrypted plan early (e.g. while the password is typed). Safe to call repeatedly. */
export function preloadPlan(): Promise<Box> {
  if (!boxPromise) {
    boxPromise = fetchBox();
    boxPromise.catch(() => { boxPromise = null; }); // allow a retry after a failure
  }
  return boxPromise;
}

async function gunzip(bytes: ArrayBuffer): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/** Decrypts the shipped plan. Throws WrongPasswordError for a bad password, Error for network problems. */
export async function unlock(password: string): Promise<Plan> {
  const box = await preloadPlan();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(box.salt), iterations: box.iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.data));
  } catch {
    throw new WrongPasswordError("Wrong password");
  }
  const json = box.z === "gzip" ? await gunzip(plain) : new TextDecoder().decode(plain);
  return JSON.parse(json) as Plan;
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
