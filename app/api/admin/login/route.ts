import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSession, purgeExpiredSessions, setAuthCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  slug: z.string().min(1, "slug is required"),
  password: z.string().min(1, "password is required"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`admin:login:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد است، لطفاً ۱۰ دقیقه بعد تلاش کنید" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { slug, password } = parsed.data;

  // Super-admin: slug "admin" uses the global ADMIN_PASSWORD_HASH
  if (slug === "admin") {
    let isValid = false;
    try {
      isValid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { token, expiresAt } = await createSession();
    await setAuthCookie(token, expiresAt);
    void purgeExpiredSessions();
    return NextResponse.json({ success: true, role: "admin" }, { status: 200 });
  }

  // Agent login: look up agent by slug
  const agent = await prisma.agent.findUnique({ where: { slug } });
  if (!agent || !agent.active) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  let isValid = false;
  try {
    isValid = await verifyPassword(password, agent.passwordHash);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(agent.id);
  await setAuthCookie(token, expiresAt);
  void purgeExpiredSessions();

  return NextResponse.json({ success: true, role: "agent", name: agent.name }, { status: 200 });
}
