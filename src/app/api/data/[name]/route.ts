import { NextResponse } from "next/server";
import { readLocalDataset } from "@/lib/storage";

// Serves locally-stored datasets (dev / no-Blob mode). In Blob mode the client
// fetches the CDN URL directly and never hits this route.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  const body = await readLocalDataset(name);
  if (body === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
