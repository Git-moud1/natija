import { NextResponse } from "next/server";
import { readManifest } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manifest = await readManifest();
    return NextResponse.json(manifest, {
      headers: {
        // Short CDN cache: new publishes appear within ~30s.
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json({ exams: {} }, { status: 200 });
  }
}
