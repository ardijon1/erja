import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "./db";
import { env } from "./env";

export const REFERRAL_COOKIE_NAME = "referral_code" as const;
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
export const REFERRAL_COOKIE_MAX_AGE_MS = REFERRAL_COOKIE_MAX_AGE * 1000;

/**
 * Sign a referral code with HMAC-SHA256 using SESSION_SECRET.
 * Format: `${code}.${hmacHex}` — code itself is never encoded, dot is delimiter.
 */
export function signReferralCode(code: string): string {
  const hmac = crypto.createHmac("sha256", env.SESSION_SECRET).update(code).digest("hex");
  return `${code}.${hmac}`;
}

/**
 * Verify a signed referral cookie value and extract the code.
 * Uses timing-safe comparison. Returns code or null if tampered/invalid.
 */
export function verifySignedReferralValue(signed: string): string | null {
  if (typeof signed !== "string" || !signed.includes(".")) return null;
  const lastDot = signed.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const code = signed.slice(0, lastDot).trim();
  const providedHmac = signed.slice(lastDot + 1).trim();
  if (!code || !providedHmac) return null;
  const expectedHmac = crypto.createHmac("sha256", env.SESSION_SECRET).update(code).digest("hex");
  // timingSafeEqual requires equal length buffers
  const a = Buffer.from(providedHmac, "utf-8");
  const b = Buffer.from(expectedHmac, "utf-8");
  if (a.length !== b.length) return null;
  try {
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return code;
}

function extractRawCookieValue(request: NextRequest): string | null {
  try {
    const direct = (
      request as unknown as { cookies?: { get?: (name: string) => { value: string } | undefined } }
    ).cookies?.get?.(REFERRAL_COOKIE_NAME)?.value;
    if (typeof direct === "string" && direct.trim()) {
      try {
        return decodeURIComponent(direct.trim());
      } catch {
        return direct.trim();
      }
    }
    const header =
      (request as unknown as { headers?: Headers }).headers?.get?.("cookie") ??
      (request as unknown as { headers?: { get?: (name: string) => string | null } }).headers?.get?.(
        "cookie",
      );
    if (typeof header === "string" && header.length > 0) {
      const parts = header.split(";");
      for (const part of parts) {
        const [rawKey, ...rawValParts] = part.split("=");
        if (rawKey?.trim() === REFERRAL_COOKIE_NAME) {
          const rawVal = rawValParts.join("=").trim();
          try {
            return decodeURIComponent(rawVal);
          } catch {
            return rawVal;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read referral code from incoming request cookies.
 * Verifies HMAC signature using SESSION_SECRET — tampered cookies return null.
 */
export function getReferralCode(request: NextRequest): string | null {
  const raw = extractRawCookieValue(request);
  if (!raw) return null;
  // Backwards compat: if value already looks signed, verify; else treat as unsigned and reject
  // (strict tamper-resistance: unsigned cookies are invalid)
  const verified = verifySignedReferralValue(raw);
  if (verified) return verified;
  // Reject unsigned plain values — forces re-attribution via /r/[code] which will set signed cookie
  return null;
}

/**
 * Validate that a referral code exists in DB and, if so, set it as a
 * signed httpOnly cookie on the provided response. Returns true if cookie was set,
 * false if code is empty or not found.
 *
 * Cookie attributes: httpOnly, sameSite lax, path /, 30d expiry,
 * secure only in production. Value is HMAC-signed with SESSION_SECRET.
 */
export async function setReferralCookie(code: string, response: NextResponse): Promise<boolean> {
  if (typeof code !== "string") return false;
  const trimmed = code.trim();
  if (!trimmed) return false;

  const referrer = await prisma.referrer.findUnique({
    where: { code: trimmed },
    select: { id: true },
  });

  if (!referrer) return false;

  const signed = signReferralCode(trimmed);

  response.cookies.set(REFERRAL_COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE,
    expires: new Date(Date.now() + REFERRAL_COOKIE_MAX_AGE_MS),
    secure: env.NODE_ENV === "production",
  });

  return true;
}

/**
 * مدل انتساب first-touch: اولین کد معتبری که مهمان از آن عبور می‌کند برنده است.
 * اگر کوکی امضاشده معتبر برای کد موجود در DB از قبل هست، دست نمی‌زنیم
 * (کوکی منقضی در مرورگر پاک شده و نمی‌رسد؛ کوکی دستکاری‌شده verify نمی‌شود
 * و کوکی کوکی حذف‌شده هم اصلاً نمی‌رسد — در هر دو حالت کوکی جدید ست می‌شود).
 * کوکیِ معتبرِ متعلق به معرفِ حذف‌شده هم اعتبار ندارد و بازنویسی می‌شود.
 *
 * خروجی: set = کوکی جدید ست شد، preserved = انتساب قبلی حفظ شد.
 */
export async function setReferralCookieFirstTouch(
  code: string,
  request: NextRequest,
  response: NextResponse,
): Promise<{ set: boolean; preserved: boolean }> {
  const existing = getReferralCode(request);
  if (existing) {
    // همان کد → هیچ کاری لازم نیست (idempotent)
    if (existing === code) {
      return { set: false, preserved: true };
    }
    // کد متفاوت → فقط اگر معرف قدیمی هنوز در DB هست، حفظ می‌شود
    const stillExists = await prisma.referrer.findUnique({
      where: { code: existing },
      select: { id: true },
    });
    if (stillExists) {
      return { set: false, preserved: true };
    }
  }
  const ok = await setReferralCookie(code, response);
  return { set: ok, preserved: false };
}

/**
 * اعتبارسنجی مقدار خام کوکی (برای صفحه‌های سروری که NextRequest ندارند).
 * کد امضاشده معتبر را برمی‌گرداند یا null.
 */
export function verifyReferralCookieValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return verifySignedReferralValue(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/**
 * Log a referral click for attribution analytics.
 * Looks up the Referrer by code; if not found, returns null and does not write.
 * Truncates userAgent to 512 chars to prevent unbounded storage.
 */
export async function logReferralClick(
  code: string,
  userAgent?: string | null,
): Promise<import("@prisma/client").ReferralClick | null> {
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  if (!trimmed) return null;

  const referrer = await prisma.referrer.findUnique({
    where: { code: trimmed },
    select: { id: true },
  });

  if (!referrer) return null;

  const ua =
    typeof userAgent === "string" && userAgent.length > 0 ? userAgent.slice(0, 512) : null;

  const click = await prisma.referralClick.create({
    data: {
      referrerId: referrer.id,
      userAgent: ua,
    },
  });

  return click;
}
