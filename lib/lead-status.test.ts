import { describe, expect, it } from "vitest";

import {
  ACTIVE_STATUSES,
  FINAL_STATUSES,
  LEAD_STATUSES,
  LEAD_STATUS_META,
  isStale,
  isValidStatus,
  normalizeStatus,
} from "./lead-status";

describe("چرخه وضعیت سرنخ", () => {
  it("هر وضعیت دارای برچسب و توضیح است", () => {
    for (const s of LEAD_STATUSES) {
      expect(LEAD_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(LEAD_STATUS_META[s].description.length).toBeGreaterThan(0);
    }
  });

  it("وضعیت‌های قدیمی و حذف‌شده به چرخه جدید نگاشت می‌شوند", () => {
    expect(normalizeStatus("contacted")).toBe("follow_up");
    expect(normalizeStatus("closed")).toBe("lost");
    expect(normalizeStatus("no_answer")).toBe("follow_up");
    expect(normalizeStatus("awaiting_docs")).toBe("follow_up");
  });

  it("وضعیت‌های معتبر دست‌نخورده می‌مانند", () => {
    expect(normalizeStatus("converted")).toBe("converted");
    expect(normalizeStatus("follow_up")).toBe("follow_up");
  });

  it("وضعیت ناشناخته به «جدید» برمی‌گردد", () => {
    expect(normalizeStatus("hacked")).toBe("new");
  });

  it("isValidStatus فقط وضعیت‌های چرخه جدید را قبول می‌کند", () => {
    expect(isValidStatus("follow_up")).toBe(true);
    expect(isValidStatus("contacted")).toBe(false);
  });

  it("زنده/پایانی گسسته و کامل‌اند", () => {
    const all = [...ACTIVE_STATUSES, ...FINAL_STATUSES].sort();
    expect(all).toEqual([...LEAD_STATUSES].sort());
  });
});

describe("isStale (هشدار کهنگی سرنخ جدید)", () => {
  const now = new Date("2026-09-02T12:00:00Z");

  it.each([
    ["جدید زیر ۴۸ ساعت — تازه", "new", "2026-09-01T12:00:00Z", false],
    ["جدید بالای ۴۸ ساعت — کهنه", "new", "2026-08-30T11:00:00Z", true],
    ["در حال پیگیری — هرگز کهنه نمی‌شود", "follow_up", "2026-07-01T00:00:00Z", false],
    ["بیمه‌نامه صادر شد — هرگز کهنه نمی‌شود", "converted", "2026-06-01T00:00:00Z", false],
    ["منصرف — هرگز کهنه نمی‌شود", "lost", "2026-06-01T00:00:00Z", false],
  ])("%s", (_title, status, createdAt, expected) => {
    expect(isStale(createdAt, status as never, now)).toBe(expected);
  });
});
