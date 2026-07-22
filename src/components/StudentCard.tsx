"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COL } from "@/lib/compact";
import { pickName, toArabicDigits, formatInt } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";
import { DECISION_TONE } from "@/lib/normalize";
import { CountUp } from "./CountUp";
import { DecisionBadge } from "./DecisionBadge";
import { Confetti } from "./Confetti";
import type { CompactRow, Decision, DatasetMeta } from "@/lib/types";

interface Props {
  row: CompactRow | null;
  meta: DatasetMeta;
  lang: Lang;
  groupSize: number;
  onClose: () => void;
  shareBase?: string; // e.g. /bac
}

export function StudentCard({ row, meta, lang, groupSize, onClose, shareBase }: Props) {
  const [copied, setCopied] = useState(false);
  const open = row !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => setCopied(false), [row]);

  return (
    <AnimatePresence>
      {open && row && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(2,12,7,0.72)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="card-solid"
            style={{
              position: "relative",
              width: "min(460px, 100%)",
              borderRadius: 28,
              padding: "28px 24px 24px",
              overflow: "hidden",
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            }}
          >
            <Content row={row} meta={meta} lang={lang} groupSize={groupSize} />

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={async () => {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}${shareBase ?? ""}?id=${encodeURIComponent(String(row[COL.id]))}`
                      : "";
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: t("siteName", lang), url });
                    } else {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }
                  } catch {
                    /* user cancelled */
                  }
                }}
                style={btnPrimary}
              >
                {copied ? t("copied", lang) : t("share", lang)}
              </button>
              <button type="button" onClick={onClose} style={btnGhost}>
                {t("close", lang)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Content({
  row,
  meta,
  lang,
  groupSize,
}: {
  row: CompactRow;
  meta: DatasetMeta;
  lang: Lang;
  groupSize: number;
}) {
  const name = pickName(String(row[COL.nomAR] ?? ""), String(row[COL.nomFR] ?? ""), lang);
  const altName = lang === "ar" ? String(row[COL.nomFR] ?? "") : String(row[COL.nomAR] ?? "");
  const num = String(row[COL.num] ?? "");
  const serie = String(row[COL.serie] ?? "");
  const decision = row[COL.decision] as Decision;
  const score = row[COL.score] as number | null;
  const rank = row[COL.rank] as number | null;
  const admis = row[COL.admis] as boolean | null;
  const isAdmis = decision === "ADMIS" || admis === true;
  const school = pickName(String(row[COL.etabAR] ?? ""), String(row[COL.etabFR] ?? ""), lang) ||
    pickName(String(row[COL.centreAR] ?? ""), String(row[COL.centreFR] ?? ""), lang);
  const wilaya = pickName(String(row[COL.wilayaAR] ?? ""), String(row[COL.wilayaFR] ?? ""), lang);
  const isTotal = meta.scoreType === "total";
  const scoreMax = isTotal ? 200 : 20;
  const numDisplay = lang === "ar" ? toArabicDigits(num) : num;

  const rankGroupLabel =
    meta.hasSerie && serie
      ? `${t("inSerie", lang)} ${serie}`
      : t("overall", lang);

  return (
    <>
      <Confetti fire={isAdmis} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 3, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--gold-deep)", fontWeight: 600, letterSpacing: 0.3 }}>
          {meta.exam === "bac"
            ? t("bacFull", lang)
            : meta.exam === "bepc"
              ? t("bepcFull", lang)
              : t("concoursFull", lang)}{" "}
          · {lang === "ar" ? toArabicDigits(meta.year) : meta.year}
        </div>
        <h2 style={{ margin: "8px 0 2px", fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>
          {name || "—"}
        </h2>
        {altName && altName !== name && (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>{altName}</div>
        )}
        <div className="tnum" style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          #{numDisplay}
          {serie && <span style={{ color: "var(--gold-deep)" }}> · {serie}</span>}
        </div>
      </div>

      {/* Score dial */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          margin: "22px auto 6px",
          display: "grid",
          placeItems: "center",
          gap: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1,
              color: "var(--gold)",
            }}
          >
            {score !== null ? (
              <CountUp value={score} decimals={isTotal ? 0 : 2} arabicDigits={lang === "ar"} />
            ) : (
              "—"
            )}
          </span>
          <span style={{ fontSize: 20, color: "var(--text-muted)", fontWeight: 600 }}>
            /{lang === "ar" ? toArabicDigits(scoreMax) : scoreMax}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {isTotal ? t("total", lang) : t("moyenne", lang)}
        </div>
      </div>

      {/* Decision + admitted */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginTop: 6,
        }}
      >
        <DecisionBadge decision={decision} raw={String(row[COL.decisionRaw] ?? "")} lang={lang} size="lg" />
        {meta.threshold !== null && admis === true && decision !== "ADMIS" && (
          <span
            style={{
              alignSelf: "center",
              background: "rgba(18,148,90,0.2)",
              color: "#7fe0ac",
              border: "1px solid rgba(18,148,90,0.5)",
              borderRadius: 999,
              padding: "6px 14px",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {t("admitted", lang)}
          </span>
        )}
      </div>

      {/* Meta grid */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          marginTop: 20,
          display: "grid",
          gap: 1,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--border)",
        }}
      >
        {rank !== null && (
          <MetaRow
            label={t("rank", lang)}
            value={`${lang === "ar" ? toArabicDigits(rank) : rank} / ${formatInt(groupSize, lang)} · ${rankGroupLabel}`}
            highlight
          />
        )}
        {school && <MetaRow label={meta.exam === "bepc" ? t("centre", lang) : t("school", lang)} value={school} />}
        {wilaya && <MetaRow label={t("wilaya", lang)} value={wilaya} />}
      </div>
    </>
  );
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 15px",
        background: "var(--surface-solid)",
      }}
    >
      <span style={{ color: "var(--text-muted)", fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span
        className="tnum"
        style={{
          fontWeight: 600,
          fontSize: 14,
          textAlign: "end",
          color: highlight ? "var(--gold)" : "var(--text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  flex: 1,
  cursor: "pointer",
  background: "var(--gold)",
  color: "#04180e",
  border: "none",
  borderRadius: 14,
  padding: "13px",
  fontWeight: 700,
  fontSize: 15,
  minHeight: 46,
};

const btnGhost: React.CSSProperties = {
  cursor: "pointer",
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "13px 20px",
  fontWeight: 600,
  fontSize: 15,
  minHeight: 46,
};
