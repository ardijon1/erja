import { buildWhatsAppUrl } from "./whatsapp";

/**
 * URL helpers داک ارتباطی — خالص و کلاینت‌پسند (بدون env/سرور).
 */
export { buildWhatsAppUrl };

export function buildTelegramUrlForDock(username: string, message?: string | null): string {
  const clean = username.trim().replace(/^@/, "");
  const base = `https://t.me/${clean}`;
  const trimmed = message?.trim();
  if (!trimmed) return base;
  return `${base}?text=${encodeURIComponent(trimmed)}`;
}
