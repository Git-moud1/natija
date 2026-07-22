import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  if (!verifyPassword(password)) {
    // Small delay to blunt brute force.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
