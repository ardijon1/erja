import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthToken, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createRatingRequest } from "@/lib/rating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  return verifySession(token);
}

const createSchema = z.object({
  referrerId: z.string().trim().min(1),
  leadId: z.string().trim().min(1).nullable().optional(),
});

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
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const referrer = await prisma.referrer.findUnique({
      where: { id: parsed.data.referrerId },
      select: { id: true },
    });
    if (!referrer) {
      return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
    }

    const { token } = await createRatingRequest(referrer.id, parsed.data.leadId ?? null);
    return NextResponse.json({ token }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create rating request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
