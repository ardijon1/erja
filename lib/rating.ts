import crypto from "crypto";

import { prisma } from "./db";

/**
 * سیستم امتیاز واقعی از بیمه‌شده‌ها — توکن تک‌مصرف:
 * نماینده برای هر معرف/مشتری توکن تولید می‌کند (۱۴ روزه)؛ فقط دارنده لینک
 * یک بار امتیاز می‌دهد. هیچ مسیر عمومی دیگری برای ثبت امتیاز وجود ندارد.
 */

export const RATING_TOKEN_TTL_DAYS = 14;
/** آستانه نمایش نمره واقعی سایت — زیر این تعداد، مقدار دستی fallback می‌ماند */
export const RATING_MIN_COUNT_FOR_PUBLIC = 3;

export function generateRatingToken(): string {
  return crypto.randomBytes(24).toString("hex"); // ۴۸ کاراکتر
}

export async function createRatingRequest(
  referrerId: string,
  leadId?: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRatingToken();
  const expiresAt = new Date(Date.now() + RATING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.ratingRequest.create({
    data: { token, referrerId, leadId: leadId ?? null, expiresAt },
  });

  return { token, expiresAt };
}

export interface RatingLookup {
  valid: boolean;
  reason?: "not_found" | "expired" | "already_submitted";
  referrerName?: string;
}

/** بررسی توکن برای رندر صفحه امتیاز — بدون افشای اطلاعات اضافه */
export async function lookupRatingToken(token: string): Promise<RatingLookup> {
  if (typeof token !== "string" || !/^[0-9a-f]{48}$/.test(token)) {
    return { valid: false, reason: "not_found" };
  }

  const request = await prisma.ratingRequest.findUnique({
    where: { token },
    select: { rating: true, submittedAt: true, expiresAt: true, referrer: { select: { displayName: true } } },
  });

  if (!request) return { valid: false, reason: "not_found" };
  if (request.submittedAt) return { valid: false, reason: "already_submitted" };
  if (request.expiresAt.getTime() < Date.now()) return { valid: false, reason: "expired" };

  return { valid: true, referrerName: request.referrer.displayName };
}

export async function submitRating(
  token: string,
  rating: number,
  comment?: string | null,
): Promise<{ ok: boolean; reason?: "not_found" | "expired" | "already_submitted" }> {
  const lookup = await lookupRatingToken(token);
  if (!lookup.valid) return { ok: false, reason: lookup.reason };

  await prisma.ratingRequest.update({
    where: { token },
    data: {
      rating,
      comment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 500) : null,
      submittedAt: new Date(),
    },
  });

  return { ok: true };
}

export interface RatingSummary {
  count: number;
  average: number | null;
  /** نمره‌ای که باید در سایت نمایش داده شود — با fallback دستی */
  displayScore: number;
  isReal: boolean;
}

/** میانگین واقعی + fallback: زیر آستانه، مقدار دستی SiteContent استفاده می‌شود */
export async function computeRatingSummary(manualScore: number): Promise<RatingSummary> {
  const agg = await prisma.ratingRequest.aggregate({
    _count: { rating: true },
    _avg: { rating: true },
    where: { rating: { not: null }, submittedAt: { not: null } },
  });

  const count = agg._count.rating;
  const average = count > 0 && agg._avg.rating !== null ? Math.round(agg._avg.rating * 10) / 10 : null;
  const isReal = count >= RATING_MIN_COUNT_FOR_PUBLIC && average !== null;

  return {
    count,
    average,
    displayScore: isReal ? average : manualScore,
    isReal,
  };
}

export async function findActiveTokenForReferrer(referrerId: string): Promise<string | null> {
  const req = await prisma.ratingRequest.findFirst({
    where: {
      referrerId,
      submittedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { token: true },
  });
  return req?.token ?? null;
}
