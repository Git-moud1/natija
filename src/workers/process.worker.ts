/// <reference lib="webworker" />
import * as XLSX from "xlsx";
import { processDataset } from "@/lib/process";
import { clean } from "@/lib/normalize";
import type { ColumnMap, ExamId } from "@/lib/types";

// The admin never blocks the UI: all Excel parsing + processing happens here.

interface SheetSummary {
  name: string;
  headers: string[];
  rowCount: number;
  preview: Record<string, unknown>[]; // first 5 data rows
  empty: boolean;
}

type InMsg =
  | { type: "load"; buffer: ArrayBuffer }
  | {
      type: "process";
      sheet: string;
      exam: ExamId;
      year: string;
      map: ColumnMap;
      threshold: number | null;
    };

let workbook: XLSX.WorkBook | null = null;

function dedupeHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    let name = clean(h);
    if (!name) name = `Colonne ${i + 1}`;
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return n === 0 ? name : `${name} (${n + 1})`;
  });
}

/** Convert a worksheet to headers + array-of-objects, robustly. */
function readSheet(ws: XLSX.WorkSheet): { headers: string[]; rows: Record<string, unknown>[] } {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: true,
  });
  if (aoa.length === 0) return { headers: [], rows: [] };
  const headers = dedupeHeaders(aoa[0] as unknown[]);
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const arr = aoa[i] as unknown[];
    if (!arr || arr.length === 0) continue;
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const v = arr[c];
      obj[headers[c]] = v ?? "";
      if (v !== "" && v !== null && v !== undefined) hasValue = true;
    }
    if (hasValue) rows.push(obj);
  }
  return { headers, rows };
}

function summarize(): SheetSummary[] {
  if (!workbook) return [];
  return workbook.SheetNames.map((name) => {
    const ws = workbook!.Sheets[name];
    const { headers, rows } = readSheet(ws);
    const empty = rows.length === 0 || headers.every((h) => /^Colonne \d+$/.test(h));
    return {
      name,
      headers,
      rowCount: rows.length,
      preview: rows.slice(0, 5),
      empty,
    };
  });
}

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  try {
    if (msg.type === "load") {
      workbook = XLSX.read(msg.buffer, { type: "array", cellDates: false, dense: false });
      const sheets = summarize();
      (self as unknown as Worker).postMessage({ type: "loaded", sheets });
      return;
    }

    if (msg.type === "process") {
      if (!workbook) {
        (self as unknown as Worker).postMessage({ type: "error", error: "no_workbook" });
        return;
      }
      const ws = workbook.Sheets[msg.sheet];
      if (!ws) {
        (self as unknown as Worker).postMessage({ type: "error", error: "no_sheet" });
        return;
      }
      const { rows } = readSheet(ws);

      const result = processDataset({
        exam: msg.exam,
        year: msg.year,
        map: msg.map,
        rows,
        threshold: msg.threshold,
        onProgress: (fraction, phase) => {
          (self as unknown as Worker).postMessage({ type: "progress", fraction, phase });
        },
      });

      (self as unknown as Worker).postMessage({ type: "result", result });
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
