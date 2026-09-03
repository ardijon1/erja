const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;
const EN_PERSIAN_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * جداکننده هزارگان با «٬» (U+066C، thousands separator عربی/فارسی) و ارقام فارسی.
 * ورودیِ رشته‌ای اول به عدد انگلیسی نرمال‌سازی می‌شود تا ورودی کاربر (ارقام فارسی/
 * عربی + جداکننده‌های رایج) نیز درست پردازش شود.
 */
export function formatNumberFa(value: number | string, options?: Intl.NumberFormatOptions): string {
  const n = typeof value === "string" ? Number(toEnglishDigits(value).replace(/[,،٬\s]/g, "")) : value;
  if (!Number.isFinite(n)) return toPersianDigits(String(value));
  return n
    .toLocaleString("en-US", options)
    .replace(/,/g, "٬")
    .replace(".", "٫")
    .replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => EN_PERSIAN_MAP[d] ?? d);
}

/**
 * واحد پولی استاندارد کل برنامه: تومان (IRT) — ورودی کاربر، ثابت‌های
 * ماشین‌حساب، ذخیره‌سازی و نمایش همگی تومان هستند (بدون تبدیل میانی).
 */
export function formatCurrencyIRT(value: number): string {
  return `${formatNumberFa(value)} تومان`;
}

/**
 * گرد کردن دوستانه برای نمایش تکی مبلغ برآورد: «حدود ۸۵۰ میلیون تومان»
 * به‌جای «۸۴۶٬۵۰۰٬۰۰۰ تومان». دقت گرد کردن بسته به مرتبه‌ی بزرگی:
 * ≥۱ میلیارد → ۱۰۰ میلیون، ≥۱۰۰ میلیون → ۱۰ میلیون،
 * ≥۱۰ میلیون → ۱ میلیون، کمتر → ۵۰۰ هزار.
 * در فرم دقیق (breakdown) همیشه formatCurrencyIRT استفاده می‌شود.
 */
export function formatFriendlyToman(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return formatCurrencyIRT(value);
  let rounded: number;
  if (value >= 1e9) rounded = Math.round(value / 1e8) * 1e8;
  else if (value >= 1e8) rounded = Math.round(value / 1e7) * 1e7;
  else if (value >= 1e7) rounded = Math.round(value / 1e6) * 1e6;
  else rounded = Math.round(value / 5e5) * 5e5;
  if (rounded >= 1e9) {
    return `حدود ${formatNumberFa(rounded / 1e9, { maximumFractionDigits: 2 })} میلیارد تومان`;
  }
  return `حدود ${formatNumberFa(rounded / 1e6, { maximumFractionDigits: 1 })} میلیون تومان`;
}

/**
 * نرمال‌سازی مقدار یک فیلد عددی حین تایپ: حذف هر کاراکتر غیررقمی، تبدیل
 * ارقام فارسی/عربی به انگلیسی، و درج جداکننده هزارگان «٬» + ارقام فارسی
 * برای نمایش روان. خروجی برای value یک input با react-hook-form مناسب است.
 */
export function normalizeNumericInput(raw: string): string {
  const cleaned = toEnglishDigits(raw).replace(/[^\d]/g, "");
  if (!cleaned) return "";
  return formatNumberFa(Number(cleaned));
}

export function formatNumber(value: number | string): string {
  return formatNumberFa(value);
}

export function formatPhone(phone: string): string {
  return toPersianDigits(phone);
}
