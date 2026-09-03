/**
 * WhatsApp wa.me URL helper.
 * Pure — takes digits/message as args, never imports from content/ or lib/env.
 * Handles Persian/Arabic-Indic digits (۰-۹ / ٠-٩) by normalizing to ASCII 0-9 first.
 * NOTE: Keep this file free of `import { env }` — it is used by client components
 * (WhatsAppFloatButton) and must not bundle server-only env validation.
 */

const WA_DIGIT_MAP: Record<string, string> = {
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

function toAsciiDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => WA_DIGIT_MAP[d] ?? d);
}

/** Strip non-digits from a phone string (e.g. "+98 912 345 6789" -> "989123456789"). Also normalizes Persian digits. */
export function normalizePhoneDigits(raw: string): string {
  return toAsciiDigits(raw).replace(/\D/g, "");
}

export function buildWhatsAppUrl(phoneDigits: string, message?: string): string {
  const digits = normalizePhoneDigits(phoneDigits);
  if (!digits) throw new Error("WhatsApp: phone number is required");

  const trimmed = message?.trim();
  if (!trimmed) return `https://wa.me/${digits}`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmed)}`;
}
