import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_URL_LENGTH = 2048;
const DEFAULT_WIDTH = 512;
const MIN_WIDTH = 128;
const MAX_WIDTH = 1024;

function parseWidth(raw: string | null): number {
  if (!raw) return DEFAULT_WIDTH;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(n)));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  cleanupIfNeeded();
  const ip = getClientIp(req);
  if (!rateLimit(`qr:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "درخواست QR زیاد است، لطفاً کمی صبر کنید" }, { status: 429 });
  }

  const target = req.nextUrl.searchParams.get("url")?.trim();

  if (!target) {
    return NextResponse.json({ error: "Missing required query param: url" }, { status: 400 });
  }

  if (target.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: `url too long (max ${MAX_URL_LENGTH} chars)` }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http and https URLs are allowed" }, { status: 400 });
  }

  // SSRF / phishing guard: only allow QR for own domain (SITE_DOMAIN) + waiver for localhost in dev
  const allowedHost = env.SITE_DOMAIN.replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0];
  if (allowedHost && env.NODE_ENV === "production") {
    const targetHost = parsed.hostname;
    if (targetHost !== allowedHost && !targetHost.endsWith(`.${allowedHost}`)) {
      return NextResponse.json({ error: "QR only allowed for site domain URLs" }, { status: 403 });
    }
  }

  const width = parseWidth(req.nextUrl.searchParams.get("width"));

  try {
    const buffer = await QRCode.toBuffer(target, {
      errorCorrectionLevel: "M",
      margin: 2,
      width,
      color: { dark: "#000000ff", light: "#ffffffff" },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(buffer.byteLength),
        // Private because URL is user-controlled; immutable only within window
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate QR code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
