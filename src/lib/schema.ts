import type { CanonicalField, ColumnMap, ExamId } from "./types";
import { fold } from "./normalize";

// ── Column aliases ──────────────────────────────────────────────────────────
// Every observed header from BAC 2023/2024/2025, BEPC 2026, Concours 2026.
// Matched via `fold()` (case/space/accent-insensitive), so list plain forms.

const ALIASES: Record<CanonicalField, string[]> = {
  numCandidat: [
    "numbac", "num_bac", "numero", "numéro", "noreg", "nodoss",
    "numero_c1as", "numéro_c1as", "numeroc1as", "numcandidat", "matricule",
  ],
  numDisplay: ["numero_c1as", "numéro_c1as", "numeroc1as", "numbac", "num_bac"],
  nomFR: ["nom", "nom_fr", "nompl", "nomfr", "nomprenom", "prenomnom", "fullname"],
  nomAR: ["nom_ar", "nomar", "nompa", "arabicname", "الاسم"],
  score: [
    "moybac", "moy_bac", "moybac", "moyg", "moyenne", "moygen",
    "total", "moygenerale", "note", "score", "points",
  ],
  serie: ["serie", "série", "serie_fr", "serie_ar", "filiere", "filière"],
  decision: ["decision", "décision", "resultat", "résultat", "libnoetce"],
  wilayaFR: ["wilaya", "wilaya_fr", "wilayafr", "region"],
  wilayaAR: ["wilaya_ar", "wilayaar"],
  moughataa: ["moughataa", "moughataa_ar", "moughataaar", "moughata", "mouqataa", "المقاطعة"],
  etablissementFR: [
    "etablissement", "établissement", "etablissement_fr", "etablissementfr",
    "ecole", "école", "ecole_ar", "ecolear", "libnoets", "school",
  ],
  etablissementAR: ["etablissement_ar", "etablissementar", "libnoetsar", "ecole_ar", "ecolear"],
  centreFR: [
    "centreexamen", "centre examen fr", "centreexamenfr", "centre",
    "centre_fr", "libnoetce", "centre examen",
  ],
  centreAR: ["centreexamenar", "centre examen ar", "centre_ar", "libnoetcear"],
  type: ["type", "typecandidat", "type_candidat", "statut"],
  nni: ["nni", "cni", "identifiant"],
  dateNaissance: ["datenaissance", "date_naissance", "datenaiss", "dateniss", "date niss", "datn", "datenais", "naissance"],
  lieuNaissance: ["lieunaissance", "lieu_naissance", "lieunaiss", "lieuniss", "lieun", "lieunfr", "lieun_fr", "lieunaissance_ar", "lieunaissar", "lieuna"],
};

// Fields whose FR/AR split needs disambiguation when a header is ambiguous.
const AR_HINT = /(_ar|ar$|arabe|arabic|عرب)/;

/** Score column priority differs per exam (concours uses TOTAL, not moyenne). */
function scoreAliasesFor(exam: ExamId): string[] {
  if (exam === "concours") return ["total", "score", "points", "note"];
  return ["moybac", "moy_bac", "moybac", "moyg", "moyenne", "moygen", "note", "score"];
}

export interface HeaderInfo {
  index: number;
  raw: string;
  folded: string;
}

/**
 * Auto-detect a canonical->header mapping from a sheet's header row.
 * Returns best-guess mappings; the admin can override every field.
 */
