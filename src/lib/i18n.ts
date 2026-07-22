export type Lang = "ar" | "fr";

export const DEFAULT_LANG: Lang = "ar";

type Dict = Record<string, { ar: string; fr: string }>;

export const T: Dict = {
  // Brand / global
  siteName: { ar: "نتيجة", fr: "Natija" },
  tagline: {
    ar: "أسرع منصة لنتائج الامتحانات في موريتانيا",
    fr: "La plateforme de résultats la plus rapide de Mauritanie",
  },
  back: { ar: "رجوع", fr: "Retour" },
  home: { ar: "الرئيسية", fr: "Accueil" },
  retry: { ar: "إعادة المحاولة", fr: "Réessayer" },
  loading: { ar: "جارٍ التحميل…", fr: "Chargement…" },
  soon: { ar: "قريباً", fr: "Bientôt" },
  soonDesc: {
    ar: "لم تُنشر نتائج هذا الامتحان بعد. تابعونا.",
    fr: "Les résultats de cet examen ne sont pas encore publiés.",
  },
  candidates: { ar: "مترشح", fr: "candidats" },
  results: { ar: "النتائج", fr: "Résultats" },

  // Exams
  bac: { ar: "الباكالوريا", fr: "Baccalauréat" },
  bepc: { ar: "ابريفيه", fr: "Brevet (BEPC)" },
  concours: { ar: "الكونكور", fr: "Concours 1AS" },
  bacFull: { ar: "شهادة الباكالوريا", fr: "Baccalauréat" },
  bepcFull: { ar: "شهادة ختم الدروس الإعدادية", fr: "Brevet d’études" },
  concoursFull: { ar: "مسابقة الدخول إلى السنة الأولى ثانوي", fr: "Concours d’entrée en 1AS" },

  // Search & filters
  searchPlaceholder: {
    ar: "ابحث برقم المترشح أو الاسم…",
    fr: "Rechercher par n° ou nom…",
  },
  searchHint: { ar: "أدخل رقم المترشح أو الاسم", fr: "Saisissez un numéro ou un nom" },
  noResults: { ar: "لا توجد نتائج مطابقة", fr: "Aucun résultat correspondant" },
  noResultsHint: { ar: "جرّب رقماً أو اسماً آخر", fr: "Essayez un autre numéro ou nom" },
  allWilayas: { ar: "كل الولايات", fr: "Toutes les wilayas" },
  allMoughataas: { ar: "كل المقاطعات", fr: "Toutes les moughataas" },
  allSchools: { ar: "كل المؤسسات", fr: "Tous les établissements" },
  allCentres: { ar: "كل المراكز", fr: "Tous les centres" },
  allTypes: { ar: "كل الأنواع", fr: "Tous les types" },
  filters: { ar: "تصفية", fr: "Filtres" },
  clearFilters: { ar: "مسح", fr: "Effacer" },
  wilaya: { ar: "الولاية", fr: "Wilaya" },
  moughataa: { ar: "المقاطعة", fr: "Moughataa" },
  school: { ar: "المؤسسة", fr: "Établissement" },
  centre: { ar: "المركز", fr: "Centre" },
  serie: { ar: "الشعبة", fr: "Série" },
  type: { ar: "النوع", fr: "Type" },
  allSeries: { ar: "كل الشعب", fr: "Toutes les séries" },
  showingCount: { ar: "نتيجة", fr: "résultats" },

  // Top 10
  top10: { ar: "المتفوقون العشرة الأوائل", fr: "Top 10" },
  top10Serie: { ar: "أوائل الشعبة", fr: "Top de la série" },
  rank: { ar: "الترتيب", fr: "Rang" },
  overall: { ar: "عام", fr: "général" },
  inSerie: { ar: "في شعبة", fr: "en série" },

  // Student card
  moyenne: { ar: "المعدل", fr: "Moyenne" },
  total: { ar: "المجموع", fr: "Total" },
  decision: { ar: "النتيجة", fr: "Décision" },
  number: { ar: "رقم المترشح", fr: "N° candidat" },
  birth: { ar: "الميلاد", fr: "Naissance" },
  share: { ar: "مشاركة", fr: "Partager" },
  copy: { ar: "نسخ الرابط", fr: "Copier le lien" },
  copied: { ar: "تم النسخ", fr: "Copié" },
  close: { ar: "إغلاق", fr: "Fermer" },
  admitted: { ar: "مقبول", fr: "Admis" },
  viewCard: { ar: "عرض البطاقة", fr: "Voir la fiche" },

  // Errors
  errorTitle: { ar: "تعذّر تحميل النتائج", fr: "Impossible de charger les résultats" },
  errorDesc: {
    ar: "حدث خطأ مؤقت. يرجى إعادة المحاولة.",
    fr: "Une erreur temporaire est survenue. Veuillez réessayer.",
  },

  // Landing extras
  chooseExam: { ar: "اختر الامتحان", fr: "Choisissez un examen" },
  viewResults: { ar: "عرض النتائج", fr: "Voir les résultats" },
  footerNote: {
    ar: "منصة مستقلة لعرض النتائج الرسمية بسرعة.",
    fr: "Plateforme indépendante d’affichage rapide des résultats officiels.",
  },
  updatedAt: { ar: "آخر تحديث", fr: "Mis à jour" },
};

export function t(key: keyof typeof T, lang: Lang): string {
  const entry = T[key];
  return entry ? entry[lang] : String(key);
}

export const EXAM_LABELS: Record<string, { ar: string; fr: string }> = {
  bac: T.bac,
  bepc: T.bepc,
  concours: T.concours,
};
