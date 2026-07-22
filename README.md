# نتيجة · Natija

**The fastest exam-results website in Mauritania** — for the three national exams:
**Baccalauréat (BAC)**, **Brevet (BEPC)** and **Concours d'entrée en 1AS**.

- 🟢 **Public site**: read-only, Arabic-first (RTL) with a French toggle. Static
  pages + a single CDN JSON per exam. All search / filter / ranking runs in the
  browser — even the 121k-row concours dataset feels instant.
- 🔐 **Admin panel** (`/admin`): one password. Upload the official Excel file,
  the app maps the columns for you, processes everything **inside a Web Worker**
  (the page never freezes), shows a validation summary, and publishes.
- 🗄️ **No database.** Processed datasets live on Vercel Blob (CDN-cached,
  immutable, version-stamped). Locally, they live in a `./.data` folder so you
  can run the whole thing offline.

---

## 1. Quick start (local, no accounts needed)

```bash
npm install
cp .env.example .env.local        # then set ADMIN_PASSWORD
npm run gen:samples               # creates ./samples/*.xlsx test files
npm run dev                       # http://localhost:3000
```

Because `BLOB_READ_WRITE_TOKEN` is empty, Natija runs in **LOCAL mode**: uploads
are saved to `./.data`. Go to **http://localhost:3000/admin**, log in, and upload
one of the generated files in `./samples/`.

> `npm install` downloads SheetJS from the official `cdn.sheetjs.com` URL pinned
> in `package.json` (per SheetJS's recommendation).

---

## 2. Environment variables

| Variable                | Required        | What it does                                                        |
| ----------------------- | --------------- | ------------------------------------------------------------------- |
| `ADMIN_PASSWORD`        | **Yes**         | Password for `/admin`. Use a long random string.                    |
| `BLOB_READ_WRITE_TOKEN` | Yes in **prod** | Vercel Blob token. If empty → local `./.data` mode (dev only).      |

Get the Blob token from **Vercel Dashboard → Storage → Blob → `.env.local` tab**.

---

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project → Import** the repo.
3. **Storage → Create → Blob** and connect it (this injects
   `BLOB_READ_WRITE_TOKEN` automatically).
4. **Settings → Environment Variables →** add `ADMIN_PASSWORD`.
5. **Deploy.** That's it.

Or from the CLI:

```bash
npm i -g vercel
vercel                # first deploy (creates the project)
vercel env add ADMIN_PASSWORD
vercel --prod
```

---

## 4. Yearly workflow (what the admin does each results day)

1. Go to **`/admin`** and log in with `ADMIN_PASSWORD`.
2. **Choose the exam** (BAC / BEPC / Concours) and type the **year** (e.g. 2026).
   For the concours you may optionally enter an **admission threshold**.
3. **Upload the official `.xlsx`.** The file is read in your browser — nothing
   is sent anywhere yet.
4. **Pick the sheet** (empty sheets like `Feuil2` are detected and skipped).
5. **Check the column mapping.** Natija auto-detects the columns even though the
   headers change every year; required fields are marked with `*`. Adjust any
   dropdown if needed, and confirm from the 5-row preview.
6. **Process.** A progress bar shows cleaning → ranking → top-10 → filters. This
   runs in a Web Worker, so the page stays responsive on 100k+ rows.
7. **Review** the summary: row count, decision/série counts, warnings, top-3.
8. **Publish.** The dataset goes live on the public site within ~30 seconds.

Re-uploading the same exam **replaces** the previous file — the site always
serves the latest publish.

---

## 5. How it stays fast

- **Compact wire format.** Datasets ship as a schema header + row tuples (no
  repeated JSON keys), then CDN-cached `immutable` with a version param.
- **One fetch per exam.** No API round-trips for search — the browser holds the
  data and scans it directly.
- **Off-thread work.** Excel parsing and dataset processing happen in a Web
  Worker; the id/name indexes build once on load.
- **Virtualized lists.** Only the visible rows are ever in the DOM, so 121k
  results scroll smoothly.

---

## 6. Handling messy files (built in)

The admin side normalizes, never crashes, and warns clearly (in Arabic):

- Decisions: `Admis / "Admis " / Admis Sn / Sessionnaire / Ajourné Sn / Absent /
  Abscent / Examen annulé / Eliminé / Delibérable / REDOUBLE` → clean buckets.
- Séries: dirty lowercase `sn` → `SN`, etc.
- Concours `TYPE`: `OF/Of/of/oF/PV/pv/CF` → `OF/PV/CF`.
- Scores as `"12,5"` (comma decimals) or text → parsed to numbers.
- IDs with leading zeros (`"00001"`) **and** integer IDs → both preserved as
  strings and matched either way. Concours uses **NODOSS** (10-digit) as the
  unique key, not the repeating `Numéro_C1AS`.
- Empty/merged rows, duplicate or blank headers, extra empty sheets, BOM /
  whitespace / zero-width characters in headers.

The public site has error boundaries, retry-with-backoff on fetch, a friendly
bilingual retry screen, and an elegant **"قريباً / Bientôt"** state when an exam
has no data yet.

---

## 7. Project structure

```
src/
  app/                 # routes: / (landing), /[exam], /admin, /api/*
  components/          # public UI + admin/ panel
  lib/
    normalize.ts       # cleaning + decision/série/TYPE normalization
    schema.ts          # column aliases + fuzzy auto-mapping
    process.ts         # the processing pipeline (runs in the worker)
    ranking.ts         # competition ranking (1,2,2,4)
    engine.ts          # client search / filter engine
    storage.ts         # Vercel Blob  ↔  local .data abstraction
    auth.ts            # signed-cookie admin session
  workers/
    process.worker.ts  # SheetJS parse + processDataset off the main thread
scripts/
  generate-samples.mjs # fake .xlsx matching the real schemas
```
