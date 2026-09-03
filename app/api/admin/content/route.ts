import { NextResponse } from "next/server";

import { getAuthToken, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRawSiteContent, siteContentSchema, type RawSiteContent } from "@/lib/site-content";
import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toApiShape(row: RawSiteContent) {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    photo: row.photo,
    bio: row.bio,
    shortBio: row.shortBio,
    yearsExperience: row.yearsExperience,
    insuredCount: row.insuredCount,
    satisfactionScore: row.satisfactionScore,
    phone: row.phone,
    website: row.website,
    address: row.address,
    agencyCode: row.agencyCode,
    whatsappNumber: row.whatsappNumber,
    whatsappMessage: row.whatsappMessage,
    telegramUsername: row.telegramUsername,
    telegramMessage: row.telegramMessage,
    whatsappApiToken: row.whatsappApiToken ?? null,
    telegramBotToken: row.telegramBotToken ?? null,
    calculatorTitle: row.calculatorTitle,
    calculatorDesc: row.calculatorDesc,
    faqPreviewTitle: row.faqPreviewTitle,
    referralTitle: row.referralTitle,
    referralDesc: row.referralDesc,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireAuth(): Promise<NextResponse | null> {
  const token = await getAuthToken();
  if (!token || !(await verifySession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth) return auth;

  try {
    const raw = await getRawSiteContent();
    return NextResponse.json({ content: toApiShape(raw) }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطا در بارگذاری محتوا";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth) return auth;

  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`admin:content:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "تعداد درخواست‌ها زیاد است. لطفاً یک دقیقه بعد دوباره تلاش کنید." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = siteContentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ورودی نامعتبر است.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;

  try {
    const row = await prisma.siteContent.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        name: d.name,
        title: d.title,
        photo: d.photo,
        bio: d.bio,
        shortBio: d.shortBio,
        yearsExperience: d.yearsExperience,
        insuredCount: d.insuredCount,
        satisfactionScore: d.satisfactionScore,
        phone: d.phone,
        website: d.website,
        address: d.address ?? null,
        agencyCode: d.agencyCode ?? null,
        whatsappNumber: d.whatsappNumber,
        whatsappMessage: d.whatsappMessage,
        telegramUsername: d.telegramUsername ?? null,
        telegramMessage: d.telegramMessage ?? null,
        whatsappApiToken: d.whatsappApiToken ?? null,
        telegramBotToken: d.telegramBotToken ?? null,
        calculatorTitle: d.calculatorTitle ?? null,
        calculatorDesc: d.calculatorDesc ?? null,
        faqPreviewTitle: d.faqPreviewTitle ?? null,
        referralTitle: d.referralTitle ?? null,
        referralDesc: d.referralDesc ?? null,
      },
      update: {
        name: d.name,
        title: d.title,
        photo: d.photo,
        bio: d.bio,
        shortBio: d.shortBio,
        yearsExperience: d.yearsExperience,
        insuredCount: d.insuredCount,
        satisfactionScore: d.satisfactionScore,
        phone: d.phone,
        website: d.website,
        address: d.address ?? null,
        agencyCode: d.agencyCode ?? null,
        whatsappNumber: d.whatsappNumber,
        whatsappMessage: d.whatsappMessage,
        telegramUsername: d.telegramUsername ?? null,
        telegramMessage: d.telegramMessage ?? null,
        whatsappApiToken: d.whatsappApiToken ?? null,
        telegramBotToken: d.telegramBotToken ?? null,
        calculatorTitle: d.calculatorTitle ?? null,
        calculatorDesc: d.calculatorDesc ?? null,
        faqPreviewTitle: d.faqPreviewTitle ?? null,
        referralTitle: d.referralTitle ?? null,
        referralDesc: d.referralDesc ?? null,
      },
    });

    return NextResponse.json({ content: toApiShape(row as RawSiteContent) }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطا در ذخیره محتوا";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
