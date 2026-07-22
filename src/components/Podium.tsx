"use client";

import { motion } from "framer-motion";
import { COL } from "@/lib/compact";
import { pickName, formatScore, toArabicDigits } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";
import type { CompactRow, DatasetMeta } from "@/lib/types";

interface Props {
  rows: CompactRow[];
  meta: DatasetMeta;
  lang: Lang;
  onOpen: (row: CompactRow) => void;
}

const PODIUM_ORDER = [1, 0, 2]; // silver, gold, bronze visual order
const HEIGHTS = [96, 128, 78];
const MEDAL = ["var(--gold)", "#cdd6dd", "#cd8b52"];

export function Podium({ rows, meta, lang, onOpen }: Props) {
  if (rows.length === 0) return null;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 10);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Podium top 3 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 12,
          paddingTop: 30,
        }}
      >
        {PODIUM_ORDER.map((rankIdx, i) => {
          const row = top3[rankIdx];
          if (!row) return <div key={rankIdx} style={{ flex: 1, maxWidth: 130 }} />;
          const name = pickName(String(row[COL.nomAR] ?? ""), String(row[COL.nomFR] ?? ""), lang);
          const score = row[COL.score] as number | null;
          const place = rankIdx + 1;
          return (
            <motion.button
              key={rankIdx}
              type="button"
              onClick={() => onOpen(row)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * i + 0.1, type: "spring", stiffness: 260, damping: 22 }}
              style={{
                flex: 1,
                maxWidth: 132,
                cursor: "pointer",
                background: "none",
                border: "none",
                display: "grid",
                gap: 8,
                justifyItems: "center",
              }}
            >
              <div
                style={{
                  width: place === 1 ? 62 : 52,
                  height: place === 1 ? 62 : 52,
                  borderRadius: "50%",
                  background: `linear-gradient(145deg, ${MEDAL[rankIdx]}, rgba(255,255,255,0.15))`,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: place === 1 ? 24 : 20,
                  color: "#04180e",
                  boxShadow: place === 1 ? "0 0 26px rgba(255,211,67,0.5)" : "none",
                }}
              >
                {lang === "ar" ? toArabicDigits(place) : place}
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "center",
                  maxWidth: 124,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {name || "—"}
              </div>
              <div
                className="tnum text-gold"
                style={{ fontWeight: 800, fontSize: 16 }}
              >
                {formatScore(score, meta.scoreType, lang)}
              </div>
              <div
                className="glass"
                style={{
                  width: "100%",
                  height: HEIGHTS[i],
                  borderRadius: "12px 12px 0 0",
                  borderBottom: "none",
                  background:
                    place === 1
                      ? "linear-gradient(180deg, rgba(255,211,67,0.22), rgba(255,211,67,0.04))"
                      : "var(--surface)",
                }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Ranks 4–10 */}
      {rest.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {rest.map((row, i) => {
            const name = pickName(String(row[COL.nomAR] ?? ""), String(row[COL.nomFR] ?? ""), lang);
            const score = row[COL.score] as number | null;
            const place = i + 4;
            return (
              <button
                key={String(row[COL.id]) + i}
                type="button"
                onClick={() => onOpen(row)}
                className="glass"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  color: "var(--text)",
                  textAlign: "start",
                }}
              >
                <span
                  className="tnum"
                  style={{ minWidth: 24, fontWeight: 700, color: "var(--text-muted)", fontSize: 14 }}
                >
                  {lang === "ar" ? toArabicDigits(place) : place}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name || "—"}
                </span>
                <span className="tnum text-gold" style={{ fontWeight: 800, fontSize: 15 }}>
                  {formatScore(score, meta.scoreType, lang)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
