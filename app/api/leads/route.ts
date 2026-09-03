import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { calculateCoverage } from "@/lib/calculator";
import { prisma } from "@/lib/db";
import { getReferralCode } from "@/lib/referral";
import { normalizePhoneDigits } from "@/lib/whatsapp";
import { toEnglishDigits } from "@/lib/format";
import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const leadsSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(200, "name too long"),
  phone: z.string().trim().min(7, "phone is required").max(30, "phone too long"),
  monthlyIncome: z
    .number()
    .int()
    .nonnegative()
    .finite()
    .optional()
    .nullable(),
  dependents: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .nullable(),
  debt: z
    .number()
    .int()
    .nonnegative()
    .finite()
    .optional()
    .nullable(),
  estimatedCover: z
    .number()
    .int()
    .nonnegative()
    .finite()
    .optional()
    .nullable(),
  message: z.string().trim().max(2000, "message too long").optional().nullable(),
  // Deprecated: client-provided referrerCode is ignored for security — attribution is via signed httpOnly cookie only
  referrerCode: z.string().trim().max(100).optional().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`leads:${ip}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "درخواست‌های شما زیاد است، لطفاً بعداً تلاش کنید" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { name, phone, monthlyIncome, dependents, debt, message } = parsed.data;

  // --- Phone normalization & validation (Persian digits -> ASCII, strip separators) ---
  const rawPhoneAscii = toEnglishDigits(phone).trim();
  const normalizedDigits = normalizePhoneDigits(rawPhoneAscii);
  if (normalizedDigits.length < 10 || normalizedDigits.length > 15) {
    return NextResponse.json({ error: "شماره تماس معتبر نیست (۱۰ تا ۱۵ رقم)" }, { status: 400 });
  }
  // For Iranian numbers, ensure plausible pattern if starts with 0 or 98
  if (normalizedDigits.startsWith("0") && normalizedDigits.length !== 11) {
    return NextResponse.json({ error: "شماره موبایل ایرانی باید ۱۱ رقم و با ۰۹ شروع شود" }, { status: 400 });
  }

  // --- Referrer: ONLY trust signed httpOnly cookie (tamper-resistant). Body referrerCode is ignored ---
  const resolvedCode = getReferralCode(request);

  let referrerId: string | null = null;
  if (resolvedCode) {
    const referrer = await prisma.referrer.findUnique({
      where: { code: resolvedCode },
      select: { id: true },
    });
    if (referrer) {
      referrerId = referrer.id;
    }
  }

  // --- estimatedCover: never trust client value — recompute server-side if inputs provided ---
  let serverEstimatedCover: number | null = null;
  if (
    typeof monthlyIncome === "number" &&
    typeof dependents === "number" &&
    typeof debt === "number"
  ) {
    try {
      const calc = calculateCoverage({ monthlyIncome, dependents, debt: debt ?? 0 });
      serverEstimatedCover = calc.estimatedCover;
    } catch {
      // Invalid calc inputs -> ignore cover, store null (inputs already validated by zod)
      serverEstimatedCover = null;
    }
  } else if (typeof monthlyIncome === "number" && typeof dependents === "number") {
    try {
      const calc = calculateCoverage({ monthlyIncome, dependents, debt: debt ?? 0 });
      serverEstimatedCover = calc.estimatedCover;
    } catch {
      serverEstimatedCover = null;
    }
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        phone: normalizedDigits,
        monthlyIncome: monthlyIncome ?? null,
        dependents: dependents ?? null,
        debt: debt ?? null,
        estimatedCover: serverEstimatedCover,
        message: message?.trim() || null,
        referrerId,
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Failed to create lead";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
