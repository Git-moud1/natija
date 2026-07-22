"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { autoMap, FIELD_LABELS, MAPPABLE_FIELDS, requiredFields } from "@/lib/schema";
import { COL } from "@/lib/compact";
import { DECISION_LABELS } from "@/lib/normalize";
import type {
  CanonicalField,
  ColumnMap,
  ExamId,
  ProcessResult,
} from "@/lib/types";

type Step = "setup" | "sheet" | "map" | "processing" | "review" | "done";

interface SheetSummary {
  name: string;
  headers: string[];
  rowCount: number;
  preview: Record<string, unknown>[];
  empty: boolean;
}

const EXAM_OPTIONS: { id: ExamId; label: string }[] = [
  { id: "bac", label: "الباكالوريا BAC" },
  { id: "bepc", label: "البريفيه BEPC" },
  { id: "concours", label: "الكونكور Concours" },
];

export function AdminPanel() {
  const [step, setStep] = useState<Step>("setup");
  const [exam, setExam] = useState<ExamId>("bac");
  const [year, setYear] = useState("");
  const [threshold, setThreshold] = useState("");
  const [fileName, setFileName] = useState("");

  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [sheet, setSheet] = useState<string>("");
  const [map, setMap] = useState<ColumnMap>({});
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../../workers/process.worker.ts", import.meta.url),
        { type: "module" },
      );
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const validExt = /\.(xlsx|xls|csv)$/i.test(file.name);
      if (!validExt) {
        setError("نوع الملف غير مدعوم. استخدم ملف Excel (.xlsx).");
        return;
      }
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      const worker = getWorker();

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === "loaded") {
          const nonEmpty: SheetSummary[] = msg.sheets;
          setSheets(nonEmpty);
          const firstUsable = nonEmpty.find((s) => !s.empty) ?? nonEmpty[0];
          if (firstUsable) {
            setSheet(firstUsable.name);
            setMap(autoMap(firstUsable.headers, exam));
          }
          setStep("sheet");
        } else if (msg.type === "error") {
          setError(`تعذّر قراءة الملف: ${msg.error}`);
          setStep("setup");
        }
      };
      worker.postMessage({ type: "load", buffer }, [buffer]);
    },
    [exam, getWorker],
  );

  const currentSheet = sheets.find((s) => s.name === sheet);

  const runProcess = useCallback(() => {
    if (!currentSheet) return;
    setStep("processing");
    setProgress(0);
    setError(null);
    const worker = getWorker();
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "progress") {
        setProgress(msg.fraction);
        setPhase(msg.phase);
      } else if (msg.type === "result") {
        setResult(msg.result as ProcessResult);
        setStep("review");
      } else if (msg.type === "error") {
        setError(`خطأ أثناء المعالجة: ${msg.error}`);
        setStep("map");
      }
    };
    worker.postMessage({
      type: "process",
      sheet: currentSheet.name,
      exam,
      year: year || new Date().getFullYear().toString(),
      map,
      threshold: exam === "concours" && threshold ? Number(threshold) : null,
    });
  }, [currentSheet, exam, year, map, threshold, getWorker]);

  const publish = useCallback(async () => {
    if (!result) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.dataset),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStep("done");
      } else if (res.status === 401) {
        setError("انتهت الجلسة. أعد تسجيل الدخول.");
      } else {
        setError(`فشل النشر: ${data.error ?? "unknown"}`);
      }
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setPublishing(false);
    }
  }, [result]);

  const missingRequired = requiredFields(exam).filter((f) => !map[f]);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>
      <Header
        step={step}
        onLogout={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          window.location.href = "/";
        }}
      />

      <Steps step={step} />

      {error && (
        <div
          role="alert"
          style={{
            margin: "16px 0",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(193,55,43,0.14)",
            border: "1px solid rgba(193,55,43,0.4)",
            color: "#f19a92",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* STEP: setup */}
      {step === "setup" && (
        <Section title="١. اختر الامتحان وارفع الملف">
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <FieldLabel>الامتحان</FieldLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EXAM_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setExam(o.id)}
                    style={chip(exam === o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>السنة</FieldLabel>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2026"
                  inputMode="numeric"
                  style={inputStyle}
                />
              </div>
              {exam === "concours" && (
                <div>
                  <FieldLabel>عتبة القبول (اختياري)</FieldLabel>
                  <input
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="مثال: 100"
                    inputMode="numeric"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <FileDrop onFile={handleFile} fileName={fileName} />
          </div>
        </Section>
      )}

      {/* STEP: sheet */}
      {step === "sheet" && (
        <Section title="٢. اختر الورقة (Sheet)">
          <div style={{ display: "grid", gap: 10 }}>
            {sheets.map((s) => (
              <button
                key={s.name}
                type="button"
                disabled={s.empty}
                onClick={() => {
                  setSheet(s.name);
                  setMap(autoMap(s.headers, exam));
                }}
                style={{
                  ...rowSelect(sheet === s.name),
                  opacity: s.empty ? 0.45 : 1,
                  cursor: s.empty ? "not-allowed" : "pointer",
                }}
              >
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {s.empty ? "فارغة — تُتجاهل" : `${s.rowCount.toLocaleString("ar")} سطر`}
                </span>
              </button>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <BackBtn onClick={() => setStep("setup")} />
              <NextBtn disabled={!currentSheet || currentSheet.empty} onClick={() => setStep("map")}>
                التالي
              </NextBtn>
            </div>
          </div>
        </Section>
      )}

      {/* STEP: map */}
      {step === "map" && currentSheet && (
        <Section title="٣. مطابقة الأعمدة">
          <p style={{ margin: "0 0 14px", color: "var(--text-muted)", fontSize: 13 }}>
            تحقّق من المطابقة التلقائية. الحقول المطلوبة مميّزة بنجمة.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {MAPPABLE_FIELDS.map((field) => (
              <MapRow
                key={field}
                field={field}
                headers={currentSheet.headers}
                value={map[field] ?? ""}
                required={requiredFields(exam).includes(field)}
                onChange={(v) => setMap((m) => ({ ...m, [field]: v || undefined }))}
              />
            ))}
          </div>

          <Preview sheet={currentSheet} map={map} />

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <BackBtn onClick={() => setStep("sheet")} />
            <NextBtn disabled={missingRequired.length > 0} onClick={runProcess}>
              {missingRequired.length > 0
                ? `حقول مطلوبة ناقصة: ${missingRequired.length}`
                : "معالجة"}
            </NextBtn>
          </div>
        </Section>
      )}

      {/* STEP: processing */}
      {step === "processing" && (
        <Section title="جارٍ المعالجة…">
          <ProgressBar value={progress} phase={phase} />
        </Section>
      )}

      {/* STEP: review */}
      {step === "review" && result && (
        <ReviewScreen
          result={result}
          exam={exam}
          onBack={() => setStep("map")}
          onPublish={publish}
          publishing={publishing}
        />
      )}

      {/* STEP: done */}
      {step === "done" && result && (
        <Section title="تم النشر ✓">
          <div style={{ display: "grid", gap: 16, textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 15 }}>
              نُشرت نتائج {exam.toUpperCase()} بنجاح ({result.dataset.meta.count.toLocaleString("ar")} مترشح).
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <a href={`/${exam}`} style={{ ...nextBtnStyle(false), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                عرض النتائج
              </a>
              <button
                type="button"
                onClick={() => {
                  setStep("setup");
                  setResult(null);
                  setSheets([]);
                  setFileName("");
                  setMap({});
                }}
                style={backBtnStyle}
              >
                رفع ملف آخر
              </button>
            </div>
          </div>
        </Section>
      )}
    </main>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Header({ step, onLogout }: { step: Step; onLogout: () => void }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 20 }}>لوحة تحكم نتيجة</span>
      </div>
      <button type="button" onClick={onLogout} style={{ ...backBtnStyle, minHeight: 38, fontSize: 13 }}>
        خروج
      </button>
    </header>
  );
}

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "setup", label: "الملف" },
  { key: "sheet", label: "الورقة" },
  { key: "map", label: "المطابقة" },
  { key: "review", label: "المراجعة" },
];

function Steps({ step }: { step: Step }) {
  const order: Step[] = ["setup", "sheet", "map", "review"];
  const current = step === "processing" ? "map" : step === "done" ? "review" : step;
  const idx = order.indexOf(current as Step);
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {STEP_LABELS.map((s, i) => (
        <div
          key={s.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: i <= idx ? "var(--gold)" : "var(--text-muted)",
          }}
        >
          <span
            className="tnum"
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              background: i <= idx ? "var(--gold)" : "transparent",
              color: i <= idx ? "#04180e" : "var(--text-muted)",
              border: `1px solid ${i <= idx ? "var(--gold)" : "var(--border)"}`,
            }}
          >
            {i + 1}
          </span>
          {s.label}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-solid" style={{ borderRadius: 20, padding: 22 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{title}</h2>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function MapRow({
  field,
  headers,
  value,
  required,
  onChange,
}: {
  field: CanonicalField;
  headers: string[];
  value: string;
  required: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, alignItems: "center" }}>
      <label style={{ fontSize: 14, fontWeight: 500 }}>
        {FIELD_LABELS[field].ar}
        {required && <span style={{ color: "var(--gold)" }}> *</span>}
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>
          {FIELD_LABELS[field].fr}
        </span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          borderColor: required && !value ? "var(--color-red-accent)" : "var(--border)",
        }}
      >
        <option value="">— غير مطابق —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}

function Preview({
  sheet,
  map,
}: {
  sheet: SheetSummary;
  map: ColumnMap;
}) {
  const mappedHeaders = Object.values(map).filter(Boolean) as string[];
  const cols = mappedHeaders.length ? mappedHeaders : sheet.headers.slice(0, 6);
  return (
    <div style={{ marginTop: 18 }}>
      <FieldLabel>معاينة (٥ أسطر)</FieldLabel>
      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%", minWidth: 480 }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  style={{
                    padding: "8px 10px",
                    textAlign: "start",
                    background: "var(--surface)",
                    color: "var(--gold)",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.preview.map((row, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td
                    key={c}
                    style={{
                      padding: "7px 10px",
                      whiteSpace: "nowrap",
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProgressBar({ value, phase }: { value: number; phase: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ height: 12, borderRadius: 999, background: "var(--surface)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--green), var(--gold))",
            transition: "width 200ms",
          }}
        />
      </div>
      <div className="tnum" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
        {pct}% · {phase}
      </div>
    </div>
  );
}

function ReviewScreen({
  result,
  exam,
  onBack,
  onPublish,
  publishing,
}: {
  result: ProcessResult;
  exam: ExamId;
  onBack: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const { dataset, warnings, stats } = result;
  const meta = dataset.meta;
  const top3 = dataset.top10.overall.slice(0, 3);

  return (
    <Section title="٤. المراجعة قبل النشر">
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
          <Stat label="مترشحون" value={meta.count.toLocaleString("ar")} />
          <Stat label="أسطر مقروءة" value={stats.totalRows.toLocaleString("ar")} />
          <Stat label="بدون نتيجة" value={stats.missingScores.toLocaleString("ar")} />
          <Stat label="معرّفات مكرّرة" value={stats.duplicateIds.toLocaleString("ar")} />
        </div>

        {/* Decision counts */}
        <div>
          <FieldLabel>حسب النتيجة</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(meta.decisionCounts).map(([d, n]) => (
              <span key={d} style={pill}>
                {(DECISION_LABELS as Record<string, { ar: string }>)[d]?.ar ?? d}: {n.toLocaleString("ar")}
              </span>
            ))}
          </div>
        </div>

        {exam === "bac" && Object.keys(meta.serieCounts).length > 0 && (
          <div>
            <FieldLabel>حسب الشعبة</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(meta.serieCounts).map(([s, n]) => (
                <span key={s} style={pill}>
                  {s}: {n.toLocaleString("ar")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,196,67,0.4)",
              background: "rgba(255,196,67,0.08)",
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 700, color: "#ffd67a", marginBottom: 8, fontSize: 14 }}>
              تنبيهات ({warnings.length})
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 18, display: "grid", gap: 6 }}>
              {warnings.map((w, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {w.message}
                  {w.samples && w.samples.length > 0 && (
                    <span style={{ color: "var(--text)" }}> ({w.samples.slice(0, 5).join("، ")})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top 3 preview */}
        {top3.length > 0 && (
          <div>
            <FieldLabel>أوائل الترتيب</FieldLabel>
            <div style={{ display: "grid", gap: 6 }}>
              {top3.map((row, i) => (
                <div key={i} style={{ ...rowSelect(false), cursor: "default" }}>
                  <span style={{ fontWeight: 600 }}>
                    {i + 1}. {String(row[COL.nomAR] || row[COL.nomFR] || "—")}
                  </span>
                  <span className="tnum text-gold" style={{ fontWeight: 700 }}>
                    {String(row[COL.score] ?? "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <BackBtn onClick={onBack} />
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            style={{ ...nextBtnStyle(false), opacity: publishing ? 0.6 : 1 }}
          >
            {publishing ? "جارٍ النشر…" : "نشر النتائج"}
          </button>
        </div>
      </div>
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function FileDrop({ onFile, fileName }: { onFile: (f: File) => void; fileName: string }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? "var(--gold)" : "var(--border)"}`,
        borderRadius: 16,
        padding: "34px 20px",
        textAlign: "center",
        cursor: "pointer",
        background: drag ? "rgba(255,211,67,0.06)" : "transparent",
        transition: "all 160ms",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <UploadIcon />
      <div style={{ marginTop: 10, fontWeight: 600 }}>
        {fileName || "اسحب ملف Excel هنا أو انقر للاختيار"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
        .xlsx — يُعالَج محلياً في متصفحك
      </div>
    </div>
  );
}

/* ── Buttons / styles ───────────────────────────────────────────────────── */

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={backBtnStyle}>
      رجوع
    </button>
  );
}

function NextBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...nextBtnStyle(!!disabled), opacity: disabled ? 0.55 : 1 }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface-solid)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "11px 14px",
  color: "var(--text)",
  fontSize: 15,
  minHeight: 46,
};

function nextBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    background: "var(--gold)",
    color: "#04180e",
    border: "none",
    borderRadius: 12,
    padding: "13px",
    fontWeight: 700,
    fontSize: 15,
    minHeight: 48,
  };
}

const backBtnStyle: React.CSSProperties = {
  cursor: "pointer",
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "13px 22px",
  fontWeight: 600,
  fontSize: 15,
  minHeight: 48,
};

function chip(active: boolean): React.CSSProperties {
  return {
    cursor: "pointer",
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "var(--gold)" : "transparent",
    color: active ? "#04180e" : "var(--text)",
    borderRadius: 999,
    padding: "9px 18px",
    fontWeight: 700,
    fontSize: 14,
    minHeight: 42,
  };
}

function rowSelect(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px 16px",
    borderRadius: 12,
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "rgba(255,211,67,0.08)" : "var(--surface)",
    color: "var(--text)",
    cursor: "pointer",
    width: "100%",
  };
}

const pill: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 13,
  color: "var(--text)",
};

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden style={{ margin: "0 auto" }}>
      <path d="M12 16V4m0 0L8 8m4-4 4 4" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
