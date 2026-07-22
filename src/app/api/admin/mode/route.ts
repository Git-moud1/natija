import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { isBlobMode } from "@/lib/storage";

// Tells the admin UI which publish path to use: direct-to-Blob client upload
// (production) or the local .data server route (offline dev).
export async function GET(): Promise<NextResponse> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ blob: isBlobMode() });
}
