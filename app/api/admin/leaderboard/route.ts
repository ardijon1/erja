import { NextResponse } from "next/server";

import { getAuthToken, purgeExpiredSessions, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildReferralBaseUrl } from "@/lib/referral-codes";
import { computeRatingSummary, findActiveTokenForReferrer } from "@/lib/rating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const token = await getAuthToken();
  if (!token || !(await verifySession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // opportunistic cleanup
  void purgeExpiredSessions();

  try {
    const referrersRaw = await prisma.referrer.findMany({
      include: {
        _count: {
          select: { clicks: true, leads: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Sort by leads desc, then clicks desc for leaderboard ranking
    const referrersSorted = [...referrersRaw].sort((a, b) => {
      if (b._count.leads !== a._count.leads) return b._count.leads - a._count.leads;
      return b._count.clicks - a._count.clicks;
    });

    const referrers = referrersSorted.map((r) => ({
      id: r.id,
      code: r.code,
      displayName: r.displayName,
      clicks: r._count.clicks,
      leads: r._count.leads,
      createdAt: r.createdAt.toISOString(),
    }));

    // فاز ۳ — بیمه‌نامه‌های صادرشده به تفکیک معرف (برای نرخ تبدیل)
    const convertedByReferrer = await prisma.lead.groupBy({
      by: ["referrerId"],
      _count: { _all: true },
      where: { status: "converted", referrerId: { not: null } },
    });
    const convertedMap: Record<string, number> = {};
    for (const row of convertedByReferrer) {
      if (row.referrerId) convertedMap[row.referrerId] = row._count._all;
    }

    const leadsRaw = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        referrer: {
          select: { code: true, displayName: true },
        },
      },
    });

    // توکن امتیاز فعال هر معرف + میانگین واقعی رضایت (fallback: مقدار دستی)
    const siteContent = await prisma.siteContent.findUnique({ where: { id: "default" } });
    const manualScore =
      siteContent && "satisfactionScore" in siteContent
        ? (siteContent.satisfactionScore as number)
        : 4.9;
    const rating = await computeRatingSummary(manualScore);

    const ratingTokens: Record<string, string | null> = {};
    for (const r of referrersRaw) {
      ratingTokens[r.id] = await findActiveTokenForReferrer(r.id);
    }

    const leads = leadsRaw.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      monthlyIncome: l.monthlyIncome,
      dependents: l.dependents,
      debt: l.debt,
      estimatedCover: l.estimatedCover,
      message: l.message,
      referrerId: l.referrerId,
      referrerCode: l.referrer?.code ?? null,
      referrerDisplayName: l.referrer?.displayName ?? null,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    }));

    // فاز ۳ — سهم ارجاع از کل سرنخ‌ها (شاخص سلامت سیستم زیرمجموعه‌گیری)
    const totalLeads = await prisma.lead.count();
    const referredLeads = await prisma.lead.count({ where: { referrerId: { not: null } } });

    // فاز ۴ — تاریخ آخرین سرنخ هر معرف (برای یادآور بی‌فعالیت)
    const lastLeadRows = await prisma.lead.findMany({
      where: { referrerId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { referrerId: true, createdAt: true },
    });
    const lastLeadAt: Record<string, string> = {};
    for (const row of lastLeadRows) {
      if (row.referrerId && !lastLeadAt[row.referrerId]) {
        lastLeadAt[row.referrerId] = row.createdAt.toISOString();
      }
    }

    return NextResponse.json(
      {
        referrers,
        leads,
        referralBaseUrl: buildReferralBaseUrl(),
        rating,
        ratingTokens,
        convertedMap,
        referralShare: {
          total: totalLeads,
          referred: referredLeads,
          percent: totalLeads > 0 ? Math.round((referredLeads / totalLeads) * 100) : 0,
        },
        lastLeadAt,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load leaderboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
