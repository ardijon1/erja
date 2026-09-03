import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { calculateCoverage } from "@/lib/calculator";
import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const calculatorSchema = z.object({
  monthlyIncome: z
    .number({ error: "monthlyIncome must be a number" })
    .int("monthlyIncome must be an integer")
    .nonnegative("monthlyIncome must be >= 0")
    .finite(),
  dependents: z
    .number({ error: "dependents must be a number" })
    .int("dependents must be an integer")
    .min(0, "dependents must be >= 0")
    .max(20, "dependents must be <= 20"),
  debt: z
    .number({ error: "debt must be a number" })
    .int("debt must be an integer")
    .nonnegative("debt must be >= 0")
    .finite()
    .optional()
    .default(0),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`calc:${ip}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: "تعداد محاسبات زیاد است، لطفاً کمی صبر کنید" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = calculatorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = calculateCoverage(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
