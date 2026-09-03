import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthToken: vi.fn(),
  verifySession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    referrer: {
      findUnique: vi.fn(),
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

import { PATCH, DELETE } from "./route";
import { getAuthToken, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockedGetToken = vi.mocked(getAuthToken);
const mockedVerify = vi.mocked(verifySession);
const mockedPrisma = prisma as unknown as {
  lead: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  referrer: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function makeRequest(body: unknown, id = "lead-1"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(id = "lead-1"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/leads/${id}`, {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/admin/leads/[id] — احراز هویت", () => {
  it("بدون نشست → 401", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ name: "x" }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(401);
  });

  it("نشست نامعتبر → 401", async () => {
    mockedGetToken.mockResolvedValue("tok");
    mockedVerify.mockResolvedValue(false);
    const res = await PATCH(makeRequest({ name: "x" }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/admin/leads/[id] — اعتبارسنجی", () => {
  beforeEach(() => {
    mockedGetToken.mockResolvedValue("tok");
    mockedVerify.mockResolvedValue(true);
  });

  it("وضعیت نامعتبر → 400", async () => {
    const res = await PATCH(makeRequest({ status: "hacked" }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(400);
    expect(mockedPrisma.lead.update).not.toHaveBeenCalled();
  });

  it("وضعیت قدیمی contacted → 400 (کلاینت باید follow_up بفرستد)", async () => {
    const res = await PATCH(makeRequest({ status: "contacted" }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(400);
  });

  it("وضعیت‌های جدید چرخه → 200", async () => {
    mockedPrisma.lead.findUnique.mockResolvedValue({
      id: "lead-1", name: "a", phone: "0912", monthlyIncome: null, dependents: null,
      debt: null, estimatedCover: null, message: null, referrerId: null,
      createdAt: new Date(), status: "new", policyNumber: null, policyAt: null,
    });
    mockedPrisma.lead.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "lead-1", ...data }),
    );
    for (const s of ["follow_up", "lost"]) {
      const res = await PATCH(makeRequest({ status: s }), { params: Promise.resolve({ id: "lead-1" }) });
      expect(res.status).toBe(200);
    }
  });

  it("وضعیت حذف‌شده no_answer → 400", async () => {
    const res = await PATCH(makeRequest({ status: "no_answer" }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(400);
  });

  it("تعداد تکفل خارج از بازه → 400", async () => {
    const res = await PATCH(makeRequest({ dependents: 99 }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(400);
  });

  it("مبلغ منفی → 400", async () => {
    const res = await PATCH(makeRequest({ monthlyIncome: -5 }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(400);
  });

  it("بدون بدنه JSON → 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/leads/lead-1", {
      method: "PATCH",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/leads/[id] — منطق وضعیت", () => {
  beforeEach(() => {
    mockedGetToken.mockResolvedValue("tok");
    mockedVerify.mockResolvedValue(true);
  });

  it("تبدیل به بیمه‌نامه → policyAt و policyNumber ثبت می‌شود", async () => {
    mockedPrisma.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "a",
      phone: "0912",
      monthlyIncome: null,
      dependents: null,
      debt: null,
      estimatedCover: null,
      message: null,
      referrerId: "r-existing",
      createdAt: new Date(),
      status: "contacted",
      policyNumber: null,
      policyAt: null,
    });
    mockedPrisma.lead.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "lead-1", ...data }),
    );

    const res = await PATCH(
      makeRequest({ status: "converted", policyNumber: "۱۲۳۴۵۶" }),
      { params: Promise.resolve({ id: "lead-1" }) },
    );
    expect(res.status).toBe(200);
    const updateArg = mockedPrisma.lead.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateArg.data.status).toBe("converted");
    expect(updateArg.data.policyNumber).toBe("۱۲۳۴۵۶");
    expect(updateArg.data.policyAt).toBeInstanceOf(Date);
    // سرنخ از قبل معرف دارد → معرف جدیدی ساخته نمی‌شود
    expect(mockedPrisma.referrer.create).not.toHaveBeenCalled();
  });

  it("تبدیل سرنخ بدون معرف → خودکار معرف با نام مشتری ساخته می‌شود", async () => {
    mockedPrisma.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "قاسم رضایی",
      phone: "0912",
      monthlyIncome: null,
      dependents: null,
      debt: null,
      estimatedCover: null,
      message: null,
      referrerId: null,
      createdAt: new Date(),
      status: "follow_up",
      policyNumber: null,
      policyAt: null,
    });
    mockedPrisma.lead.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "lead-1", ...data }),
    );
    mockedPrisma.referrer.findUnique.mockResolvedValue(null);
    mockedPrisma.referrer.create.mockResolvedValue({
      id: "r-new",
      code: "ABC234",
      displayName: "قاسم رضایی",
      createdAt: new Date(),
    } as never);

    const res = await PATCH(makeRequest({ status: "converted" }), {
      params: Promise.resolve({ id: "lead-1" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { createdReferrer: { code: string } | null };
    expect(data.createdReferrer).toEqual({ code: "ABC234", displayName: "قاسم رضایی" });
    const updateArg = mockedPrisma.lead.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateArg.data.referrerId).toBe("r-new");
  });

  it("برگشت از وضعیت تبدیل → فیلدهای بیمه‌نامه پاک می‌شوند", async () => {
    mockedPrisma.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "a",
      phone: "0912",
      monthlyIncome: null,
      dependents: null,
      debt: null,
      estimatedCover: null,
      message: null,
      referrerId: null,
      createdAt: new Date(),
      status: "converted",
      policyNumber: "123",
      policyAt: new Date(),
    });
    mockedPrisma.lead.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "lead-1", ...data }),
    );

    const res = await PATCH(makeRequest({ status: "new" }), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(200);
    const updateArg = mockedPrisma.lead.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateArg.data.policyNumber).toBeNull();
    expect(updateArg.data.policyAt).toBeNull();
  });

  it("سرنخ ناموجود → 404", async () => {
    mockedPrisma.lead.findUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ name: "x" }), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/leads/[id]", () => {
  it("بدون نشست → 401", async () => {
    mockedGetToken.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(401);
    expect(mockedPrisma.lead.delete).not.toHaveBeenCalled();
  });

  it("با نشست معتبر → حذف انجام می‌شود", async () => {
    mockedGetToken.mockResolvedValue("tok");
    mockedVerify.mockResolvedValue(true);
    mockedPrisma.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "a",
      phone: "0912",
      monthlyIncome: null,
      dependents: null,
      debt: null,
      estimatedCover: null,
      message: null,
      referrerId: null,
      createdAt: new Date(),
      status: "new",
      policyNumber: null,
      policyAt: null,
    });
    mockedPrisma.lead.delete.mockResolvedValue({ id: "lead-1" } as never);

    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "lead-1" }) });
    expect(res.status).toBe(200);
    expect(mockedPrisma.lead.delete).toHaveBeenCalledWith({ where: { id: "lead-1" } });
  });

  it("سرنخ ناموجود → 404", async () => {
    mockedGetToken.mockResolvedValue("tok");
    mockedVerify.mockResolvedValue(true);
    mockedPrisma.lead.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest("nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
