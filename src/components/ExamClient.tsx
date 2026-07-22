"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDataset } from "@/hooks/useDataset";
import { useLang } from "./LangProvider";
import { LanguageToggle } from "./LanguageToggle";
import { Filters, type FilterValues } from "./Filters";
import { Podium } from "./Podium";
import { ResultRow } from "./ResultRow";
import { VirtualList } from "./VirtualList";
import { StudentCard } from "./StudentCard";
import { ErrorState, ResultsSkeleton, EmptyResults, SoonState } from "./States";
import { COL } from "@/lib/compact";
import { t } from "@/lib/i18n";
import { formatInt, toArabicDigits } from "@/lib/format";
import type { CompactRow, DatasetMeta, ExamId } from "@/lib/types";

interface Props {
  exam: ExamId;
  url: string | null;
  meta: DatasetMeta | null;
}

const EMPTY_FILTERS: FilterValues = { wilaya: "", moughataa: "", school: "", serie: "", type: "" };

export function ExamClient({ exam, url, meta }: Props) {
  const { lang } = useLang();
  const { state, retry } = useDataset(url, meta?.version ?? "0");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<CompactRow | null>(null);
  const deepLinkChecked = useRef(false);

  // Debounce the search box (keeps 121k scans off every keystroke).
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 130);
    return () => clearTimeout(id);
  }, [query]);

  const engine = state.status === "ready" ? state.engine : null;

  // Deep link: ?id=... auto-opens a card once data is ready.
  useEffect(() => {
    if (!engine || deepLinkChecked.current) return;
    deepLinkChecked.current = true;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      const idx = engine.rowById(id);
      if (idx !== null) setSelected(engine.rows[idx]);
    }
  }, [engine]);

  const result = useMemo(() => {
    if (!engine) return null;
    return engine.search({
      query: debounced,
      wilaya: filters.wilaya || undefined,
      moughataa: filters.moughataa || undefined,
      school: filters.school || undefined,
      serie: filters.serie || undefined,
      type: filters.type || undefined,
    });
  }, [engine, debounced, filters]);

  const topRows = useMemo(() => {
    if (!engine) return [];
    if (exam === "bac" && filters.serie && engine.top10.bySerie[filters.serie]) {
      return engine.top10.bySerie[filters.serie];
    }
    return engine.top10.overall;
  }, [engine, filters.serie, exam]);

  const title = t(exam, lang);
  const count = meta?.count ?? 0;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 80px" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "18px 0",
        }}
      >
        <Link
          href="/"
          aria-label={t("home", lang)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            minHeight: 40,
          }}
        >
          <BackArrow />
          {t("back", lang)}
        </Link>
        <LanguageToggle compact />
      </header>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, textWrap: "balance" }}>{title}</h1>
        {meta && (
          <p className="tnum" style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            {lang === "ar" ? toArabicDigits(meta.year) : meta.year} ·{" "}
            {formatInt(count, lang)} {t("candidates", lang)}
          </p>
        )}
      </div>

      {/* No published data */}
      {(!url || !meta) && <SoonState lang={lang} />}

      {url && meta && (
        <>
          {/* Sticky search + filters */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 30,
              paddingTop: 8,
              paddingBottom: 12,
              marginBottom: 8,
              background:
                "linear-gradient(180deg, rgba(4,24,14,0.96) 70%, rgba(4,24,14,0))",
              backdropFilter: "blur(6px)",
            }}
          >
            <SearchInput value={query} onChange={setQuery} lang={lang} />
            {engine && (
              <div style={{ marginTop: 12 }}>
                <Filters
                  filters={engine.filters}
                  meta={meta}
                  lang={lang}
                  values={filters}
                  onChange={setFilters}
                />
              </div>
            )}
          </div>

          {state.status === "loading" && (
            <div style={{ display: "grid", gap: 20 }}>
              <ResultsSkeleton />
            </div>
          )}

          {state.status === "error" && <ErrorState lang={lang} onRetry={retry} />}

          {state.status === "ready" && engine && result && (
            <div style={{ display: "grid", gap: 28 }}>
              {/* Top 10 — hidden while actively searching */}
              {!debounced && topRows.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <SectionTitle>
                    {exam === "bac" && filters.serie
                      ? `${t("top10Serie", lang)} · ${filters.serie}`
                      : t("top10", lang)}
                  </SectionTitle>
                  <Podium rows={topRows} meta={meta} lang={lang} onOpen={setSelected} />
                </motion.section>
              )}

              {/* Results */}
              <section>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <SectionTitle>{t("results", lang)}</SectionTitle>
                  <span className="tnum" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {formatInt(result.total, lang)} {t("showingCount", lang)}
                  </span>
                </div>

                {result.total === 0 ? (
                  <EmptyResults lang={lang} />
                ) : (
                  <VirtualList
                    count={result.total}
                    rowHeight={64}
                    gap={10}
                    height={Math.min(680, Math.max(240, result.total * 74))}
                    keyFor={(i) => String(engine.rows[result.indices[i]][COL.id]) + "-" + i}
                    renderRow={(i) => {
                      const row = engine.rows[result.indices[i]];
                      return (
                        <ResultRow
                          row={row}
                          meta={meta}
                          lang={lang}
                          onOpen={() => setSelected(row)}
                        />
                      );
                    }}
                  />
                )}
              </section>
            </div>
          )}
        </>
      )}

      {/* Student card modal */}
      <StudentCard
        row={selected}
        meta={meta ?? ({} as DatasetMeta)}
        lang={lang}
        groupSize={
          selected && engine ? engine.groupSize(String(selected[COL.rankGroup] ?? "overall")) : 0
        }
        onClose={() => setSelected(null)}
        shareBase={`/${exam}`}
      />
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ width: 4, height: 18, background: "var(--gold)", borderRadius: 2 }} />
      {children}
    </h2>
  );
}

function SearchInput({
  value,
  onChange,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: ReturnType<typeof useLang>["lang"];
}) {
  return (
    <div style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          insetInlineStart: 16,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="var(--gold)" strokeWidth="1.7" />
          <path d="m20 20-3.2-3.2" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("searchPlaceholder", lang)}
        aria-label={t("searchHint", lang)}
        style={{
          width: "100%",
          background: "var(--surface-solid)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "15px 16px 15px 48px",
          paddingInlineStart: 48,
          paddingInlineEnd: 16,
          color: "var(--text)",
          fontSize: 16,
          minHeight: 54,
          outlineOffset: 2,
        }}
      />
    </div>
  );
}

function BackArrow() {
  return (
    <svg className="dir-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
