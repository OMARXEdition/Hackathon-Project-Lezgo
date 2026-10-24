import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, type UserRow } from "@workspace/db";
import { eq } from "drizzle-orm";

const scrypt = promisify(scryptCallback);
const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("SESSION_SECRET is required for authentication");
const cookieName = "pulsemap_session";
export const publicUser = ({ id, username, age, avatarSeed, isDemo }: UserRow) => ({ id, username, age, avatarSeed, isDemo });

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
function sign(payload: string) {
  return createHmac("sha256", secret!).update(payload).digest("base64url");
}
export function setSession(res: Response, userId: number) {
  const payload = Buffer.from(JSON.stringify({ userId, expires: Date.now() + 7 * 86400000 })).toString("base64url");
  res.cookie(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000, path: "/",
  });
}
export function clearSession(res: Response) {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}
export async function currentUser(req: Request): Promise<UserRow | null> {
  const token = req.cookies?.[cookieName];
  if (typeof token !== "string") return null;
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const a = Buffer.from(signature);
    const b = Buffer.from(sign(payload));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isInteger(parsed.userId) || parsed.expires < Date.now()) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.userId));
    return user ?? null;
  } catch { return null; }
}
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Please sign in to continue" }); return; }
  res.locals.user = user;
  next();
}

// Reject cross-origin state changes, including form-based CSRF.
export function sameOrigin(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite === "cross-site") { res.status(403).json({ error: "Cross-site requests are not allowed" }); return; }
  if (origin) {
    const forwarded = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    try {
      if (![req.get("host"), forwarded].includes(new URL(origin).host)) {
        res.status(403).json({ error: "Cross-origin requests are not allowed" }); return;
      }
    } catch { res.status(403).json({ error: "Invalid request origin" }); return; }
  }
  next();
}
