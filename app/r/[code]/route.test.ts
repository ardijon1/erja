import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    referrer: {
      findUnique: vi.fn(),
    },
    referralClick: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    SESSION_SECRET: "test-secret-test-secret-test-secret-123",
    DATABASE_URL: "file:./test.db",
    ADMIN_PASSWORD_HASH: "x",
    WHATSAPP_NUMBER: "989123456789",
    SITE_DOMAIN: "localhost:3000",
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "./route";

const mockedPrisma = prisma as unknown as {
  referrer: { findUnique: ReturnType<typeof vi.fn> };
  referralClick: { create: ReturnType<typeof vi.fn> };
};

function makeRequest(code?: string): NextRequest {
  const url = code ? `http://localhost:3000/r/${code}` : "http://localhost:3000/r/";
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedPrisma.referrer.findUnique.mockResolvedValue({ id: "r1" });
  mockedPrisma.referralClick.create.mockResolvedValue({ id: "c1" });
});

describe("GET /r/[code] — ریدایرکت به صفحه اختصاصی معرف", () => {
  it("کد معتبر → ریدایرکت به /ref/CODE با کوکی", async () => {
    const res = await GET(makeRequest("AB2345"), { params: Promise.resolve({ code: "AB2345" }) });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/ref/AB2345");
    expect(res.headers.get("set-cookie")).toContain("referral_code=");
  });

  it("کد ناموجود → ریدایرکت بی‌صدا به / بدون کوکی", async () => {
    mockedPrisma.referrer.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("NOPE"), { params: Promise.resolve({ code: "NOPE" }) });
    expect(res.status).toBe(302);
    const loc = res.headers.get("location") ?? "";
    expect(loc.endsWith("/")).toBe(true);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("کد خالی → ریدایرکت به /", async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ code: "" }) });
    expect(res.status).toBe(302);
    expect((res.headers.get("location") ?? "").endsWith("/")).toBe(true);
  });
});
