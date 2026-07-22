import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAuthenticated } from "@/lib/auth";

// Client-upload token endpoint. The browser uploads the (large) dataset JSON
// directly to Vercel Blob and only asks THIS route for a short-lived token —
// so the multi-MB concours file never passes through a serverless function and
// can never hit the 4.5 MB request-body limit (413 FUNCTION_PAYLOAD_TOO_LARGE).
//
// POST only. Auth is enforced inside onBeforeGenerateToken (the browser event),
// while onUploadCompleted is verified by Vercel via a signed callback.

export const runtime = "nodejs";

const ALLOWED_PATHS = new Set([
  "bac.json",
  "bepc.json",
  "concours.json",
  "bac.meta.json",
  "bepc.meta.json",
  "concours.meta.json",
]);

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only an authenticated admin may obtain an upload token.
        if (!(await isAuthenticated())) {
          throw new Error("unauthorized");
        }
        if (!ALLOWED_PATHS.has(pathname)) {
          throw new Error("invalid_pathname");
        }
        const isMeta = pathname.endsWith(".meta.json");
        return {
          allowedContentTypes: ["application/json"],
          addRandomSuffix: false,
          allowOverwrite: true,
          // generous ceiling — concours (121k rows) is well within this
          maximumSizeInBytes: 300 * 1024 * 1024,
          // data is immutable + version-stamped in the URL; meta is short-lived
          cacheControlMaxAge: isMeta ? 30 : 31536000,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // State lives in {exam}.meta.json (written by the same client flow),
        // so there is nothing to persist here.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    const status = message === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

// Reject non-POST explicitly so the flow can never be a GET.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
