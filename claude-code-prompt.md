/goal Build "Natija" — the fastest exam-results website in Mauritania. Use the `impeccable` and `ui ux pro max` skills (if installed) for design quality.

# Natija — Mauritania BAC, BEPC & Concours Results Website

Build a complete, production-ready results website for Mauritania's three national exams: **Baccalauréat (BAC)**, **Brevet (BEPC)**, and **Concours d'entrée en 1AS (C1AS)**. The public site is read-only and must be THE FASTEST results site in the country on results day — speed and zero visible errors are the #1 and #2 priorities. A hidden password-protected admin panel lets ONE admin upload the official Excel file per exam, processed into optimized JSON and published.

## Tech Stack
- **Next.js 16** (App Router) deployed on Vercel
- Tailwind CSS + Framer Motion
- SheetJS (xlsx) for Excel parsing — **inside a Web Worker** in the admin panel (files reach 121k+ rows; the UI must never freeze)
- Vercel Blob for the processed JSON datasets (public, CDN-cached, immutable + version param)
- No database. Public path = static pages + one JSON fetch per exam from CDN. ALL search/filter/ranking runs client-side.

## Real Data (CRITICAL — these are the ACTUAL files, schemas change every year)

### BAC (three past years, all different!):
- **2025** (FR only): `NUMBAC, SERIE, TYPECANDIDAT, NOM, DATE_NAISSANCE, LIEU_NAISSANCE, MoyBac, Decision, Wilaya, CentreExamen, Etablissement`
- **2024** (bilingual): `Noreg, Wilaya_FR, Wilaya_AR, Centre Examen  FR, Centre Examen  AR, Etablissement_FR, Etablissement_AR, Num_Bac, SERIE, Serie_FR, Serie_AR, NNI, Nom_FR, NOM_AR, Lieun_FR, Lieun_AR, Date Naiss, Moy_Bac, Decision`
- **2023** (bilingual, different again): `NNI, NODOSS, SERIE, NOMPL, LIEUN, DATN, NOMPA, LIEUNA, MOYBAC, Libnoets, Libnoetce, Decision, WILAYA_FR, WILAYA_AR, LibnoetsAR, LibnoetceAR` (NOMPL=name FR, NOMPA=name AR, Libnoets=school, NODOSS=candidate number; contains empty extra sheets Feuil2/Feuil3)
- ~45–53k rows/year. Séries: `SN, LO, LM, M, TM, TS, LA` (dirty: lowercase `sn` exists). Moyenne 0–18.

### BEPC 2026 (75,694 rows, FR only):
`Numéro, NOM, DATE NISS, LIEU NAISS, Code Wilaya, Wilaya, Centre, Moyg, Decision`
- Note the real typo "DATE NISS". `Numéro` is stored as a NUMBER (int) here but as text with leading zeros ("00001") in BAC files — always convert to string and match both ways. No série, no school column (Centre only), no Arabic. 16 wilayas, 354 centres. Moyg 0–18.66.

### Concours C1AS 2026 (121,140 rows, ARABIC only):
`Noreg, Numéro_C1AS, NODOSS, NOM_AR, LIEU NAISS_AR, TYPE, Ecole_AR, ANNEE_NAISS, WILAYA_AR, MOUGHATAA_AR, Centre Examen_AR, TOTAL`
- **⚠️ `Numéro_C1AS` is NOT unique** (3-digit, repeats per centre — 120k duplicates). **The unique ID is `NODOSS` (10-digit)** — search must use NODOSS as primary, with Numéro_C1AS+centre as secondary.
- **No Decision column and no moyenne** — score is `TOTAL` (0–198 points). Display it as a score ("المجموع: 154 / 200"), NOT a moyenne, with rank. Do not invent an admis/ajourné status; optionally let the admin enter an admission-threshold number in the panel (if set, show "مقبول" badge for TOTAL ≥ threshold).
- `TYPE` is dirty: `OF, Of, of, oF, PV, pv, pV, CF` → normalize uppercase (OF/PV/CF) and expose as a filter.
- Extra hierarchy level: **Moughataa (المقاطعة)** between wilaya and school; 2,897 schools. Filters cascade: Wilaya → Moughataa → École.
- Arabic-only data: in FR interface show Arabic names/places as-is (never blank).

### Decision normalization (all observed dirty values):
`ADMIS` ← Admis, "Admis ", Admis Sn, ADMIS · `SESSIONNAIRE` ← Sessionnaire, "Sessionnaire " · `AJOURNE` ← Ajourné, Ajourné Sn, REDOUBLE · `ABSENT` ← Absent, Abscent · `ANNULE` ← ANNULE, Examen annulé, "Examen annulé -Telephone" · `ELIMINE` ← Eliminé · `DELIBERABLE` ← Delibérable. Matching = trim + case/accent-insensitive + prefix-tolerant. Unknown values: keep raw + warn admin, never crash.

