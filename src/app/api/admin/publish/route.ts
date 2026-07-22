import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { publishDataset } from "@/lib/storage";
import { COLUMN_ORDER, type Dataset, type ExamId } from "@/lib/types";

export const maxDuration = 60;

const EXAMS: ExamId[] = ["bac", "bepc", "concours"];

/** Basic shape validation so we never persist garbage. */
function isValidDataset(d: unknown): d is Dataset {
  if (!d || typeof d !== "object") return false;
  const ds = d as Dataset;
  if (!ds.meta || !EXAMS.includes(ds.meta.exam)) return false;
  if (!Array.isArray(ds.rows)) return false;
  if (!Array.isArray(ds.columns) || ds.columns.length !== COLUMN_ORDER.length) return false;
  if (!ds.top10 || !ds.filters) return false;
  return true;
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let dataset: unknown;
  try {
    dataset = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!isValidDataset(dataset)) {
    return NextResponse.json({ ok: false, error: "invalid_dataset" }, { status: 422 });
  }

  try {
    const { dataUrl } = await publishDataset(dataset);
    return NextResponse.json({ ok: true, dataUrl, count: dataset.meta.count });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "publish_failed", detail: String(err) },
      { status: 500 },
    );
  }
}
