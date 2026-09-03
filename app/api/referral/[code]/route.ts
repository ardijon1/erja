import { NextRequest, NextResponse } from "next/server";

import { logReferralClick, setReferralCookieFirstTouch } from "@/lib/referral";
import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`ref-api:${ip}`, 60, 60 * 1000)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const { code } = await params;
  const trimmed = typeof code === "string" ? code.trim() : "";

  // Invalid or empty code → silent redirect to /
  if (!trimmed) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // Attempt to log click — returns null if code not found (invalid)
  const userAgent = request.headers.get("user-agent");
  const click = await logReferralClick(trimmed, userAgent);

  if (!click) {
    // Invalid code → redirect to / without setting cookie
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // Valid code → set signed referral cookie (first-touch wins) and render landing page
  const redirectUrl = new URL(`/ref/${encodeURIComponent(trimmed)}`, request.url);

  const response = NextResponse.redirect(redirectUrl, 302);
  await setReferralCookieFirstTouch(trimmed, request, response);

  return response;
}
