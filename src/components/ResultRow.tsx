"use client";

import { memo } from "react";
import { COL } from "@/lib/compact";
import { pickName, formatScore, toArabicDigits } from "@/lib/format";
import { DecisionBadge } from "./DecisionBadge";
import type { CompactRow, Decision, DatasetMeta } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

interface Props {
  row: CompactRow;
  meta: DatasetMeta;
  lang: Lang;
  onOpen: () => void;
}

function ResultRowInner({ row, meta, lang, onOpen }: Props) {
  const name = pickName(String(row[COL.nomAR] ?? ""), String(row[COL.nomFR] ?? ""), lang);
  const num = String(row[COL.num] ?? "");
  const serie = String(row[COL.serie] ?? "");
  const rank = row[COL.rank];
  const score = row[COL.score] as number | null;
  const decision = row[COL.decision] as Decision;
  const place = pickName(
    String(row[COL.wilayaAR] ?? ""),
    String(row[COL.wilayaFR] ?? ""),
    lang,
  );
  const numDisplay = lang === "ar" ? toArabicDigits(num) : num;

  return (
    <button
      type="button"
      role="listitem"
      onClick={onOpen}
      className="glass"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 14px",
        borderRadius: 16,
        cursor: "pointer",
        textAlign: "start",
        color: "var(--text)",
        transition: "transform 160ms ease-out, border-color 160ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      {typeof rank === "number" && (
        <div
          className="tnum"
          style={{
            flexShrink: 0,
            minWidth: 42,
            textAlign: "center",
            fontWeight: 700,
            fontSize: 13,
            color: rank <= 10 ? "var(--gold)" : "var(--text-muted)",
          }}
        >
          {lang === "ar" ? toArabicDigits(rank) : rank}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name || "—"}
        </div>
        <div
          className="tnum"
          style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            display: "flex",
            gap: 8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <span>#{numDisplay}</span>
          {serie && <span style={{ color: "var(--gold-deep)" }}>{serie}</span>}
          {place && <span style={{ opacity: 0.85 }}>· {place}</span>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div
          className="tnum"
          style={{ textAlign: "center", minWidth: 52 }}
          aria-label={meta.scoreType === "total" ? "Total" : "Moyenne"}
        >
          <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1, color: "var(--gold)" }}>
            {formatScore(score, meta.scoreType, lang)}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
            /{meta.scoreType === "total" ? (lang === "ar" ? toArabicDigits(200) : 200) : lang === "ar" ? toArabicDigits(20) : 20}
          </div>
        </div>
        <div className="hide-sm">
          <DecisionBadge decision={decision} raw={String(row[COL.decisionRaw] ?? "")} lang={lang} size="sm" />
        </div>
      </div>
    </button>
  );
}

export const ResultRow = memo(ResultRowInner);
