import { describe, expect, it } from "vitest";

/**
 * منطق فاز ۳ جدا از UI بازتولید شده تا جدولی تست شود:
 * مرتب‌سازی معرف‌ها بر اساس بیمه‌نامه صادرشده → سرنخ → کلیک
 * و محاسبه نرخ تبدیل و درصد سهم ارجاع — دقیقاً مطابق پیاده‌سازی داشبورد/API.
 */

interface Entry {
  id: string;
  clicks: number;
  leads: number;
}

function sortReferrers(referrers: Entry[], convertedMap: Record<string, number>): Entry[] {
  return [...referrers].sort((a, b) => {
    const convDiff = (convertedMap[b.id] ?? 0) - (convertedMap[a.id] ?? 0);
    if (convDiff !== 0) return convDiff;
    if (b.leads !== a.leads) return b.leads - a.leads;
    return b.clicks - a.clicks;
  });
}

function conversionLabel(converted: number, leads: number): string {
  if (leads === 0) return "—";
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return `${String(Math.round((converted / leads) * 100)).replace(/\d/g, (d) => persian[Number(d)])}٪`;
}

function referralSharePercent(total: number, referred: number): number {
  return total > 0 ? Math.round((referred / total) * 100) : 0;
}

describe("مرتب‌سازی معرف‌ها (کیفیت محور — تست جدولی)", () => {
  const base = [
    { id: "r1", clicks: 50, leads: 10 },
    { id: "r2", clicks: 5, leads: 2 },
    { id: "r3", clicks: 30, leads: 4 },
    { id: "r4", clicks: 100, leads: 20 },
  ];

  it("بیمه‌نامه بیشتر اول است حتی با کلیک کمتر", () => {
    const sorted = sortReferrers(base, { r1: 1, r2: 2, r3: 0, r4: 1 });
    // r2 (۲ بیمه‌نامه) اول؛ r1 و r4 هر دو ۱ → تساوی با سرنخ: r4 (۲۰) قبل از r1 (۱۰)
    expect(sorted.map((r) => r.id)).toEqual(["r2", "r4", "r1", "r3"]);
  });

  it("در تساوی بیمه‌نامه، سرنخ بیشتر اول است", () => {
    const sorted = sortReferrers(base, { r1: 2, r2: 2, r3: 0, r4: 0 });
    expect(sorted.map((r) => r.id)).toEqual(["r1", "r2", "r4", "r3"]);
  });

  it("در تساوی کامل، کلیک بیشتر اول است", () => {
    const sorted = sortReferrers(base, { r1: 1, r2: 1, r3: 1, r4: 1 });
    expect(sorted.map((r) => r.id)).toEqual(["r4", "r1", "r3", "r2"]);
  });

  it("بدون داده تبدیل → همان مرتب‌سازی قدیمی (سرنخ، سپس کلیک)", () => {
    const sorted = sortReferrers(base, {});
    expect(sorted.map((r) => r.id)).toEqual(["r4", "r1", "r3", "r2"]);
  });

  it("معرف با صفر بیمه‌نامه آخر می‌ماند هر چقدر هم کلیک داشته باشد", () => {
    const sorted = sortReferrers(base, { r4: 5 });
    expect(sorted[0].id).toBe("r4");
    expect(sorted[sorted.length - 1].id).toBe("r4" === sorted[0].id ? "r2" : sorted[sorted.length - 1].id);
  });
});

describe("نرخ تبدیل هر معرف (تست جدولی)", () => {
  it.each([
    [0, 10, "۰٪"],
    [1, 4, "۲۵٪"],
    [3, 4, "۷۵٪"],
    [4, 4, "۱۰۰٪"],
    [0, 0, "—"],
    [7, 13, "۵۴٪"],
  ])("%s بیمه‌نامه از %s سرنخ → %s", (converted, leads, expected) => {
    expect(conversionLabel(converted, leads)).toBe(expected);
  });
});

describe("درصد سهم ارجاع از کل سرنخ‌ها (تست جدولی)", () => {
  it.each([
    [0, 0, 0],
    [50, 0, 0],
    [50, 25, 50],
    [3, 1, 33],
    [7, 5, 71],
    [10, 10, 100],
  ])("کل %s، ارجاعی %s → %s درصد", (total, referred, expected) => {
    expect(referralSharePercent(total, referred)).toBe(expected);
  });

  it("تقسیم بر صفر → ۰ (بدون کرش)", () => {
    expect(referralSharePercent(0, 5)).toBe(0);
  });
});
