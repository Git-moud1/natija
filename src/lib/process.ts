import {
  clean,
  normalizeDecision,
  normalizeId,
  normalizeSerie,
  normalizeType,
  parseScore,
} from "./normalize";
import { assignCompetitionRanks, topN } from "./ranking";
import { encodeRow } from "./compact";
import {
  COLUMN_ORDER,
  type ColumnMap,
  type Dataset,
  type DatasetMeta,
  type ExamId,
  type FilterTree,
  type ProcessResult,
  type ProcessWarning,
  type StudentRecord,
} from "./types";

export interface ProcessOptions {
  exam: ExamId;
  year: string;
  map: ColumnMap;
  /** Raw sheet as array-of-objects keyed by original header. */
  rows: Record<string, unknown>[];
  threshold?: number | null;
  /** Progress callback (0..1) for the worker to report. */
  onProgress?: (fraction: number, phase: string) => void;
}

const TOP_N = 10;

function get(row: Record<string, unknown>, header: string | undefined): unknown {
  if (!header) return undefined;
  return row[header];
}

/**
 * The heart of Natija: clean + normalize + rank + precompute everything the
 * public site needs, from a raw sheet + a column mapping. Pure & deterministic.
 */
export function processDataset(opts: ProcessOptions): ProcessResult {
  const { exam, year, map, rows, threshold = null, onProgress } = opts;
  const warnings: ProcessWarning[] = [];

  const records: StudentRecord[] = [];
  const seenIds = new Map<string, number>();
  const unknownDecisions = new Map<string, number>();
  let skipped = 0;
  let missingScores = 0;
  let duplicateIds = 0;
  let anyAR = false;
  let anyFR = false;

  const total = rows.length || 1;
  const report = (i: number, phase: string) => {
    if (onProgress && (i % 2000 === 0 || i === rows.length - 1)) {
      onProgress(Math.min(1, i / total) * 0.7, phase);
    }
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    report(i, "clean");

    const id = normalizeId(get(row, map.numCandidat));
    const nomFR = clean(get(row, map.nomFR));
    const nomAR = clean(get(row, map.nomAR));

    // Skip genuinely empty rows (merged cells / trailing blanks).
    if (!id && !nomFR && !nomAR) {
      skipped++;
      continue;
    }

    const rawDecision = clean(get(row, map.decision));
    const decision = map.decision ? normalizeDecision(rawDecision) : "UNKNOWN";
    if (map.decision && decision === "UNKNOWN" && rawDecision) {
      unknownDecisions.set(rawDecision, (unknownDecisions.get(rawDecision) ?? 0) + 1);
    }

    const score = parseScore(get(row, map.score));
    if (score === null) missingScores++;

    const numDisplay = map.numDisplay ? normalizeId(get(row, map.numDisplay)) : id;

    if (nomAR) anyAR = true;
    if (nomFR) anyFR = true;

    if (id) {
      if (seenIds.has(id)) duplicateIds++;
      seenIds.set(id, (seenIds.get(id) ?? 0) + 1);
    }

    const rec: StudentRecord = {
      id: id || `row-${i}`,
      num: numDisplay || id,
      nomFR,
      nomAR,
      serie: exam === "bac" ? normalizeSerie(get(row, map.serie)) : "",
      score,
      decision,
      decisionRaw: rawDecision,
      wilayaFR: clean(get(row, map.wilayaFR)),
      wilayaAR: clean(get(row, map.wilayaAR)),
      moughataa: exam === "concours" ? clean(get(row, map.moughataa)) : "",
      etabFR: clean(get(row, map.etablissementFR)),
      etabAR: clean(get(row, map.etablissementAR)),
      centreFR: clean(get(row, map.centreFR)),
      centreAR: clean(get(row, map.centreAR)),
      type: exam === "concours" ? normalizeType(get(row, map.type)) : "",
      nni: clean(get(row, map.nni)),
      dateNaissance: clean(get(row, map.dateNaissance)),
      lieuNaissance: clean(get(row, map.lieuNaissance)),
      rank: null,
      rankGroup: "overall",
      admis: null,
    };

    // Concours admission flag (only when a threshold is set).
    if (exam === "concours" && threshold !== null && score !== null) {
      rec.admis = score >= threshold;
    }

    records.push(rec);
  }

  // ── Ranking ──────────────────────────────────────────────────────────────
  onProgress?.(0.75, "rank");
  const serieCounts: Record<string, number> = {};
  const observedSeries = new Set<string>();

  if (exam === "bac") {
    // Rank within each série.
    const bySerie = new Map<string, StudentRecord[]>();
    for (const r of records) {
      const key = r.serie || "—";
      if (r.serie) observedSeries.add(r.serie);
      serieCounts[key] = (serieCounts[key] ?? 0) + 1;
      let arr = bySerie.get(key);
      if (!arr) bySerie.set(key, (arr = []));
      arr.push(r);
    }
    for (const [serie, arr] of bySerie) assignCompetitionRanks(arr, serie);
  } else {
    assignCompetitionRanks(records, "overall");
  }

  // ── Top 10 ─────────────────────────────────────────────────────────────
  onProgress?.(0.85, "top");
  const top10Overall = topN(records, TOP_N).map(encodeRow);
  const top10BySerie: Record<string, ReturnType<typeof encodeRow>[]> = {};
  if (exam === "bac") {
    const bySerie = new Map<string, StudentRecord[]>();
    for (const r of records) {
      if (!r.serie) continue;
      let arr = bySerie.get(r.serie);
      if (!arr) bySerie.set(r.serie, (arr = []));
      arr.push(r);
    }
    for (const [serie, arr] of bySerie) top10BySerie[serie] = topN(arr, TOP_N).map(encodeRow);
  }

  // ── Filters (cascading) ───────────────────────────────────────────────
  onProgress?.(0.9, "filters");
  const filters = buildFilters(exam, records);

  // ── Decision counts + observed TYPE ─────────────────────────────────────
  const decisionCounts: Record<string, number> = {};
  const observedTypes = new Set<string>();
  for (const r of records) {
    decisionCounts[r.decision] = (decisionCounts[r.decision] ?? 0) + 1;
    if (r.type) observedTypes.add(r.type);
  }

  // ── Score bounds ───────────────────────────────────────────────────────
  let scoreMaxObserved = 0;
  for (const r of records) if (r.score !== null && r.score > scoreMaxObserved) scoreMaxObserved = r.score;
  const scoreType = exam === "concours" ? "total" : "moyenne";
  const scoreMax = exam === "concours" ? 200 : 20;

  // ── Warnings ───────────────────────────────────────────────────────────
  if (unknownDecisions.size > 0) {
    const samples = [...unknownDecisions.keys()].slice(0, 8);
    const count = [...unknownDecisions.values()].reduce((a, b) => a + b, 0);
    warnings.push({
      kind: "unknown-decision",
      message: `${unknownDecisions.size} valeur(s) de décision non reconnue(s) (conservées telles quelles).`,
      count,
      samples,
    });
  }
  if (duplicateIds > 0) {
    warnings.push({
      kind: "duplicate-id",
      message: `${duplicateIds} identifiant(s) en double — toutes les lignes sont conservées.`,
      count: duplicateIds,
    });
  }
  if (missingScores > 0) {
    warnings.push({
      kind: "missing-score",
      message: `${missingScores} ligne(s) sans note valide — non classées.`,
      count: missingScores,
    });
  }
  if (skipped > 0) {
    warnings.push({
      kind: "empty-row",
      message: `${skipped} ligne(s) vide(s) ignorée(s).`,
      count: skipped,
    });
  }

  onProgress?.(0.97, "encode");
  const encodedRows = records.map(encodeRow);

  const version = `${Date.now()}`;
  const meta: DatasetMeta = {
    exam,
    year: clean(year),
    publishedAt: new Date().toISOString(),
    count: records.length,
    scoreType,
    scoreMax,
    hasSerie: exam === "bac",
    hasSchool: records.some((r) => r.etabFR || r.etabAR),
    hasArabic: anyAR,
    hasFrench: anyFR,
    hasMoughataa: exam === "concours",
    hasType: observedTypes.size > 0,
    threshold: exam === "concours" ? threshold : null,
    series: [...observedSeries].sort(),
    types: [...observedTypes].sort(),
    decisionCounts,
    serieCounts,
    version,
  };

  const dataset: Dataset = {
    meta,
    columns: COLUMN_ORDER as unknown as string[],
    rows: encodedRows,
    top10: { overall: top10Overall, bySerie: top10BySerie },
    filters,
  };

  onProgress?.(1, "done");

  return {
    dataset,
    warnings,
    stats: {
      totalRows: rows.length,
      keptRows: records.length,
      skippedRows: skipped,
      duplicateIds,
      missingScores,
    },
  };
}

