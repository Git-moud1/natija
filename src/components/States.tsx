"use client";

import { t, type Lang } from "@/lib/i18n";

export function Skeleton({ height = 56, radius = 16 }: { height?: number; radius?: number }) {
  return (
    <div
      className="shimmer"
      style={{ height, borderRadius: radius, width: "100%" }}
      aria-hidden
    />
  );
}

export function ResultsSkeleton() {
  return (
    <div style={{ display: "grid", gap: 10 }} aria-busy="true" aria-live="polite">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} height={64} />
      ))}
    </div>
  );
}

export function ErrorState({ lang, onRetry }: { lang: Lang; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="glass"
      style={{
        borderRadius: 24,
        padding: "40px 24px",
        textAlign: "center",
        display: "grid",
        gap: 14,
        placeItems: "center",
      }}
    >
      <WarnIcon />
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
          {t("errorTitle", lang)}
        </h3>
        <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 380 }}>
          {t("errorDesc", lang)}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            cursor: "pointer",
            background: "var(--gold)",
            color: "#04180e",
            border: "none",
            borderRadius: 999,
            padding: "11px 26px",
            fontWeight: 700,
            fontSize: 15,
            minHeight: 44,
          }}
        >
          {t("retry", lang)}
        </button>
      )}
    </div>
  );
}

export function SoonState({ lang }: { lang: Lang }) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: 24,
        padding: "48px 24px",
        textAlign: "center",
        display: "grid",
        gap: 12,
        placeItems: "center",
      }}
    >
      <ClockIcon />
      <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800 }} className="text-gold">
        {t("soon", lang)}
      </h3>
      <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 360 }}>
        {t("soonDesc", lang)}
      </p>
    </div>
  );
}

export function EmptyResults({ lang }: { lang: Lang }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 20px",
        color: "var(--text-muted)",
        display: "grid",
        gap: 8,
        placeItems: "center",
      }}
    >
      <SearchIcon />
      <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--text)" }}>
        {t("noResults", lang)}
      </p>
      <p style={{ margin: 0 }}>{t("noResultsHint", lang)}</p>
    </div>
  );
}

// ── Inline SVG icons (no emoji) ─────────────────────────────────────────────

function WarnIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke="#ffd67a"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--gold)" strokeWidth="1.6" />
      <path d="M12 7v5l3 2" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="var(--text-muted)" strokeWidth="1.6" />
      <path d="m20 20-3.2-3.2" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
