import type { StudentRecord } from "./types";

/**
 * Standard competition ranking ("1, 2, 2, 4"): equal scores share a rank, and
 * the next distinct score skips ranks accordingly. Records are ranked by score
 * DESC. Records without a score get rank = null.
 *
 * Mutates `rank` and `rankGroup` on each record in place for the given group.
 */
export function assignCompetitionRanks(records: StudentRecord[], group: string): void {
  const scored = records.filter((r) => r.score !== null);
  scored.sort((a, b) => (b.score as number) - (a.score as number));

  let prevScore: number | null = null;
  let prevRank = 0;
  for (let i = 0; i < scored.length; i++) {
    const r = scored[i];
    const s = r.score as number;
    if (prevScore === null || s !== prevScore) {
      prevRank = i + 1; // skip ranks for ties (competition ranking)
      prevScore = s;
    }
    r.rank = prevRank;
    r.rankGroup = group;
  }

  for (const r of records) {
    if (r.score === null) {
      r.rank = null;
      r.rankGroup = group;
    }
  }
}

/** Top N by score DESC (already-ranked records), stable by rank then id. */
export function topN(records: StudentRecord[], n: number): StudentRecord[] {
  return records
    .filter((r) => r.score !== null)
    .slice()
    .sort((a, b) => {
      const d = (b.score as number) - (a.score as number);
      if (d !== 0) return d;
      return a.id.localeCompare(b.id);
    })
    .slice(0, n);
}
