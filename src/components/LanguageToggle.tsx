"use client";

import { useLang } from "./LangProvider";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className="glass"
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}
    >
      {(["ar", "fr"] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            style={{
              cursor: "pointer",
              border: "none",
              background: active ? "var(--gold)" : "transparent",
              color: active ? "#04180e" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: compact ? 12 : 13,
              padding: compact ? "5px 12px" : "7px 16px",
              borderRadius: 999,
              transition: "background 200ms, color 200ms",
              minHeight: 32,
            }}
          >
            {l === "ar" ? "عربي" : "FR"}
          </button>
        );
      })}
    </div>
  );
}
