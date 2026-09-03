import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

vi.mock("./db", () => ({
  prisma: {
    referrer: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("./env", () => ({
  env: {
    NODE_ENV: "test",
    SESSION_SECRET: "test-secret-test-secret-test-secret-123",
    DATABASE_URL: "file:./test.db",
    ADMIN_PASSWORD_HASH: "x",
    WHATSAPP_NUMBER: "989123456789",
    SITE_DOMAIN: "localhost:3000",
  },
}));

import { prisma } from "./db";
import {
  REFERRAL_COOKIE_NAME,
  getReferralCode,
  setReferralCookie,
  setReferralCookieFirstTouch,
  signReferralCode,
  verifySignedReferralValue,
} from "./referral";

const mockedFindUnique = vi.mocked(prisma.referrer.findUnique);

const asReferrer = (id: string) => ({ id, code: id, displayName: id, createdAt: new Date() });

function makeRequest(cookieHeader?: string): NextRequest {
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest("http://localhost:3000/r/TESTCODE", { headers });
}

const SECRET = "test-secret-test-secret-test-secret-123";
const signed = (code: string) => {
  const hmac = crypto.createHmac("sha256", SECRET).update(code).digest("hex");
  return `${code}.${hmac}`;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("امضای کوکی ارجاع (تست جدولی)", () => {
  it.each([
    ["ARD12"],
    ["a"],
    ["X9Y8Z7"],
  ])("امضا و تایید معتبر: %s", (code) => {
    const value = signReferralCode(code);
    expect(verifySignedReferralValue(value)).toBe(code);
  });

  it.each([
    ["دستکاری کد", "FAKE.aaaa", null],
    ["امضای غلط", "ARD12.deadbeef", null],
    ["بدون نقطه", "ARD12", null],
    ["کد خالی", ".abc", null],
  ])("%s رد می‌شود", (_t, value, expected) => {
    expect(verifySignedReferralValue(value)).toBe(expected);
  });
});

describe("getReferralCode", () => {
  it("کوکی امضاشده معتبر → کد برمی‌گردد", () => {
    const req = makeRequest(`${REFERRAL_COOKIE_NAME}=${encodeURIComponent(signed("ARD12"))}`);
    expect(getReferralCode(req)).toBe("ARD12");
  });

  it("کوکی بدون امضا → null", () => {
    const req = makeRequest(`${REFERRAL_COOKIE_NAME}=ARD12`);
    expect(getReferralCode(req)).toBeNull();
  });

  it("بدون کوکی → null", () => {
    expect(getReferralCode(makeRequest())).toBeNull();
  });
});

describe("setReferralCookieFirstTouch (مدل انتساب — تست جدولی)", () => {
  it("بدون کوکی قبلی → کوکی جدید ست می‌شود", async () => {
    mockedFindUnique.mockResolvedValue(asReferrer("r1"));
    const req = makeRequest();
    const res = new NextResponse(null);

    const result = await setReferralCookieFirstTouch("ARD12", req, res);

    expect(result).toEqual({ set: true, preserved: false });
    const cookie = res.cookies.get(REFERRAL_COOKIE_NAME);
    expect(cookie?.value).toBe(signed("ARD12"));
  });

  it("کوکی معتبر کد A + عبور از لینک کد B → کوکی A حفظ می‌شود (first-touch)", async () => {
    mockedFindUnique.mockResolvedValue(asReferrer("r1"));
    const req = makeRequest(`${REFERRAL_COOKIE_NAME}=${encodeURIComponent(signed("A01"))}`);
    const res = new NextResponse(null);

    const result = await setReferralCookieFirstTouch("B02", req, res);

    expect(result).toEqual({ set: false, preserved: true });
    expect(res.cookies.get(REFERRAL_COOKIE_NAME)).toBeUndefined();
  });

  it("کوکی معتبر همان کد → بدون تغییر (idempotent)", async () => {
    mockedFindUnique.mockResolvedValue(asReferrer("r1"));
    const req = makeRequest(`${REFERRAL_COOKIE_NAME}=${encodeURIComponent(signed("A01"))}`);
    const res = new NextResponse(null);

    const result = await setReferralCookieFirstTouch("A01", req, res);

    expect(result).toEqual({ set: false, preserved: true });
    expect(res.cookies.get(REFERRAL_COOKIE_NAME)).toBeUndefined();
  });

  it("کوکی دستکاری‌شده → کوکی جدید ست می‌شود (امنیت حفظ می‌شود)", async () => {
    mockedFindUnique.mockResolvedValue(asReferrer("r1"));
    const req = makeRequest(`${REFERRAL_COOKIE_NAME}=FAKE.garbage`);
    const res = new NextResponse(null);

    const result = await setReferralCookieFirstTouch("B02", req, res);

    expect(result.set).toBe(true);
    expect(res.cookies.get(REFERRAL_COOKIE_NAME)?.value).toBe(signed("B02"));
  });

  it("کوکی معتبر ولی معرفش حذف شده → کوکی جدید ست می‌شود", async () => {
    mockedFindUnique.mockReset();
    mockedFindUnique
      .mockResolvedValueOnce(null) // معرفِ کوکی قبلی (DEAD) حذف شده
      .mockResolvedValueOnce(asReferrer("r2")); // کد جدید (B02) معتبر است

    const req = makeRequest(`${REFERRAL_COOKIE_NAME}=${encodeURIComponent(signed("DEAD") )}`);
    const res = new NextResponse(null);

    const result = await setReferralCookieFirstTouch("B02", req, res);

    expect(result.set).toBe(true);
    expect(res.cookies.get(REFERRAL_COOKIE_NAME)?.value).toBe(signed("B02"));
  });

  it("کد ناموجود در DB → هیچ کوکیی ست نمی‌شود", async () => {
    mockedFindUnique.mockResolvedValue(null);
    const req = makeRequest();
    const res = new NextResponse(null);

    const result = await setReferralCookieFirstTouch("NOPE", req, res);

    expect(result).toEqual({ set: false, preserved: false });
    expect(res.cookies.get(REFERRAL_COOKIE_NAME)).toBeUndefined();
  });
});

describe("setReferralCookie (تابع پایه)", () => {
  it("کوکی httpOnly با ۳۰ روز اعتبار ست می‌کند", async () => {
    mockedFindUnique.mockResolvedValue(asReferrer("r1"));
    const res = new NextResponse(null);

    const ok = await setReferralCookie("ARD12", res);

    expect(ok).toBe(true);
    const cookie = res.cookies.get(REFERRAL_COOKIE_NAME);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.maxAge).toBe(30 * 24 * 60 * 60);
  });
});
