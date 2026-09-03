import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthToken: vi.fn(),
  verifySession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    referrer: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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

import { DELETE, POST } from "./route";
import { getAuthToken, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockedGetToken = vi.mocked(getAuthToken);
const mockedVerify = vi.mocked(verifySession);
const mockedPrisma = prisma as unknown as {
  referrer: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/referrers", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDelete(id?: string): NextRequest {
  const url = id
    ? `http://localhost:3000/api/admin/referrers?id=${encodeURIComponent(id)}`
    : "http://localhost:3000/api/admin/referrers";
  return new NextRequest(url, { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetToken.mockResolvedValue("tok");
  mockedVerify.mockResolvedValue(true);
});

describe("POST /api/admin/referrers", () => {
  it("بدون نشست → 401", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await POST(makePost({ displayName: "x" }));
    expect(res.status).toBe(401);
    expect(mockedPrisma.referrer.create).not.toHaveBeenCalled();
  });

  it("نام خالی → 400", async () => {
    const res = await POST(makePost({ displayName: "   " }));
    expect(res.status).toBe(400);
  });

  it("نام طولانی‌تر از ۸۰ → 400", async () => {
    const res = await POST(makePost({ displayName: "ا".repeat(81) }));
    expect(res.status).toBe(400);
  });

  it("بدون JSON → 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/referrers", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("نام معتبر → 201 + کد یکتا + لینک", async () => {
    mockedPrisma.referrer.findUnique.mockResolvedValue(null);
    mockedPrisma.referrer.create.mockResolvedValue({
      id: "r1",
      code: "ABC234",
      displayName: "احمدی",
      createdAt: new Date("2026-09-02T00:00:00Z"),
    } as never);

    const res = await POST(makePost({ displayName: "احمدی" }));
    expect(res.status).toBe(201);
    const data = (await res.json()) as { referrer: { code: string } };
    expect(data.referrer.code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(mockedPrisma.referrer.create).toHaveBeenCalledWith({
      data: { code: expect.any(String), displayName: "احمدی" },
    });
  });
});

describe("DELETE /api/admin/referrers", () => {
  it("بدون نشست → 401", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await DELETE(makeDelete("r1"));
    expect(res.status).toBe(401);
    expect(mockedPrisma.referrer.delete).not.toHaveBeenCalled();
  });

  it("بدون id → 400", async () => {
    const res = await DELETE(makeDelete());
    expect(res.status).toBe(400);
  });

  it("معرف ناموجود → 404", async () => {
    mockedPrisma.referrer.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeDelete("nope"));
    expect(res.status).toBe(404);
  });

  it("معرف موجود → حذف 200", async () => {
    mockedPrisma.referrer.findUnique.mockResolvedValue({ id: "r1" });
    mockedPrisma.referrer.delete.mockResolvedValue({ id: "r1" } as never);
    const res = await DELETE(makeDelete("r1"));
    expect(res.status).toBe(200);
    expect(mockedPrisma.referrer.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
  });
});
