import { COL } from "./compact";
import { clean, fold, idVariants } from "./normalize";
import type { CompactRow, Dataset, DatasetMeta, FilterTree } from "./types";

export interface SearchParams {
  query: string;
  wilaya?: string;
  moughataa?: string;
  school?: string;
  serie?: string;
  type?: string;
}

export interface SearchResult {
  indices: number[]; // ALL matched row indices, ranked (caller virtualizes)
  total: number;
  exactId: number | null; // row index of exact ID hit (to auto-open card)
}

/** Holds decoded dataset + precomputed lowercase search keys + default order. */
export class ResultsEngine {
  readonly rows: CompactRow[];
  readonly meta: DatasetMeta;
  readonly filters: FilterTree;
  readonly top10: Dataset["top10"];

  private nameKeys: string[] = [];
  private idExact = new Map<string, number>();
  private idNum: string[] = [];
  private groupSizes: Record<string, number> = {};
  private defaultOrder: number[] = [];

  constructor(dataset: Dataset) {
    this.rows = dataset.rows;
    this.meta = dataset.meta;
    this.filters = dataset.filters;
    this.top10 = dataset.top10;
    this.build();
  }

  private build() {
    const iId = COL.id;
    const iNum = COL.num;
    const iAr = COL.nomAR;
    const iFr = COL.nomFR;
    const iGroup = COL.rankGroup;
    const iScore = COL.score;

    const n = this.rows.length;
    const groupSizes: Record<string, number> = {};
    this.nameKeys = new Array(n);
    this.idNum = new Array(n);
    this.defaultOrder = new Array(n);

    for (let i = 0; i < n; i++) {
      const r = this.rows[i];
      const id = String(r[iId] ?? "");
      const num = String(r[iNum] ?? "");
      this.nameKeys[i] = fold(r[iAr]) + " " + String(r[iFr] ?? "").toLowerCase();

      for (const v of idVariants(id)) if (!this.idExact.has(v)) this.idExact.set(v, i);
      for (const v of idVariants(num)) if (!this.idExact.has(v)) this.idExact.set(v, i);
      this.idNum[i] = (num || id).replace(/^0+/, "") || num || id;

      const g = String(r[iGroup] ?? "overall");
      groupSizes[g] = (groupSizes[g] ?? 0) + 1;
      this.defaultOrder[i] = i;
    }
    this.groupSizes = groupSizes;

    // Default display order: score DESC, missing scores last.
    this.defaultOrder.sort((a, b) => {
      const sa = this.rows[a][iScore];
      const sb = this.rows[b][iScore];
      const na = typeof sa === "number" ? sa : -Infinity;
      const nb = typeof sb === "number" ? sb : -Infinity;
      return nb - na;
    });
  }

  groupSize(rankGroup: string): number {
    return this.groupSizes[rankGroup] ?? this.meta.count;
  }

  private matchesFilters(r: CompactRow, p: SearchParams): boolean {
    if (p.wilaya) {
      if (String(r[COL.wilayaFR] ?? "") !== p.wilaya && String(r[COL.wilayaAR] ?? "") !== p.wilaya)
        return false;
    }
    if (p.moughataa && String(r[COL.moughataa] ?? "") !== p.moughataa) return false;
    if (p.school) {
      const s0 = String(r[COL.etabFR] ?? "");
      const s1 = String(r[COL.etabAR] ?? "");
      const s2 = String(r[COL.centreFR] ?? "");
      const s3 = String(r[COL.centreAR] ?? "");
      if (s0 !== p.school && s1 !== p.school && s2 !== p.school && s3 !== p.school) return false;
    }
    if (p.serie && String(r[COL.serie] ?? "") !== p.serie) return false;
    if (p.type && String(r[COL.type] ?? "") !== p.type) return false;
    return true;
  }

  private hasFilters(p: SearchParams): boolean {
    return !!(p.wilaya || p.moughataa || p.school || p.serie || p.type);
  }

  search(p: SearchParams): SearchResult {
    const q = clean(p.query);
    const hasQuery = q.length > 0;
    const foldedQ = fold(q);
    const numericQ = q.replace(/^0+/, "");
    const isNumeric = /^\d+$/.test(numericQ) && numericQ.length > 0;
    const filtering = this.hasFilters(p);

    let exactId: number | null = null;
    if (hasQuery) {
      for (const v of idVariants(q)) {
        const hit = this.idExact.get(v);
        if (hit !== undefined && this.matchesFilters(this.rows[hit], p)) {
          exactId = hit;
          break;
        }
      }
    }

    // No query: reuse precomputed default order (filtered if needed).
    if (!hasQuery) {
      if (!filtering) return { indices: this.defaultOrder, total: this.defaultOrder.length, exactId };
      const out: number[] = [];
      for (const idx of this.defaultOrder) {
        if (this.matchesFilters(this.rows[idx], p)) out.push(idx);
      }
      return { indices: out, total: out.length, exactId };
    }

    // Query present: tiered scan (0 exact-id, 1 prefix-id, 2 name-contains).
    const iRank = COL.rank;
    const matches: { idx: number; tier: number; rank: number }[] = [];
    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rows[i];
      if (!this.matchesFilters(r, p)) continue;
      let tier = -1;
      if (i === exactId) tier = 0;
      else if (isNumeric && this.idNum[i].startsWith(numericQ)) tier = 1;
      else if (foldedQ && this.nameKeys[i].includes(foldedQ)) tier = 2;
      if (tier < 0) continue;
      const rk = typeof r[iRank] === "number" ? (r[iRank] as number) : Number.MAX_SAFE_INTEGER;
      matches.push({ idx: i, tier, rank: rk });
    }
    matches.sort((a, b) => (a.tier !== b.tier ? a.tier - b.tier : a.rank - b.rank));
    return { indices: matches.map((m) => m.idx), total: matches.length, exactId };
  }

  rowById(id: string): number | null {
    for (const v of idVariants(id)) {
      const hit = this.idExact.get(v);
      if (hit !== undefined) return hit;
    }
    return null;
  }
}
