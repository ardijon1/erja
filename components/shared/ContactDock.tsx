"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageSquareShare, X } from "lucide-react";

import { buildWhatsAppUrl, buildTelegramUrlForDock } from "@/lib/dock-urls";
import { buildEitaaUrl, buildRubikaUrl } from "@/lib/site-content";
import { WhatsAppIcon, TelegramIcon, EitaaIcon, RubikaIcon } from "@/components/shared/CustomIcons";

const HIDDEN_PREFIXES = ["/card", "/admin", "/r", "/ref", "/rate"];

/**
 * داک اجتماعی شناور — واتساپ، تلگرام، ایتا، روبیکا.
 * تعامل: هاور (دسکتاپ) / کلیک (موبایل) برای باز شدن.
 * دکمه‌ها به‌صورت عمودی و با آیکون‌های رسمی برند چیده شده‌اند.
 */
export function ContactDock({
  whatsappNumber,
  whatsappMessage,
  telegramUsername,
  telegramMessage,
  eitaaUsername,
  eitaaMessage,
  rubikaUsername,
  rubikaMessage,
}: {
  whatsappNumber: string;
  whatsappMessage: string;
  telegramUsername: string | null;
  telegramMessage: string | null;
  eitaaUsername: string | null;
  eitaaMessage: string | null;
  rubikaUsername: string | null;
  rubikaMessage: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(pointer: coarse)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const hidden = React.useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }, [pathname]);

  const openDock = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const closeDock = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const cancelClose = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (hidden) return null;

  const waUrl = buildWhatsAppUrl(whatsappNumber, whatsappMessage);
  const tgUrl = telegramUsername?.trim()
    ? buildTelegramUrlForDock(telegramUsername, telegramMessage)
    : null;

  let eitaaUrl: string | null = null;
  try {
    if (eitaaUsername?.trim()) eitaaUrl = buildEitaaUrl(eitaaUsername, eitaaMessage);
  } catch { eitaaUrl = null; }

  let rubikaUrl: string | null = null;
  try {
    if (rubikaUsername?.trim()) rubikaUrl = buildRubikaUrl(rubikaUsername, rubikaMessage);
  } catch { rubikaUrl = null; }

  const items: Array<{ href: string; label: string; icon: React.ReactNode; bg: string }> = [
    { href: waUrl, label: "واتساپ", icon: <WhatsAppIcon className="size-5" aria-hidden />, bg: "bg-whatsapp" },
    ...(tgUrl
      ? [{ href: tgUrl, label: "تلگرام", icon: <TelegramIcon className="size-5" aria-hidden />, bg: "bg-telegram" }]
      : []),
    ...(eitaaUrl
      ? [{ href: eitaaUrl, label: "ایتا", icon: <EitaaIcon className="size-5" aria-hidden />, bg: "bg-[#E8434A]" }]
      : []),
    ...(rubikaUrl
      ? [{ href: rubikaUrl, label: "روبیکا", icon: <RubikaIcon className="size-5" aria-hidden />, bg: "bg-[#4A4A4A]" }]
      : []),
  ];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 end-4 z-50 flex flex-col items-end gap-2"
      role="group"
      aria-label="راه‌های ارتباطی"
      onMouseEnter={!isMobile ? openDock : undefined}
      onMouseLeave={!isMobile ? closeDock : undefined}
    >
      {items.map((item, i) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          className={`flex size-9 items-center justify-center rounded-full border border-white/20 text-white shadow-md transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            item.bg
          } ${open ? "translate-y-0 opacity-100 scale-100" : "translate-y-2 opacity-0 scale-75 pointer-events-none"}`}
          style={{ transitionDelay: open ? `${i * 50}ms` : "0ms" }}
        >
          {item.icon}
        </a>
      ))}

      <button
        type="button"
        onClick={isMobile ? () => setOpen((v) => !v) : undefined}
        aria-expanded={open}
        aria-label={open ? "بستن راه‌های ارتباطی" : "باز کردن راه‌های ارتباطی"}
        className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open ? <X className="size-5" aria-hidden /> : <MessageSquareShare className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

export default ContactDock;
