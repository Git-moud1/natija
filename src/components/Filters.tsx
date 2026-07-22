"use client";

import { pickName } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";
import type { FilterTree, DatasetMeta } from "@/lib/types";

export interface FilterValues {
  wilaya: string;
  moughataa: string;
  school: string;
  serie: string;
  type: string;
}

interface Props {
  filters: FilterTree;
  meta: DatasetMeta;
  lang: Lang;
  values: FilterValues;
  onChange: (v: FilterValues) => void;
}

const selectStyle: React.CSSProperties = {
  appearance: "none",
  background: "var(--surface-solid)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "11px 14px",
  fontSize: 14,
  fontWeight: 500,
  minHeight: 44,
  width: "100%",
  cursor: "pointer",
};

export function Filters({ filters, meta, lang, values, onChange }: Props) {
  const wilayaKey = values.wilaya;
  const moughataaOptions = meta.hasMoughataa && wilayaKey ? filters.moughataas[wilayaKey] ?? [] : [];
  const schoolKey = meta.hasMoughataa ? values.moughataa || wilayaKey : wilayaKey;
  const schoolOptions = schoolKey ? filters.schools[schoolKey] ?? [] : [];

  const set = (patch: Partial<FilterValues>) => {
    const next = { ...values, ...patch };
    // Reset dependent filters when parent changes.
    if (patch.wilaya !== undefined) {
      next.moughataa = "";
      next.school = "";
    }
    if (patch.moughataa !== undefined) next.school = "";
    onChange(next);
  };

  const active =
    values.wilaya || values.moughataa || values.school || values.serie || values.type;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        <select
          aria-label={t("wilaya", lang)}
          style={selectStyle}
          value={values.wilaya}
          onChange={(e) => set({ wilaya: e.target.value })}
        >
          <option value="">{t("allWilayas", lang)}</option>
          {filters.wilayas.map((w) => {
            const key = w.fr || w.ar;
            return (
              <option key={key} value={key}>
                {pickName(w.ar, w.fr, lang)}
              </option>
            );
          })}
        </select>

        {meta.hasMoughataa && (
          <select
            aria-label={t("moughataa", lang)}
            style={{ ...selectStyle, opacity: wilayaKey ? 1 : 0.5 }}
            value={values.moughataa}
            disabled={!wilayaKey}
            onChange={(e) => set({ moughataa: e.target.value })}
          >
            <option value="">{t("allMoughataas", lang)}</option>
            {moughataaOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}

        <select
          aria-label={meta.exam === "bepc" ? t("centre", lang) : t("school", lang)}
          style={{ ...selectStyle, opacity: schoolOptions.length ? 1 : 0.5 }}
          value={values.school}
          disabled={schoolOptions.length === 0}
          onChange={(e) => set({ school: e.target.value })}
        >
          <option value="">
            {meta.exam === "bepc" ? t("allCentres", lang) : t("allSchools", lang)}
          </option>
          {schoolOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Série chips (BAC) */}
      {meta.hasSerie && meta.series.length > 0 && (
        <Chips
          label={t("serie", lang)}
          allLabel={t("allSeries", lang)}
          options={meta.series}
          value={values.serie}
          onSelect={(v) => set({ serie: v })}
        />
      )}

      {/* TYPE chips (Concours) */}
      {meta.hasType && meta.types.length > 0 && (
        <Chips
          label={t("type", lang)}
          allLabel={t("allTypes", lang)}
          options={meta.types}
          value={values.type}
          onSelect={(v) => set({ type: v })}
        />
      )}

      {active && (
        <button
          type="button"
          onClick={() => onChange({ wilaya: "", moughataa: "", school: "", serie: "", type: "" })}
          style={{
            justifySelf: "start",
            cursor: "pointer",
            background: "transparent",
            color: "var(--gold)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 600,
            minHeight: 36,
          }}
        >
          {t("clearFilters", lang)}
        </button>
      )}
    </div>
  );
}

function Chips({
  label,
  allLabel,
  options,
  value,
  onSelect,
}: {
  label: string;
  allLabel: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{label}:</span>
      {["", ...options].map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt || "all"}
            type="button"
            onClick={() => onSelect(opt)}
            style={{
              cursor: "pointer",
              border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
              background: active ? "var(--gold)" : "transparent",
              color: active ? "#04180e" : "var(--text-muted)",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              minHeight: 34,
              transition: "all 160ms",
            }}
          >
            {opt || allLabel}
          </button>
        );
      })}
    </div>
  );
}
