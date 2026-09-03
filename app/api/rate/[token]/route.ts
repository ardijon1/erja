import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { submitRating } from "@/lib/rating";
import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`rate:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد است" }, { status: 429 });
  }

  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "امتیاز باید بین ۱ تا ۵ باشد" }, { status: 400 });
  }

  try {
    const result = await submitRating(token, parsed.data.rating, parsed.data.comment ?? null);
    if (!result.ok) {
      return NextResponse.json({ error: "این لینک امتیاز معتبر نیست" }, { status: 410 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit rating";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
