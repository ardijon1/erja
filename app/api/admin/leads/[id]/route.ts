import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthToken, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAD_STATUSES, normalizeStatus } from "@/lib/lead-status";
import { generateUniqueReferralCode } from "@/lib/referral-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است").max(200).optional(),
  phone: z.string().trim().min(7, "شماره تماس کوتاه است").max(30).optional(),
  message: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  policyNumber: z.string().trim().max(50).nullable().optional(),
  monthlyIncome: z.number().int().min(0).max(1e12).nullable().optional(),
  dependents: z.number().int().min(0).max(20).nullable().optional(),
  debt: z.number().int().min(0).max(1e12).nullable().optional(),
  estimatedCover: z.number().int().min(0).max(1e12).nullable().optional(),
});

async function ensureAdmin(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  return verifySession(token);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // وضعیت‌های قدیمی (contacted/closed) را به چرخه جدید نگاشت می‌کنیم
    const nextStatus: string = data.status ?? normalizeStatus(existing.status);
    const updateData: Record<string, unknown> = { ...data };
    let createdReferrer: { code: string; displayName: string } | null = null;

    if (nextStatus === "converted") {
      updateData.policyAt =
        existing.policyAt ?? (data.policyNumber !== undefined ? new Date() : existing.policyAt) ?? new Date();

      // فاز ۲ — تبدیل مشتری به معرف: اگر سرنخ معرف ندارد، خودکار کد معرف می‌سازیم
      if (!existing.referrerId) {
        const code = await generateUniqueReferralCode();
        const referrer = await prisma.referrer.create({
          data: { code, displayName: existing.name },
        });
        updateData.referrerId = referrer.id;
        createdReferrer = { code: referrer.code, displayName: referrer.displayName };
      }
    } else {
      updateData.policyNumber = null;
      updateData.policyAt = null;
    }

    const updated = await prisma.lead.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, lead: updated, createdReferrer }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
