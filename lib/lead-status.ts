/**
 * چرخه وضعیت سرنخ — منبع یگانه حقیقت برای API، UI و داشبورد.
 * گذار ساده: جدید → در حال پیگیری → بیمه‌نامه صادر شد | منصرف
 */

export const LEAD_STATUSES = [
  "new",
  "follow_up",
  "converted",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; description: string }
> = {
  new: { label: "جدید", description: "هنوز تماسی نگرفته" },
  follow_up: { label: "در حال پیگیری", description: "تماس‌ها در جریان است" },
  converted: { label: "بیمه‌نامه صادر شد", description: "فروش قطعی شد" },
  lost: { label: "منصرف", description: "بدون فروش بسته شد" },
};

/** وضعیت‌های زنده که نماینده باید فعالانه پیگیری کند */
export const ACTIVE_STATUSES: readonly LeadStatus[] = ["new", "follow_up"];

/** وضعیت‌های پایانی (بدون اقدام بعدی) */
export const FINAL_STATUSES: readonly LeadStatus[] = ["converted", "lost"];

/**
 * وضعیت‌های قدیمی/حذف‌شده — مهاجرت خودکار هنگام خواندن/آپدیت.
 * contacted/closed از نسخه اول؛ no_answer/awaiting_docs از نسخه ۶ وضعیتی.
 */
export const LEGACY_STATUS_MAP: Record<string, LeadStatus> = {
  contacted: "follow_up",
  closed: "lost",
  no_answer: "follow_up",
  awaiting_docs: "follow_up",
};

export function normalizeStatus(status: string): LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(status)
    ? (status as LeadStatus)
    : LEGACY_STATUS_MAP[status] ?? "new";
}

export function isValidStatus(status: string): status is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(status);
}

/** آیا سرنخ «جدید» برای پیگیری کهنه شده است؟ (>۴۸ ساعت) */
export function isStale(
  createdAt: Date | string,
  status: LeadStatus,
  now: Date = new Date(),
): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (status !== "new") return false;
  return now.getTime() - created.getTime() > 48 * 60 * 60 * 1000;
}