## Admin Panel (`/admin`)
- Password via env `ADMIN_PASSWORD`, checked server-side, httpOnly session cookie. No public links to it.
- Flow: choose exam (BAC/BEPC/Concours) + year label → upload .xlsx → **Smart Column Mapper**: fuzzy auto-detection (case/space/accent-insensitive, using ALL aliases above) into canonical fields (`numCandidat` required — for concours map NODOSS; `nomFR`/`nomAR` at least one; `score` = moyenne or TOTAL, required; `serie`, `decision`, `wilayaFR/AR`, `moughataa`, `etablissementFR/AR`, `centreFR/AR`, `type`, `nni`, `dateNaissance`, `lieuNaissance` optional) with dropdowns + 5-row live preview, sheet selector (skip empty sheets automatically).
- Processing (in Web Worker, with progress bar): trim/clean all strings, normalize decisions & série & TYPE, parse scores as float, **compute competition ranking (1,2,2,4)** by score DESC within each série (BAC) or overall (BEPC/Concours), precompute top10 (overall + per série), filter lists (wilayas → moughataas → schools), decision counts.
- Validation summary screen before publish: row count, per-série/decision counts, warnings list, top-3 preview. **Publish** → compact JSON to Blob (`bac.json`, `bepc.json`, `concours.json` + `meta.json` with year, date, counts, optional threshold). Site always serves only the latest upload per exam.

## Bulletproof file-error handling (site must NEVER show an error to visitors)
Admin-side, handle gracefully with clear Arabic warnings (never a crash): empty/merged rows, missing scores or scores as text ("12,5" comma decimals → parse), duplicate IDs (keep all + warn), duplicate/blank column headers, broken Arabic encoding, wrong file type, 150k+ row files (stream/chunk in worker), numbers-as-text and text-as-numbers, extra empty sheets, BOM/whitespace in headers. Public-side: error boundaries everywhere, retry with backoff on JSON fetch, friendly bilingual fallback UI ("إعادة المحاولة"), never a white screen or raw error. If an exam has no published data → elegant "قريباً / Bientôt" state.

## Public Site
Default **Arabic (RTL)** + FR toggle (persisted). Full translations; graceful fallback when a name exists in only one language.

1. **Landing**: hero + THREE stunning animated cards: **الباكالوريا** · **ابريفه** · **كونكور** — each with year label + candidate count from meta.
2. **Exam page**: sticky search (by candidate number — exact first, prefix after; and by name AR/FR contains) + cascading filters (Wilaya → [Moughataa for concours] → School/Centre → Série chips for BAC only, TYPE filter for concours). Below: **Top 10** — animated podium top-3 + list 4–10; selecting a série switches to that série's top 10. Results in a virtualized list (never render 121k DOM nodes).
3. **Student card** (modal + shareable route): name AR/FR, number, série, **big animated count-up score** (moyenne /20 for BAC-BEPC, total /200 for concours), decision badge color-coded (ADMIS green + confetti burst, SESSIONNAIRE amber, AJOURNE red-ish, ELIMINE/ANNULE/ABSENT gray), **rank: "الترتيب: 45 / 31497 في شعبة SN"** (or overall), school/centre, wilaya. Copy/share button; screenshot-worthy design.

## Design — must be exceptional (use `ui ux pro max` + `impeccable` + frontend-design skills)
Mauritanian identity: deep green (#006233 family) + gold (#FFD343/#D4AF37), subtle red accents, rich dark-green gradients, subtle Moorish geometric pattern textures, glassmorphism. Beautiful Arabic type (IBM Plex Sans Arabic or Cairo via next/font) + matching Latin. Flawless RTL/LTR. Tasteful 60fps motion: page transitions, staggered entrances, count-ups, shimmer skeletons, podium reveal; respects prefers-reduced-motion. Mobile-first (perfect at 360px, big touch targets) — most visitors are on phones. Must NOT look like a template.

## Performance — priority #1
Static public pages; only network cost = one CDN JSON per exam (aggressive immutable caching + version param). Build in-memory indexes (Map by ID) after fetch without blocking the main thread (chunked/idle or worker). Meaningful skeleton within first paint; results visible in under ~2s on 3G. Lighthouse mobile ≥ 90. The 121k-row concours dataset must still feel instant.

## Deliverables
Complete repo ready for `vercel deploy` + simple-language README (env vars ADMIN_PASSWORD + Blob token, deploy steps, yearly workflow: login → upload → map → publish). Include a script generating small fake xlsx samples matching the 2025-BAC, 2026-BEPC and 2026-Concours schemas for local testing. Preserve leading zeros in IDs as strings everywhere.
