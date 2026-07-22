"use client";

import { DECISION_LABELS, DECISION_TONE } from "@/lib/normalize";
import type { Decision } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

const TONE_STYLES: Record<string, { bg: string; fg: string; ring: string }> = {
  green: { bg: "rgba(18,148,90,0.18)", fg: "#7fe0ac", ring: "rgba(18,148,90,0.5)" },
  amber: { bg: "rgba(255,196,67,0.16)", fg: "#ffd67a", ring: "rgba(255,196,67,0.45)" },
  red: { bg: "rgba(193,55,43,0.18)", fg: "#f19a92", ring: "rgba(193,55,43,0.5)" },
  gray: { bg: "rgba(148,163,184,0.14)", fg: "#c2cdd6", ring: "rgba(148,163,184,0.4)" },
};

export function DecisionBadge({
  decision,
  raw,
  lang,
  size = "md",
}: {
  decision: Decision;
  raw?: string;
  lang: Lang;
  size?: "sm" | "md" | "lg";
}) {
  const tone = TONE_STYLES[DECISION_TONE[decision]];
  const label =
    decision === "UNKNOWN" && raw ? raw : DECISION_LABELS[decision][lang];
  const pad = size === "lg" ? "8px 18px" : size === "sm" ? "3px 10px" : "5px 13px";
  const fs = size === "lg" ? 16 : size === "sm" ? 11 : 13;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.ring}`,
        borderRadius: 999,
        padding: pad,
        fontSize: fs,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: tone.fg,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
