import type { Decision } from "./types";

// --- String cleaning --------------------------------------------------------

const ZERO_WIDTH = /[﻿​‌‍⁠]/g;
const EXOTIC_SPACE = /[   -   　]/g;
const COMBINING = /[̀-ͯ]/g;

/** Strip BOM, collapse whitespace, trim. Safe on any input. */
export function clean(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : String(v);
  s = s.replace(ZERO_WIDTH, "").replace(EXOTIC_SPACE, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Lower-case, strip accents & non-alphanumerics — for fuzzy header matching. */
export function fold(v: unknown): string {
  return clean(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING, "")
    // keep latin letters, digits, and the Arabic block (؀-ۿ).
    .replace(/[^a-z0-9؀-ۿ]+/g, "");
}

// --- Number / ID parsing ----------------------------------------------------

/**
 * Parse a score that may arrive as "12,5" (comma decimal), "12.5", a real
 * number, or garbage. Returns null when it isn't a usable number.
 */
export function parseScore(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = clean(v).replace(/\s/g, "").replace(",", ".");
  if (s === "" || s === "-") return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Candidate numbers must stay strings to preserve leading zeros. Numbers
 * stored as int ("Numero" in BEPC) and text with zeros ("00001" in BAC) must
 * both round-trip and be matchable.
 */
export function normalizeId(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    // Avoid scientific notation / trailing ".0" from float coercion.
    return Number.isInteger(v) ? v.toFixed(0) : String(v);
  }
  return clean(v);
}

/** All lookup variants for an ID so "1" matches "00001" and vice-versa. */
export function idVariants(id: string): string[] {
  const s = clean(id);
  if (!s) return [];
  const out = new Set<string>([s]);
  const stripped = s.replace(/^0+/, "");
  if (stripped) out.add(stripped);
  if (/^\d+$/.test(stripped)) {
    out.add(stripped.padStart(5, "0"));
    out.add(stripped.padStart(6, "0"));
    out.add(stripped.padStart(10, "0")); // NODOSS width
  }
  return [...out];
}

// --- Decision normalization -------------------------------------------------

// Prefix-tolerant, accent/case-insensitive mapping of all observed dirty values.
const DECISION_RULES: { test: (f: string) => boolean; value: Decision }[] = [
  { test: (f) => f.startsWith("sessionnaire") || f.startsWith("session"), value: "SESSIONNAIRE" },
  { test: (f) => f.startsWith("admis"), value: "ADMIS" },
  { test: (f) => f.startsWith("ajourn") || f.startsWith("redouble"), value: "AJOURNE" },
  { test: (f) => f.startsWith("absent") || f.startsWith("abscent"), value: "ABSENT" },
  { test: (f) => f.includes("annul"), value: "ANNULE" }, // "Examen annule -Telephone"
  { test: (f) => f.startsWith("elimin"), value: "ELIMINE" },
  { test: (f) => f.startsWith("deliber"), value: "DELIBERABLE" },
];

export function normalizeDecision(v: unknown): Decision {
  const f = fold(v);
  if (!f) return "UNKNOWN";
  for (const rule of DECISION_RULES) if (rule.test(f)) return rule.value;
  return "UNKNOWN";
}

// --- Serie normalization ----------------------------------------------------

const VALID_SERIES = new Set(["SN", "LO", "LM", "M", "TM", "TS", "LA"]);

export function normalizeSerie(v: unknown): string {
  const s = clean(v).toUpperCase().replace(/\s+/g, "");
  if (!s) return "";
  if (VALID_SERIES.has(s)) return s;
  const two = s.slice(0, 2);
  if (VALID_SERIES.has(two)) return two;
  return s; // keep raw unknown serie rather than dropping it
}

// --- TYPE normalization (concours) ------------------------------------------

export function normalizeType(v: unknown): string {
  const s = clean(v).toUpperCase();
  if (!s) return "";
  if (s.startsWith("OF")) return "OF";
  if (s.startsWith("PV")) return "PV";
  if (s.startsWith("CF")) return "CF";
  return s;
}

// --- Labels & tones ---------------------------------------------------------

export const DECISION_LABELS: Record<Decision, { ar: string; fr: string }> = {
  ADMIS: { ar: "ناجح", fr: "Admis" },
  SESSIONNAIRE: { ar: "دورة تكميلية", fr: "Sessionnaire" },
  AJOURNE: { ar: "راسب", fr: "Ajourné" },
  ABSENT: { ar: "غائب", fr: "Absent" },
  ANNULE: { ar: "ملغى", fr: "Annulé" },
  ELIMINE: { ar: "مقصى", fr: "Éliminé" },
  DELIBERABLE: { ar: "قابل للمداولة", fr: "Délibérable" },
  UNKNOWN: { ar: "غير محدد", fr: "Non défini" },
};

/** Visual tone per decision for badges. */
export const DECISION_TONE: Record<Decision, "green" | "amber" | "red" | "gray"> = {
  ADMIS: "green",
  SESSIONNAIRE: "amber",
  DELIBERABLE: "amber",
  AJOURNE: "red",
  ELIMINE: "gray",
  ANNULE: "gray",
  ABSENT: "gray",
  UNKNOWN: "gray",
};
