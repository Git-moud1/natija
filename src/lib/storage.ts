import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Dataset, DatasetMeta, ExamId, Manifest } from "./types";

// Storage abstraction: Vercel Blob in production (token present), local .data
// directory in development so the whole app runs offline.

const EXAMS: ExamId[] = ["bac", "bepc", "concours"];
const LOCAL_DIR = path.join(process.cwd(), ".data");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ── Local mode ──────────────────────────────────────────────────────────────

async function ensureLocalDir() {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
}

async function localWrite(name: string, body: string) {
  await ensureLocalDir();
  await fs.writeFile(path.join(LOCAL_DIR, name), body, "utf8");
}

async function localReadJSON<T>(name: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, name), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Persist a full processed dataset + its small meta sidecar. */
export async function publishDataset(dataset: Dataset): Promise<{ dataUrl: string }> {
  const exam = dataset.meta.exam;
  const dataName = `${exam}.json`;
  const metaName = `${exam}.meta.json`;
  const body = JSON.stringify(dataset);

  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    const dataBlob = await put(dataName, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 31536000,
    });
    const meta = { ...dataset.meta, dataUrl: dataBlob.url };
    await put(metaName, JSON.stringify(meta), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 30,
    });
    return { dataUrl: dataBlob.url };
  }

  // Local mode
  const dataUrl = `/api/data/${dataName}?v=${dataset.meta.version}`;
  await localWrite(dataName, body);
  await localWrite(metaName, JSON.stringify({ ...dataset.meta, dataUrl }));
  return { dataUrl };
}

type StoredMeta = DatasetMeta & { dataUrl: string };

/** Read the small manifest the public site loads first. */
export async function readManifest(): Promise<Manifest> {
  const manifest: Manifest = { exams: {} };

  if (hasBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list();
    const byName = new Map(blobs.map((b) => [b.pathname, b.url]));
    await Promise.all(
      EXAMS.map(async (exam) => {
        const url = byName.get(`${exam}.meta.json`);
        if (!url) return;
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return;
          const meta = (await res.json()) as StoredMeta;
          manifest.exams[exam] = { url: meta.dataUrl, meta };
        } catch {
          /* exam simply stays absent -> "Bientôt" state */
        }
      }),
    );
    return manifest;
  }

  await Promise.all(
    EXAMS.map(async (exam) => {
      const meta = await localReadJSON<StoredMeta>(`${exam}.meta.json`);
      if (meta) manifest.exams[exam] = { url: meta.dataUrl, meta };
    }),
  );
  return manifest;
}

/** Local-only: read a raw dataset file for the /api/data route. */
export async function readLocalDataset(name: string): Promise<string | null> {
  if (!/^[a-z]+\.json$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(LOCAL_DIR, name), "utf8");
  } catch {
    return null;
  }
}

export function isBlobMode(): boolean {
  return hasBlob();
}
