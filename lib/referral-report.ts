/**
 * فاز ۴ — گزارش داده‌محور معرف و یادآور بی‌فعالیت.
 * منطق خالص برای تست جدولی؛ UI فقط متن‌ها را رندر می‌کند.
 */

export interface ReferrerReportInput {
  displayName: string;
  clicks: number;
  leads: number;
  converted: number;
}

/** متن گزارش معرف — صادقانه، بدون وعده پاداش، با پوزیشن‌گیری مثبت */
export function buildReferrerReportText(input: ReferrerReportInput): string {
  const { displayName, clicks, leads, converted } = input;
  const parts: string[] = [];

  parts.push(`سلام ${displayName}!`);
  if (clicks === 0) {
    parts.push("لینک معرفی شما هنوز بازدیدی نداشته — اگر فرصت کردید با دوستانی که به بیمه عمر فکر می‌کنند به اشتراک بگذارید.");
  } else {
    parts.push(`لینک شما تا به‌حال ${faNum(clicks)} بازدید و ${faNum(leads)} درخواست مشاوره داشته است.`);
    if (converted > 0) {
      parts.push(`از این بین ${faNum(converted)} بیمه‌نامه صادر شده — سپاس از اعتماد و معرفی‌تان!`);
    }
  }
  parts.push("اگر کسی از نزدیکانتان به بیمه عمر فکر می‌کند، همین لینک را برایش بفرستید.");

  return parts.join(" ");
}

/** آیا معرف «بی‌فعالیت» است؟ (سرنخی در N روز اخیر نداشته، یا اصلاً سرنخ ندارد) */
export function isInactiveReferrer(
  createdAt: Date | string,
  lastLeadAt: Date | string | null,
  now: Date = new Date(),
  inactiveDays: number = 30,
): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const cutoff = now.getTime() - inactiveDays * 24 * 60 * 60 * 1000;
  if (lastLeadAt === null || lastLeadAt === undefined) {
    return created.getTime() < cutoff;
  }
  const last = typeof lastLeadAt === "string" ? new Date(lastLeadAt) : lastLeadAt;
  return last.getTime() < cutoff;
}

/** چقدر از آخرین سرنخ گذشته؟ — برای متن یادآور */
export function daysSince(date: Date | string, now: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}
