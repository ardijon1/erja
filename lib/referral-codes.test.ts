import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  prisma: {
    referrer: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("./env", () => ({
  env: {
    NODE_ENV: "production",
    SESSION_SECRET: "test-secret-test-secret-test-secret-123",
    DATABASE_URL: "file:./test.db",
    ADMIN_PASSWORD_HASH: "x",
    WHATSAPP_NUMBER: "989123456789",
    SITE_DOMAIN: "example.ir",
  },
}));

import { prisma } from "./db";
import {
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  buildReferralBaseUrl,
  generateReferralCode,
  generateUniqueReferralCode,
} from "./referral-codes";

const mockedFindUnique = vi.mocked(prisma.referrer.findUnique);

const asReferrer = (id: string) => ({ id, code: id, displayName: id, createdAt: new Date() });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateReferralCode (تست جدولی)", () => {
  it("طول پیش‌فرض ۶ کاراکتر است", () => {
    expect(generateReferralCode()).toHaveLength(REFERRAL_CODE_LENGTH);
  });

  it.each([4, 6, 8, 12])("طول سفارشی %s", (len) => {
    expect(generateReferralCode(len)).toHaveLength(len);
  });

  it("فقط از الفبای بدون کاراکترهای مبهم استفاده می‌کند", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCode();
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
      for (const ch of code) {
        expect(REFERRAL_CODE_ALPHABET).toContain(ch);
      }
    }
  });

  it("هرگز حروف/ارقام مبهم I, L, O, 0, 1 تولید نمی‌کند", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCode();
      expect(code).not.toMatch(/[ILO01]/);
    }
  });

  it("با تزریق random قطعی، خروجی قطعی است", () => {
    const fake = (n: number) => new Uint8Array(n).fill(0); // اندیس ۰ → 'A'
    expect(generateReferralCode(4, fake)).toBe("AAAA");
  });
});

describe("generateUniqueReferralCode", () => {
  it("در حالت عادی یک بار چک می‌کند و کد برمی‌گرداند", async () => {
    mockedFindUnique.mockResolvedValue(null);
    const code = await generateUniqueReferralCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });

  it("در تصادم، دوباره تلاش می‌کند", async () => {
    mockedFindUnique
      .mockResolvedValueOnce(asReferrer("x")) // تصادم
      .mockResolvedValueOnce(null);
    const code = await generateUniqueReferralCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(mockedFindUnique).toHaveBeenCalledTimes(2);
  });

  it("بعد از ۵ تصادم پشت‌سرهم → خطا", async () => {
    mockedFindUnique.mockResolvedValue(asReferrer("x"));
    await expect(generateUniqueReferralCode()).rejects.toThrow("unique referral code");
    expect(mockedFindUnique).toHaveBeenCalledTimes(5);
  });
});

describe("buildReferralBaseUrl", () => {
  it("در production با SITE_DOMAIN لینک https می‌سازد", () => {
    expect(buildReferralBaseUrl()).toBe("https://example.ir/r");
  });
});
