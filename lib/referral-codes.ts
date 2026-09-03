import crypto from "crypto";

import { prisma } from "./db";
import { env } from "./env";

/**
 * تولید کد معرف کوتاه و خوانا.
 * الفبا بدون کاراکترهای مبهم (I/L/O و 0/1) تا در پیام متنی و گفتگو اشتباه نشود.
 * طول پیش‌فرض ۶ → فضای کد ~۸۸۷ میلیون؛ برای مقیاس یک نماینده بیش از کافی.
 */
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" as const;
export const REFERRAL_CODE_LENGTH = 6;

export function generateReferralCode(
  length: number = REFERRAL_CODE_LENGTH,
  random: (n: number) => Uint8Array = (n) => crypto.randomBytes(n),
): string {
  let out = "";
  const bytes = random(length);
  for (let i = 0; i < length; i++) {
    out += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
  }
  return out;
}

/**
 * کد یکتا در برابر دیتابیس — تا ۵ بار تلاش در برابر تصادم.
 * (احتمال تصادم در این فضا عملاً صفر است؛ حلقه برای صرفاً ایمنی است.)
 */
export async function generateUniqueReferralCode(
  maxAttempts: number = 5,
): Promise<string> {
  let lastCode = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateReferralCode();
    lastCode = code;
    const exists = await prisma.referrer.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts (last: ${lastCode})`);
}

/**
 * ساخت لینک کامل ارجاع از کد — هماهنگ با SITE_DOMAIN و محیط.
 * در توسعه http://localhost:3000/r/XXX و در تولید https://دامنه/r/XXX
 */
export function buildReferralBaseUrl(): string {
  const domain = env.SITE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const proto = env.NODE_ENV === "production" ? "https" : "http";
  return `${proto}://${domain}/r`;
}
