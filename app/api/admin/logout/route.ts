import { NextResponse } from "next/server";

import { clearAuthCookie, getAuthToken, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  // Best-effort: delete the DB session row if we can read the token
  try {
    const token = await getAuthToken();
    if (token) {
      const tokenHash = hashToken(token);
      await prisma.adminSession.delete({ where: { tokenHash } }).catch(() => {});
    }
  } catch {
    // Ignore — cookie clearing handles logout regardless
  }

  await clearAuthCookie();

  return NextResponse.json({ success: true }, { status: 200 });
}
