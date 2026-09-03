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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth) return auth;

  const { id } = await params;
  const ip = getClientIp(request);
  if (!rateLimit(`admin:faq:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "درخواست زیاد است" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { category?: string; question?: string; answer?: string; order?: number };
    const data: Record<string, string | number> = {};
    if (body.category !== undefined) data.category = String(body.category).trim();
    if (body.question !== undefined) data.question = String(body.question).trim();
    if (body.answer !== undefined) data.answer = String(body.answer).trim();
    if (body.order !== undefined) data.order = Number(body.order);

    if (data.category === "" || data.question === "" || data.answer === "") {
      return NextResponse.json({ error: "فیلد خالی مجاز نیست." }, { status: 400 });
    }

    const item = await prisma.faqItem.update({ where: { id }, data });
    return NextResponse.json({ item }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "خطا در بروزرسانی" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth) return auth;

  const { id } = await params;

  try {
    await prisma.faqItem.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "خطا در حذف" }, { status: 500 });
  }
}
