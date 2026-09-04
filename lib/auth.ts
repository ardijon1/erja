import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

import { prisma } from "./db";
import { env } from "./env";

/**
 * Admin authentication helpers.
 * Single-operator session model: password (bcrypt) + random token stored as sha256 hash in AdminSession.
 * No JWT — scale does not require it. Tokens are bearer secrets via httpOnly cookie.
 */

export const COOKIE_NAME = "admin_session";
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Hash a raw session token with HMAC-SHA256 using SESSION_SECRET for storage.
 * Raw token never stored — only HMAC, so DB leak does not yield usable cookies
 * and requires SESSION_SECRET to forge.
 */
export function hashToken(token: string): string {
  return crypto.createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

/**
 * Compare a plaintext password against a bcrypt hash (ADMIN_PASSWORD_HASH).
 * Returns false on empty inputs or bcrypt error, never throws.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Create a new admin session.
 * Generates a 32-byte random hex token, stores its sha256 hash with 24h expiry, returns raw token for cookie.
 * If agentId is provided, links the session to that agent (for agent-specific dashboards).
 */
export async function createSession(agentId?: string): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.adminSession.create({
    data: { tokenHash, expiresAt, agentId: agentId ?? null },
  });

  return { token, tokenHash, expiresAt };
}

/**
 * Verify a raw session token.
 * Hashes the token, looks up AdminSession, checks expiry. Auto-deletes expired row and returns false.
 */
export async function verifySession(token: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = hashToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
  });

  if (!session) return false;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { tokenHash } }).catch(() => {});
    return false;
  }

  return true;
}

/**
 * Get the agentId from a session token.
 * Returns null for super-admin sessions (no agentId), or the agent's ID for agent-specific sessions.
 */
export async function getSessionAgentId(token: string): Promise<string | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    select: { agentId: true, expiresAt: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;

  return session.agentId ?? null;
}

/**
 * Best-effort purge of all expired admin sessions (call opportunistically, e.g., on login/verify).
 * Prevents unbounded growth of AdminSession table.
 */
export async function purgeExpiredSessions(): Promise<void> {
  try {
    await prisma.adminSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    // ignore — non-critical cleanup
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers — must be called inside a Next.js Route Handler / Server Action
// (they use next/headers cookies() which requires request context).
// ---------------------------------------------------------------------------

function cookieOptions(expires?: Date) {
  return {
    httpOnly: true as const,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(expires ? { expires } : {}),
    // maxAge kept in sync with expiry for clients that prefer it
    ...(expires ? { maxAge: Math.floor((expires.getTime() - Date.now()) / 1000) } : {}),
  };
}

/**
 * Set the admin_session cookie with the raw token.
 * Caller should have already created the DB session via createSession().
 * If expiresAt is not provided, a fresh 24h expiry is used.
 */
export async function setAuthCookie(token: string, expiresAt?: Date): Promise<void> {
  const cookieStore = await cookies();
  const expires = expiresAt ?? new Date(Date.now() + SESSION_DURATION_MS);
  cookieStore.set(COOKIE_NAME, token, cookieOptions(expires));
}

/**
 * Clear the admin_session cookie (logout).
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  // Prefer delete if available, then also set expired cookie for robustness
  try {
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // next/headers delete may throw outside request context — fall through to set
  }
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Read the raw admin_session token from the incoming request cookies.
 * Returns null if absent or outside request context.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    return cookie?.value ?? null;
  } catch {
    return null;
  }
}
