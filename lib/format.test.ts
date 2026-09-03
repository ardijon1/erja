import { describe, expect, it } from "vitest";

import {
  formatCurrencyIRT,
  formatFriendlyToman,
  formatNumber,
  formatNumberFa,
  normalizeNumericInput,
  toEnglishDigits,
  toPersianDigits,
} from "./format";

describe("toPersianDigits", () => {
  it("تبدیل ارقام انگلیسی به فارسی", () => {
    expect(toPersianDigits(123456)).toBe("۱۲۳۴۵۶");
    expect(toPersianDigits("0912 345")).toBe("۰۹۱۲ ۳۴۵");
  });

  it("رشته بدون رقم دست‌نخورده می‌ماند", () => {
    expect(toPersianDigits("abc")).toBe("abc");
  });
});

describe("toEnglishDigits", () => {
  it("تبدیل ارقام فارسی و عربی به انگلیسی", () => {
    expect(toEnglishDigits("۱۲۳")).toBe("123");
    expect(toEnglishDigits("١٢٣")).toBe("123");
  });
});

describe("formatNumberFa", () => {
  it("جداکننده هزارگان با «٬» و ارقام فارسی", () => {
    expect(formatNumberFa(1234567)).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatNumberFa(1000)).toBe("۱٬۰۰۰");
    expect(formatNumberFa(999)).toBe("۹۹۹");
  });

  it("عدد منفی و صفر", () => {
    expect(formatNumberFa(0)).toBe("۰");
    expect(formatNumberFa(-2500)).toBe("-۲٬۵۰۰");
  });

  it("ورودی رشته‌ای با ارقام فارسی و جداکننده‌های رایج نرمال‌سازی می‌شود", () => {
    expect(formatNumberFa("۱۲۳۴۵۶۷")).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatNumberFa("1,234,567")).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatNumberFa("۱٬۲۳۴٬۵۶۷")).toBe("۱٬۲۳۴٬۵۶۷");
  });

  it("ورودی نامعتبر به فارسی برمی‌گردد بدون خرابی", () => {
    expect(formatNumberFa("abc")).toBe("abc");
  });

  it("گزینه‌های Intl پاس داده می‌شود", () => {
    expect(formatNumberFa(1234.5, { maximumFractionDigits: 1 })).toBe("۱٬۲۳۴٫۵");
  });
});

describe("formatCurrencyIRT", () => {
  it("مبلغ با جداکننده هزارگان و پسوند تومان", () => {
    expect(formatCurrencyIRT(500000000)).toBe("۵۰۰٬۰۰۰٬۰۰۰ تومان");
  });
});

describe("formatFriendlyToman (گرد کردن دوستانه — جدولی)", () => {
  it.each([
    [846_500_000, "حدود ۸۵۰ میلیون تومان"],
    [854_000_000, "حدود ۸۵۰ میلیون تومان"],
    [1_240_000_000, "حدود ۱٫۲ میلیارد تومان"],
    [120_000_000, "حدود ۱۲۰ میلیون تومان"],
    [125_000_000, "حدود ۱۳۰ میلیون تومان"],
    [45_000_000, "حدود ۴۵ میلیون تومان"],
    [12_400_000, "حدود ۱۲ میلیون تومان"],
    [9_000_000, "حدود ۹ میلیون تومان"],
    [1_200_000, "حدود ۱ میلیون تومان"],
  ])("formatFriendlyToman(%s) → %s", (input, expected) => {
    expect(formatFriendlyToman(input)).toBe(expected);
  });

  it("ورودی نامعتبر یا صفر به فرمت دقیق برمی‌گردد", () => {
    expect(formatFriendlyToman(0)).toBe("۰ تومان");
  });
});

describe("normalizeNumericInput (فرمت زنده حین تایپ)", () => {
  it("رقم تازه تایپ‌شده به ارقام فارسی با جداکننده تبدیل می‌شود", () => {
    expect(normalizeNumericInput("5")).toBe("۵");
    expect(normalizeNumericInput("5000000")).toBe("۵٬۰۰۰٬۰۰۰");
  });

  it("ورودی از قبل گروه‌بندی‌شده دوباره گروه‌بندی می‌شود", () => {
    expect(normalizeNumericInput("۵٬۰۰۰٬۰۰۰۵")).toBe("۵۰٬۰۰۰٬۰۰۵");
    expect(normalizeNumericInput("1,234")).toBe("۱٬۲۳۴");
  });

  it("ارقام فارسی ورودی پذیرفته می‌شود", () => {
    expect(normalizeNumericInput("۱۲۳۴")).toBe("۱٬۲۳۴");
  });

  it("کاراکترهای غیرعددی حذف می‌شوند", () => {
    expect(normalizeNumericInput("12abc34")).toBe("۱٬۲۳۴");
    expect(normalizeNumericInput("abc")).toBe("");
    expect(normalizeNumericInput("")).toBe("");
  });
});

describe("formatNumber (سازگاری با فراخوانی‌های قدیمی)", () => {
  it("همان خروجی formatNumberFa را می‌دهد", () => {
    expect(formatNumber(9876543)).toBe("۹٬۸۷۶٬۵۴۳");
    expect(formatNumber("۱۲۳")).toBe("۱۲۳");
  });
});
