import { describe, expect, it } from "vitest";

import { buildReferrerReportText, daysSince, isInactiveReferrer } from "./referral-report";

describe("buildReferrerReportText (تست جدولی)", () => {
  it("معرف بدون بازدید → پیام تشویق بدون آمار صفر", () => {
    const text = buildReferrerReportText({ displayName: "احمدی", clicks: 0, leads: 0, converted: 0 });
    expect(text).toContain("سلام احمدی!");
    expect(text).toContain("هنوز بازدیدی نداشته");
    expect(text).not.toContain("۰ بازدید");
  });

  it("معرف با بازدید ولی بدون سرنخ → آمار + دعوت به ادامه", () => {
    const text = buildReferrerReportText({ displayName: "احمدی", clicks: 5, leads: 0, converted: 0 });
    expect(text).toContain("۵ بازدید و ۰ درخواست مشاوره");
    expect(text).not.toContain("بیمه‌نامه صادر");
  });

  it("معرف موفق → آمار کامل + تشکر", () => {
    const text = buildReferrerReportText({ displayName: "احمدی", clicks: 12, leads: 3, converted: 2 });
    expect(text).toContain("۱۲ بازدید و ۳ درخواست مشاوره");
    expect(text).toContain("۲ بیمه‌نامه صادر شده");
    expect(text).toContain("سپاس");
  });

  it("ارقام فارسی است و بدون وعده پاداش", () => {
    const text = buildReferrerReportText({ displayName: "x", clicks: 10, leads: 2, converted: 1 });
    expect(text).not.toMatch(/\d/);
    expect(text.toLowerCase()).not.toContain("پاداش");
    expect(text.toLowerCase()).not.toContain("کمیسیون");
  });
});

describe("isInactiveReferrer (تست جدولی)", () => {
  const now = new Date("2026-09-02T12:00:00Z");

  it.each([
    ["سرنخ ۱۰ روز پیش → فعال", "2026-08-20T00:00:00Z", "2026-01-01T00:00:00Z", false],
    ["سرنخ ۳۵ روز پیش → بی‌فعال", "2026-07-20T00:00:00Z", "2026-01-01T00:00:00Z", true],
    ["بدون سرنخ ولی تازه‌ساخت → فعال", null, "2026-08-25T00:00:00Z", false],
    ["بدون سرنخ و قدیمی‌تر از ۳۰ روز → بی‌فعال", null, "2026-07-01T00:00:00Z", true],
  ])("%s", (_t, lastLeadAt, createdAt, expected) => {
    expect(
      isInactiveReferrer(createdAt as string, lastLeadAt as string | null, now, 30),
    ).toBe(expected);
  });
});

describe("daysSince", () => {
  it("فاصله روز کامل محاسبه می‌شود", () => {
    expect(daysSince("2026-08-03T12:00:00Z", new Date("2026-09-02T12:00:00Z"))).toBe(30);
  });
});