export function autoMap(headers: string[], exam: ExamId): ColumnMap {
  const infos: HeaderInfo[] = headers.map((raw, index) => ({
    index,
    raw,
    folded: fold(raw),
  }));

  const used = new Set<number>();
  const map: ColumnMap = {};

  // mode: "arOnly" considers only explicitly-Arabic headers; "frFirst" prefers
  // non-Arabic (plain / _FR) headers; "any" takes the best remaining.
  const pick = (
    field: CanonicalField,
    aliases: string[],
    mode: "arOnly" | "frFirst" | "any" = "any",
  ) => {
    let best: HeaderInfo | null = null;
    let bestScore = -1;
    for (const h of infos) {
      if (used.has(h.index) || !h.folded) continue;
      const isAR = AR_HINT.test(h.folded);
      if (mode === "arOnly" && !isAR) continue;
      let s = -1;
      for (let i = 0; i < aliases.length; i++) {
        const a = fold(aliases[i]);
        if (!a) continue;
        if (h.folded === a) s = Math.max(s, 100 - i);
        else if (h.folded.startsWith(a) || a.startsWith(h.folded)) s = Math.max(s, 60 - i);
        else if (h.folded.includes(a)) s = Math.max(s, 40 - i);
      }
      if (s < 0) continue;
      if (mode === "frFirst") s += isAR ? -20 : 8; // steer away from _AR headers
      if (s > bestScore) {
        bestScore = s;
        best = h;
      }
    }
    if (best) {
      map[field] = best.raw;
      used.add(best.index);
    }
  };

  // Phase 1 — claim explicitly-Arabic headers for the AR fields.
  pick("nomAR", ALIASES.nomAR, "arOnly");
  pick("wilayaAR", ALIASES.wilayaAR, "arOnly");
  pick("etablissementAR", ALIASES.etablissementAR, "arOnly");
  pick("centreAR", ALIASES.centreAR, "arOnly");
  if (exam === "concours") pick("moughataa", ALIASES.moughataa, "arOnly");

  // Phase 2 — required + FR/plain fields.
  pick("numCandidat", exam === "concours" ? ["nodoss"] : ALIASES.numCandidat);
  if (exam === "concours") pick("numDisplay", ["numero_c1as", "numeroc1as"]);
  pick("nomFR", ALIASES.nomFR, "frFirst");
  pick("score", scoreAliasesFor(exam));
  if (exam === "bac") pick("serie", ALIASES.serie);
  pick("decision", ALIASES.decision);
  pick("wilayaFR", ALIASES.wilayaFR, "frFirst");
  pick("etablissementFR", ALIASES.etablissementFR, "frFirst");
  pick("centreFR", ALIASES.centreFR, "frFirst");
  if (exam === "concours") pick("type", ALIASES.type);
  pick("nni", ALIASES.nni);
  pick("dateNaissance", ALIASES.dateNaissance);
  pick("lieuNaissance", ALIASES.lieuNaissance);

  // Phase 3 — mop up AR fields from any remaining headers (mono-AR names
  // whose header carries no explicit _AR marker, e.g. NOMPA).
  if (!map.nomAR) pick("nomAR", ALIASES.nomAR, "any");

  return map;
}

/** Fields that must be mapped before publishing. */
export function requiredFields(_exam: ExamId): CanonicalField[] {
  return ["numCandidat", "score"];
}

/** Human labels for the mapping UI. */
export const FIELD_LABELS: Record<CanonicalField, { ar: string; fr: string }> = {
  numCandidat: { ar: "رقم المترشح (المعرّف)", fr: "N° candidat (ID unique)" },
  numDisplay: { ar: "الرقم المعروض", fr: "N° affiché" },
  nomFR: { ar: "الاسم (فرنسي)", fr: "Nom (FR)" },
  nomAR: { ar: "الاسم (عربي)", fr: "Nom (AR)" },
  score: { ar: "المعدل / المجموع", fr: "Moyenne / Total" },
  serie: { ar: "الشعبة", fr: "Série" },
  decision: { ar: "النتيجة", fr: "Décision" },
  wilayaFR: { ar: "الولاية (فرنسي)", fr: "Wilaya (FR)" },
  wilayaAR: { ar: "الولاية (عربي)", fr: "Wilaya (AR)" },
  moughataa: { ar: "المقاطعة", fr: "Moughataa" },
  etablissementFR: { ar: "المؤسسة (فرنسي)", fr: "Établissement (FR)" },
  etablissementAR: { ar: "المؤسسة (عربي)", fr: "Établissement (AR)" },
  centreFR: { ar: "مركز الامتحان (فرنسي)", fr: "Centre (FR)" },
  centreAR: { ar: "مركز الامتحان (عربي)", fr: "Centre (AR)" },
  type: { ar: "النوع", fr: "Type" },
  nni: { ar: "الرقم الوطني", fr: "NNI" },
  dateNaissance: { ar: "تاريخ الميلاد", fr: "Date de naissance" },
  lieuNaissance: { ar: "مكان الميلاد", fr: "Lieu de naissance" },
};

/** Ordered field list for the mapper UI. */
export const MAPPABLE_FIELDS: CanonicalField[] = [
  "numCandidat",
  "numDisplay",
  "nomAR",
  "nomFR",
  "score",
  "serie",
  "decision",
  "wilayaAR",
  "wilayaFR",
  "moughataa",
  "etablissementAR",
  "etablissementFR",
  "centreAR",
  "centreFR",
  "type",
  "nni",
  "dateNaissance",
  "lieuNaissance",
];