/** Build cascading Wilaya -> [Moughataa] -> School/Centre trees. */
function buildFilters(exam: ExamId, records: StudentRecord[]): FilterTree {
  const wilayaPair = new Map<string, { fr: string; ar: string }>();
  const moughataas = new Map<string, Set<string>>();
  const schools = new Map<string, Set<string>>();

  for (const r of records) {
    const wFR = r.wilayaFR;
    const wAR = r.wilayaAR;
    const wKey = wFR || wAR;
    if (wKey) {
      const existing = wilayaPair.get(wKey);
      if (!existing) wilayaPair.set(wKey, { fr: wFR, ar: wAR });
      else {
        if (!existing.fr && wFR) existing.fr = wFR;
        if (!existing.ar && wAR) existing.ar = wAR;
      }
    }

    const school = r.etabFR || r.etabAR || r.centreFR || r.centreAR;

    if (exam === "concours") {
      const m = r.moughataa;
      if (wKey && m) {
        let set = moughataas.get(wKey);
        if (!set) moughataas.set(wKey, (set = new Set()));
        set.add(m);
      }
      // Concours: schools cascade under moughataa.
      const sKey = m || wKey;
      if (sKey && school) {
        let set = schools.get(sKey);
        if (!set) schools.set(sKey, (set = new Set()));
        set.add(school);
      }
    } else if (wKey && school) {
      let set = schools.get(wKey);
      if (!set) schools.set(wKey, (set = new Set()));
      set.add(school);
    }
  }

  const collator = new Intl.Collator("ar");
  return {
    wilayas: [...wilayaPair.values()].sort((a, b) =>
      collator.compare(a.ar || a.fr, b.ar || b.fr),
    ),
    moughataas: Object.fromEntries(
      [...moughataas.entries()].map(([k, v]) => [k, [...v].sort((a, b) => collator.compare(a, b))]),
    ),
    schools: Object.fromEntries(
      [...schools.entries()].map(([k, v]) => [k, [...v].sort((a, b) => collator.compare(a, b))]),
    ),
  };
}
