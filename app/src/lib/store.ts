"use client";
import { DEMO_REMITTANCE, Remittance } from "./demo";

const KEY = "remithome-demo-v1";

export function loadRemittance(): Remittance {
  if (typeof window === "undefined") return DEMO_REMITTANCE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Remittance;
  } catch {
    // fall through to seed
  }
  return DEMO_REMITTANCE;
}

export function saveRemittance(r: Remittance) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(r));
}

export function resetDemo() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
