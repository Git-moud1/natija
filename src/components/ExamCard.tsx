"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "./LangProvider";
import { t, type Lang } from "@/lib/i18n";
import { formatInt, toArabicDigits } from "@/lib/format";
import type { ExamId } from "@/lib/types";

interface Props {
  exam: ExamId;
  year: string | null;
  count: number | null;
  index: number;
}

const ACCENTS: Record<ExamId, string> = {
  bac: "linear-gradient(135deg, rgba(18,148,90,0.4), rgba(255,211,67,0.14))",
  bepc: "linear-gradient(135deg, rgba(10,122,66,0.4), rgba(212,175,55,0.16))",
  concours: "linear-gradient(135deg, rgba(3,52,31,0.55), rgba(255,211,67,0.12))",
};

export function ExamCard({ exam, year, count, index }: Props) {
  const { lang } = useLang();
  const published = year !== null && count !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index + 0.1, type: "spring", stiffness: 220, damping: 24 }}
    >
      <Link
        href={`/${exam}`}
        className="glass"
        style={{
          display: "block",
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          padding: "26px 22px",
          textDecoration: "none",
          color: "var(--text)",
          minHeight: 190,
          transition: "transform 240ms ease-out, border-color 240ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-6px)";
          e.currentTarget.style.borderColor = "rgba(255,211,67,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <div
          aria-hidden
          style={{ position: "absolute", inset: 0, background: ACCENTS[exam], opacity: 0.9 }}
        />
        <div style={{ position: "relative", display: "grid", gap: 12, height: "100%" }}>
          <ExamGlyph exam={exam} />
          <div style={{ marginTop: "auto" }}>
            <h3 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{t(exam, lang)}</h3>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 14, minHeight: 20 }}>
              {published ? subtitle(exam, year, count, lang) : t("soon", lang)}
            </p>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--gold)",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {t("viewResults", lang)}
            <svg className="dir-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function subtitle(exam: ExamId, year: string, count: number, lang: Lang): string {
  const y = lang === "ar" ? toArabicDigits(year) : year;
  return `${y} · ${formatInt(count, lang)} ${t("candidates", lang)}`;
}

function ExamGlyph({ exam }: { exam: ExamId }) {
  const common = { width: 40, height: 40, viewBox: "0 0 24 24", fill: "none" as const };
  if (exam === "bac")
    return (
      <svg {...common} aria-hidden>
        <path d="M3 8l9-4 9 4-9 4-9-4Z" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M7 10v5c0 1 2.2 2.2 5 2.2s5-1.2 5-2.2v-5" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  if (exam === "bepc")
    return (
      <svg {...common} aria-hidden>
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="var(--gold)" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden>
      <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.5 7.1 18.1l.9-5.5-4-3.9L9.5 8 12 3Z" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
