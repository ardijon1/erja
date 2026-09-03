import { NextResponse } from "next/server";

import { getAuthToken, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAuth() {
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
    const items = await prisma.faqItem.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "خطا در بارگذاری" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth) return auth;

  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`admin:faq:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "درخواست زیاد است" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { category?: string; question?: string; answer?: string; order?: number };
    const category = String(body.category ?? "").trim();
    const question = String(body.question ?? "").trim();
    const answer = String(body.answer ?? "").trim();
    const order = Number(body.order ?? 0);

    if (!category || !question || !answer) {
      return NextResponse.json({ error: "دسته‌بندی، سوال و جواب الزامی است." }, { status: 400 });
    }

    const item = await prisma.faqItem.create({
      data: { category, question, answer, order },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطا در ایجاد" }, { status: 500 });
  }
}

function cleanupIfNeeded() {
  // no-op — matches content route pattern
}
