import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthToken, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniqueReferralCode } from "@/lib/referral-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  return verifySession(token);
}

const createSchema = z.object({
  displayName: z.string().trim().min(1, "نام الزامی است").max(80, "نام حداکثر ۸۰ نویسه"),
});

export async function GET(): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const referrers = await prisma.referrer.findMany({
      include: {
        _count: { select: { clicks: true, leads: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        referrers: referrers.map((r) => ({
          id: r.id,
          code: r.code,
          displayName: r.displayName,
          clicks: r._count.clicks,
          leads: r._count.leads,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load referrers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const code = await generateUniqueReferralCode();
    const referrer = await prisma.referrer.create({
      data: { code, displayName: parsed.data.displayName },
    });
    return NextResponse.json(
      {
        referrer: {
          id: referrer.id,
          code: referrer.code,
          displayName: referrer.displayName,
          createdAt: referrer.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create referrer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.referrer.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
    }
    await prisma.referrer.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete referrer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
