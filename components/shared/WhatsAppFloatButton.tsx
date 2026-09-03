"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { buildWhatsAppUrl } from "@/lib/whatsapp";

const HIDDEN_PREFIXES = ["/card", "/admin", "/r", "/ref", "/rate"];

export function WhatsAppFloat({
  whatsappNumber,
  whatsappMessage,
}: {
  whatsappNumber: string;
  whatsappMessage: string;
}) {
  const pathname = usePathname();

  const hidden = React.useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }, [pathname]);

  if (hidden) return null;

  const href = buildWhatsAppUrl(whatsappNumber, whatsappMessage);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="گفتگو در واتساپ"
      className="fixed bottom-4 end-4 z-50 flex size-14 items-center justify-center rounded-full border border-whatsapp/40 bg-whatsapp text-white shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <MessageCircle className="size-6" aria-hidden />
    </a>
  );
}

export { WhatsAppFloat as WhatsAppFloatButton };
