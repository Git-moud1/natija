// Generates small, realistically-DIRTY .xlsx samples matching the real
// 2025-BAC, 2026-BEPC and 2026-Concours schemas, for local testing.
//
//   node scripts/generate-samples.mjs   →   ./samples/*.xlsx
import * as XLSX from "xlsx";
import * as fs from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";

// SheetJS ESM build needs fs wired in explicitly for writeFile().
XLSX.set_fs(fs);

const OUT = path.join(process.cwd(), "samples");
mkdirSync(OUT, { recursive: true });

const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];
const pad = (n, w) => String(n).padStart(w, "0");

// ── Reference data ──────────────────────────────────────────────────────────
const WILAYAS = [
  { fr: "Nouakchott Ouest", ar: "نواكشوط الغربية" },
  { fr: "Nouakchott Nord", ar: "نواكشوط الشمالية" },
  { fr: "Nouakchott Sud", ar: "نواكشوط الجنوبية" },
  { fr: "Trarza", ar: "الترارزة" },
  { fr: "Brakna", ar: "البراكنة" },
  { fr: "Assaba", ar: "لعصابة" },
  { fr: "Gorgol", ar: "لكورغل" },
  { fr: "Adrar", ar: "أدرار" },
  { fr: "Dakhlet Nouadhibou", ar: "داخلت نواذيبو" },
  { fr: "Hodh El Gharbi", ar: "الحوض الغربي" },
];
const MOUGHATAAS = ["الميناء", "توجنين", "عرفات", "دار النعيم", "الرياض", "السبخة", "لكصر", "تفرغ زينة"];
const NAMES_FR = ["Mohamed Vall", "Ahmed Salem", "Fatimetou Mint", "Aicha Mint", "El Hacen", "Sidi Mohamed", "Mariem Mint", "Brahim Ould", "Khadijetou", "Yahya Ould", "Zeinabou", "Cheikh Ahmed"];
const NAMES_AR = ["محمد فال", "أحمد سالم", "فاطمة بنت", "عائشة بنت", "الحسن", "سيدي محمد", "مريم بنت", "ابراهيم ولد", "خديجة", "يحيى ولد", "زينب", "الشيخ أحمد"];
const LIEUX_AR = ["نواكشوط", "روصو", "كيهيدي", "النعمة", "أطار", "زويرات", "كيفة", "ألاك"];
const SERIES = ["SN", "LO", "LM", "M", "TM", "TS", "LA"];

function bacDecision(moy) {
  if (moy >= 10) return pick(["Admis", "Admis ", "ADMIS", "Admis Sn"]);
  if (moy >= 8) return pick(["Sessionnaire", "Sessionnaire ", "Delibérable"]);
  return pick(["Ajourné", "Ajourné Sn", "Absent", "Abscent", "Examen annulé"]);
}

// ── BAC 2025 (FR only) ───────────────────────────────────────────────────────
function makeBac(n = 600) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const serie = Math.random() < 0.08 ? "sn" : pick(SERIES); // inject dirty lowercase
    const moy = +(Math.random() * 18).toFixed(2);
    const w = pick(WILAYAS);
    rows.push({
      NUMBAC: pad(10000 + i, 6), // text with leading zeros
      SERIE: serie,
      TYPECANDIDAT: pick(["OFFICIEL", "LIBRE"]),
      NOM: pick(NAMES_FR) + " " + pick(NAMES_FR),
      DATE_NAISSANCE: `${1 + rand(28)}/${1 + rand(12)}/${2005 + rand(3)}`,
      LIEU_NAISSANCE: pick(LIEUX_AR),
      // half the scores as comma-decimal strings to exercise the parser
      MoyBac: Math.random() < 0.5 ? String(moy).replace(".", ",") : moy,
      Decision: bacDecision(moy),
      Wilaya: w.fr,
      CentreExamen: `Centre ${1 + rand(40)}`,
      Etablissement: `Lycée ${pick(["National", "de la Capitale", "Moderne", "El Menara"])} ${1 + rand(12)}`,
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "BAC2025");
  // extra empty sheets like the real files
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Feuil2");
  XLSX.writeFile(wb, path.join(OUT, "sample-bac-2025.xlsx"));
  return rows.length;
}

// ── BEPC 2026 (FR only, Numéro as NUMBER, "DATE NISS" typo) ──────────────────
function makeBepc(n = 800) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const moy = +(Math.random() * 18.66).toFixed(2);
    const w = pick(WILAYAS);
    rows.push({
      "Numéro": i, // stored as integer — no leading zeros
      NOM: pick(NAMES_FR) + " " + pick(NAMES_FR),
      "DATE NISS": `${1 + rand(28)}/${1 + rand(12)}/${2008 + rand(3)}`, // real typo
      "LIEU NAISS": pick(LIEUX_AR),
      "Code Wilaya": pad(WILAYAS.indexOf(w) + 1, 2),
      Wilaya: w.fr,
      Centre: `${pick(["CEM", "Collège"])} ${1 + rand(60)}`,
      Moyg: Math.random() < 0.4 ? String(moy).replace(".", ",") : moy,
      Decision: moy >= 10 ? pick(["Admis", "Admis "]) : pick(["Ajourné", "Absent", "Sessionnaire"]),
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "BEPC");
  XLSX.writeFile(wb, path.join(OUT, "sample-bepc-2026.xlsx"));
  return rows.length;
}

// ── Concours C1AS 2026 (ARABIC only, NODOSS unique, Numéro_C1AS repeats) ─────
function makeConcours(n = 2000) {
  const rows = [];
  const centres = Array.from({ length: 30 }, (_, i) => `مركز ${i + 1}`);
  // Numéro_C1AS repeats per centre (1..N within a centre)
  const centreCounters = {};
  for (let i = 1; i <= n; i++) {
    const w = pick(WILAYAS);
    const centre = pick(centres);
    centreCounters[centre] = (centreCounters[centre] ?? 0) + 1;
    const total = rand(199); // 0..198
    rows.push({
      Noreg: i,
      "Numéro_C1AS": pad(centreCounters[centre], 3), // 3-digit, NOT unique
      NODOSS: pad(1000000000 + i, 10), // 10-digit unique
      NOM_AR: pick(NAMES_AR) + " " + pick(NAMES_AR),
      "LIEU NAISS_AR": pick(LIEUX_AR),
      TYPE: pick(["OF", "Of", "of", "oF", "PV", "pv", "pV", "CF"]), // dirty
      Ecole_AR: `مدرسة ${pick(["النور", "الأمل", "الفلاح", "المستقبل"])} ${1 + rand(20)}`,
      ANNEE_NAISS: 2013 + rand(3),
      WILAYA_AR: w.ar,
      MOUGHATAA_AR: pick(MOUGHATAAS),
      "Centre Examen_AR": centre,
      TOTAL: total,
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Concours");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Feuil2");
  XLSX.writeFile(wb, path.join(OUT, "sample-concours-2026.xlsx"));
  return rows.length;
}

const b = makeBac();
const e = makeBepc();
const c = makeConcours();
console.log(`✓ samples/  →  BAC(${b})  BEPC(${e})  Concours(${c})`);
console.log(`  Files: sample-bac-2025.xlsx, sample-bepc-2026.xlsx, sample-concours-2026.xlsx`);
