import { COLUMN_ORDER, type CompactRow, type StudentRecord, type Decision } from "./types";

/** Encode a record into a positional tuple (COLUMN_ORDER). */
export function encodeRow(r: StudentRecord): CompactRow {
  return [
    r.id,
    r.num,
    r.nomFR,
    r.nomAR,
    r.serie,
    r.score,
    r.decision,
    r.decisionRaw,
    r.wilayaFR,
    r.wilayaAR,
    r.moughataa,
    r.etabFR,
    r.etabAR,
    r.centreFR,
    r.centreAR,
    r.type,
    r.nni,
    r.dateNaissance,
    r.lieuNaissance,
    r.rank,
    r.rankGroup,
    r.admis,
  ];
}

/** Decode a positional tuple back into a record. */
export function decodeRow(t: CompactRow): StudentRecord {
  return {
    id: t[0] as string,
    num: t[1] as string,
    nomFR: t[2] as string,
    nomAR: t[3] as string,
    serie: t[4] as string,
    score: t[5] as number | null,
    decision: t[6] as Decision,
    decisionRaw: t[7] as string,
    wilayaFR: t[8] as string,
    wilayaAR: t[9] as string,
    moughataa: t[10] as string,
    etabFR: t[11] as string,
    etabAR: t[12] as string,
    centreFR: t[13] as string,
    centreAR: t[14] as string,
    type: t[15] as string,
    nni: t[16] as string,
    dateNaissance: t[17] as string,
    lieuNaissance: t[18] as string,
    rank: t[19] as number | null,
    rankGroup: t[20] as string,
    admis: t[21] as boolean | null,
  };
}

// Column index lookup for cheap tuple field access without full decode.
export const COL: Record<string, number> = Object.fromEntries(
  COLUMN_ORDER.map((c, i) => [c, i]),
);
