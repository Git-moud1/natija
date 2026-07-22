"use client";

import { motion } from "framer-motion";
import { useLang } from "./LangProvider";
import { LanguageToggle } from "./LanguageToggle";
import { ExamCard } from "./ExamCard";
import { t } from "@/lib/i18n";
import type { ExamId } from "@/lib/types";

export interface ExamSummary {
  exam: ExamId;
  year: string | null;
  count: number | null;
}

const ORDER: ExamId[] = ["bac", "bepc", "concours"];

export function LandingContent({ summaries }: { summaries: Record<string, ExamSummary> }) {
  const { lang } = useLang();

  return (
    <main style={{ maxWidth: 940, margin: "0 auto", padding: "0 16px 80px" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo />
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: 0.2 }}>
            {t("siteName", lang)}
          </span>
        </div>
        <LanguageToggle />
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "44px 0 40px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="glass"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 13,
              color: "var(--gold)",
              fontWeight: 600,
              marginBottom: 22,
            }}
          >
            <Pulse />
            {t("tagline", lang)}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.4rem, 7vw, 4.2rem)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            {t("siteName", lang)}
          </h1>
          <p
            style={{
              margin: "16px auto 0",
              maxWidth: 520,
              color: "var(--text-muted)",
              fontSize: "clamp(1rem, 2.2vw, 1.2rem)",
              lineHeight: 1.6,
            }}
          >
            {t("chooseExam", lang)}
          </p>
        </motion.div>
      </section>

      {/* Exam cards */}
      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {ORDER.map((exam, i) => {
          const s = summaries[exam];
          return (
            <ExamCard
              key={exam}
              exam={exam}
              year={s?.year ?? null}
              count={s?.count ?? null}
              index={i}
            />
          );
        })}
      </section>

      <footer
        style={{
          marginTop: 56,
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        {t("footerNote", lang)}
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        background: "linear-gradient(145deg, var(--green), var(--gold-deep))",
        display: "grid",
        placeItems: "center",
        boxShadow: "0 6px 18px rgba(255,211,67,0.22)",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 13l4 4L19 7" stroke="#04180e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Pulse() {
  return (
    <span style={{ position: "relative", width: 8, height: 8, display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: "var(--gold)",
        }}
      />
    </span>
  );
}
