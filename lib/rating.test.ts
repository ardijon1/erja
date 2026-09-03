import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  prisma: {
    ratingRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from "./db";
import {
  RATING_MIN_COUNT_FOR_PUBLIC,
  computeRatingSummary,
  lookupRatingToken,
  submitRating,
} from "./rating";

const mockedPrisma = prisma as unknown as {
  ratingRequest: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
};

const VALID_TOKEN = "a".repeat(48);

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    rating: null,
    submittedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
    referrer: { displayName: "احمدی" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lookupRatingToken (تست جدولی)", () => {
  it.each([
    ["توکن با فرمت غلط", "short", "not_found"],
    ["توکن با کاراکتر غیرهگز", "z".repeat(48), "not_found"],
    ["توکن ناموجود", VALID_TOKEN, "not_found"],
  ])("%s → نامعتبر", (_t, token, reason) => {
    mockedPrisma.ratingRequest.findUnique.mockResolvedValue(null);
    expect(lookupRatingToken(token)).resolves.toEqual({ valid: false, reason });
  });

  it("توکن معتبر → نام معرف برمی‌گردد", async () => {
    mockedPrisma.ratingRequest.findUnique.mockResolvedValue(makeRequest());
    const result = await lookupRatingToken(VALID_TOKEN);
    expect(result).toEqual({ valid: true, referrerName: "احمدی" });
  });

  it("توکن ثبت‌شده → already_submitted (تک‌مصرف)", async () => {
    mockedPrisma.ratingRequest.findUnique.mockResolvedValue(
      makeRequest({ submittedAt: new Date(), rating: 5 }),
    );
    const result = await lookupRatingToken(VALID_TOKEN);
    expect(result).toEqual({ valid: false, reason: "already_submitted" });
  });

  it("توکن منقضی → expired", async () => {
    mockedPrisma.ratingRequest.findUnique.mockResolvedValue(
      makeRequest({ expiresAt: new Date(Date.now() - 86400000) }),
    );
    const result = await lookupRatingToken(VALID_TOKEN);
    expect(result).toEqual({ valid: false, reason: "expired" });
  });
});

describe("submitRating", () => {
  it("ثبت موفق → rating و submittedAt ذخیره و نظر trim می‌شود", async () => {
    mockedPrisma.ratingRequest.findUnique.mockResolvedValue(makeRequest());
    mockedPrisma.ratingRequest.update.mockResolvedValue({} as never);

    const result = await submitRating(VALID_TOKEN, 4, "  خیلی خوب بود  ");

    expect(result.ok).toBe(true);
    expect(mockedPrisma.ratingRequest.update).toHaveBeenCalledWith({
      where: { token: VALID_TOKEN },
      data: { rating: 4, comment: "خیلی خوب بود", submittedAt: expect.any(Date) },
    });
  });

  it("نظر خالی → null ذخیره می‌شود", async () => {
    mockedPrisma.ratingRequest.findUnique.mockResolvedValue(makeRequest());
    mockedPrisma.ratingRequest.update.mockResolvedValue({} as never);

    await submitRating(VALID_TOKEN, 5, "   ");

    expect(mockedPrisma.ratingRequest.update).toHaveBeenCalledWith({
      where: { token: VALID_TOKEN },
      data: { rating: 5, comment: null, submittedAt: expect.any(Date) },
    });
  });

  it("توکن منقضی → رد می‌شود و update صدا نمی‌خورد", async () => {
    mockedPrisma.ratingRequest.findUnique.mockResolvedValue(
      makeRequest({ expiresAt: new Date(Date.now() - 86400000) }),
    );
    const result = await submitRating(VALID_TOKEN, 5);
    expect(result).toEqual({ ok: false, reason: "expired" });
    expect(mockedPrisma.ratingRequest.update).not.toHaveBeenCalled();
  });
});

describe("computeRatingSummary (منطق نمره واقعی + fallback)", () => {
  it.each([
    ["۰ امتیاز → مقدار دستی", 0, null, 4.9, false, 4.9],
    ["۱ امتیاز (زیر آستانه) → مقدار دستی", 1, 5.0, 4.9, false, 4.9],
    [`۲ امتیاز (زیر آستانه ${RATING_MIN_COUNT_FOR_PUBLIC}) → مقدار دستی`, 2, 3.0, 4.9, false, 4.9],
    ["۳ امتیاز → میانگین واقعی", 3, 4.6666, 4.9, true, 4.7],
    ["۱۰ امتیاز → میانگین واقعی", 10, 3.8499, 4.9, true, 3.8],
  ])("%s", (_t, count, avg, manual, isReal, display) => {
    mockedPrisma.ratingRequest.aggregate.mockResolvedValue({
      _count: { rating: count },
      _avg: { rating: avg },
    });
    expect(computeRatingSummary(manual)).resolves.toEqual({
      count,
      average: avg === null ? null : Math.round(avg * 10) / 10,
      displayScore: display,
      isReal,
    });
  });
});
