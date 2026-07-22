import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal, dependency-free session: an HMAC-signed httpOnly cookie. No DB.

const COOKIE = "natija_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret(): string {
  return process.env.ADMIN_PASSWORD || "";
}

function sign(value: string): string {
  return createHmac("sha256", secret() || "natija-dev-secret").update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Check a submitted password against ADMIN_PASSWORD (constant-time). */
export function verifyPassword(password: string): boolean {
  const expected = secret();
  if (!expected) return false; // refuse login when unconfigured
  return safeEqual(password, expected);
}

export async function createSession(): Promise<void> {
  const issued = String(Date.now());
  const token = `${issued}.${sign(issued)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!secret()) return false;
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  const [issued, mac] = raw.split(".");
  if (!issued || !mac) return false;
  if (!safeEqual(mac, sign(issued))) return false;
  const age = Date.now() - Number(issued);
  return Number.isFinite(age) && age >= 0 && age <= MAX_AGE * 1000;
}
