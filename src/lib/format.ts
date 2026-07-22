import type { Lang } from "./i18n";

/** Convert Western digits to Eastern Arabic digits for the AR interface. */
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

/** Locale-aware integer (grouped). */
export function formatInt(n: number, lang: Lang): string {
  const s = new Intl.NumberFormat(lang === "ar" ? "ar-MR" : "fr-FR", {
    maximumFractionDigits: 0,
  }).format(n);
  return s;
}

/** Format a score for display (moyenne: 2 decimals; total: integer). */
export function formatScore(
  score: number | null,
  scoreType: "moyenne" | "total",
  lang: Lang,
): string {
  if (score === null || Number.isNaN(score)) return "—";
  if (scoreType === "total") return formatInt(Math.round(score), lang);
  const s = score.toFixed(2);
  return lang === "ar" ? toArabicDigits(s) : s;
}

/** Rank line: "الترتيب: 45 / 31497 في شعبة SN". */
export function rankLabel(
  rank: number | null,
  groupSize: number,
  lang: Lang,
): string {
  if (rank === null) return "—";
  const r = formatInt(rank, lang);
  const total = formatInt(groupSize, lang);
  return lang === "ar" ? `${r} / ${total}` : `${r} / ${total}`;
}

/** Pick the best available name/place for the current language, never blank. */
export function pickName(ar: string, fr: string, lang: Lang): string {
  if (lang === "ar") return ar || fr || "";
  return fr || ar || "";
}

export function formatDate(iso: string, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-MR" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
