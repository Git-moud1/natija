// ── Core domain types for Natija ────────────────────────────────────────────

export type ExamId = "bac" | "bepc" | "concours";

export type ScoreType = "moyenne" | "total";

/** Canonical, normalized fields we map every messy source column into. */
export type CanonicalField =
  | "numCandidat" // required — unique ID (NODOSS for concours)
  | "numDisplay" // shown number (Numéro_C1AS for concours); falls back to numCandidat
  | "nomFR"
  | "nomAR"
  | "score" // moyenne (BAC/BEPC) or TOTAL (concours)
  | "serie"
  | "decision"
  | "wilayaFR"
  | "wilayaAR"
  | "moughataa"
  | "etablissementFR"
  | "etablissementAR"
  | "centreFR"
  | "centreAR"
  | "type"
  | "nni"
  | "dateNaissance"
  | "lieuNaissance";

export type ColumnMap = Partial<Record<CanonicalField, string>>;

/** Normalized decision buckets. */
export type Decision =
  | "ADMIS"
  | "SESSIONNAIRE"
  | "AJOURNE"
  | "ABSENT"
  | "ANNULE"
  | "ELIMINE"
  | "DELIBERABLE"
  | "UNKNOWN";

/** A single processed student record, stored compactly (see COLUMN_ORDER). */
export interface StudentRecord {
  id: string; // numCandidat / NODOSS — unique key
  num: string; // display number (leading zeros preserved)
  nomFR: string;
  nomAR: string;
  serie: string; // "" when N/A
  score: number | null; // parsed float; null when missing/invalid
  decision: Decision;
  decisionRaw: string; // original text (for UNKNOWN transparency)
  wilayaFR: string;
  wilayaAR: string;
  moughataa: string;
  etabFR: string;
  etabAR: string;
  centreFR: string;
  centreAR: string;
  type: string; // OF / PV / CF for concours
  nni: string;
  dateNaissance: string;
  lieuNaissance: string;
  rank: number | null; // competition rank within its group
  rankGroup: string; // serie code, or "overall"
  admis: boolean | null; // concours threshold flag; null when N/A
}

/** Compact wire format: fixed column order + row tuples (no repeated keys). */
export const COLUMN_ORDER = [
  "id",
  "num",
  "nomFR",
  "nomAR",
  "serie",
  "score",
  "decision",
  "decisionRaw",
  "wilayaFR",
  "wilayaAR",
  "moughataa",
  "etabFR",
  "etabAR",
  "centreFR",
  "centreAR",
  "type",
  "nni",
  "dateNaissance",
  "lieuNaissance",
  "rank",
  "rankGroup",
  "admis",
] as const;

export type CompactRow = (string | number | null | boolean)[];

export interface FilterTree {
  /** Wilaya (FR label -> AR label) preserving pairing. */
  wilayas: { fr: string; ar: string }[];
  /** wilaya key -> moughataas (concours only). */
  moughataas: Record<string, string[]>;
  /** wilaya key (or moughataa key for concours) -> schools/centres. */
  schools: Record<string, string[]>;
}

export interface DatasetMeta {
  exam: ExamId;
  year: string;
  publishedAt: string; // ISO
  count: number;
  scoreType: ScoreType;
  scoreMax: number;
  hasSerie: boolean;
  hasSchool: boolean;
  hasArabic: boolean;
  hasFrench: boolean;
  hasMoughataa: boolean;
  hasType: boolean;
  threshold: number | null; // concours admission threshold (optional)
  series: string[]; // observed série codes (BAC)
  types: string[]; // observed TYPE values (concours)
  decisionCounts: Record<string, number>;
  serieCounts: Record<string, number>;
  version: string; // cache-busting stamp
}

/** The published per-exam dataset (compact). */
export interface Dataset {
  meta: DatasetMeta;
  columns: readonly string[];
  rows: CompactRow[];
  top10: {
    overall: CompactRow[];
    bySerie: Record<string, CompactRow[]>;
  };
  filters: FilterTree;
}

/** Small manifest the public site reads first. */
export interface Manifest {
  exams: Partial<
    Record<
      ExamId,
      {
        url: string; // versioned, immutable data URL (blob CDN or /api/data)
        meta: DatasetMeta;
      }
    >
  >;
}

export interface ProcessWarning {
  kind:
    | "unknown-decision"
    | "duplicate-id"
    | "missing-score"
    | "empty-row"
    | "duplicate-header"
    | "unmapped-required"
    | "encoding"
    | "generic";
  message: string;
  count?: number;
  samples?: string[];
}

export interface ProcessResult {
  dataset: Dataset;
  warnings: ProcessWarning[];
  stats: {
    totalRows: number;
    keptRows: number;
    skippedRows: number;
    duplicateIds: number;
    missingScores: number;
  };
}
