"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { toPersianDigits } from "@/lib/format";

const HIDDEN_PREFIXES = ["/card", "/admin"];

export type SiteFooterProps = {
  phone: string;
  website: string;
  address: string | null;
  agencyCode: string | null;
  name: string;
  title: string;
};

export function SiteFooter({
  phone,
  website,
  address,
  agencyCode,
  name,
  title,
}: SiteFooterProps) {
  const pathname = usePathname();
  const hidden = React.useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }, [pathname]);

  if (hidden) return null;

  const year = new Date().getFullYear();
  const persianYear = toPersianDigits(year);

  return (
    <footer className="mt-8 border-t bg-muted/50">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <a href={`tel:${phone}`} className="hover:text-foreground transition-colors" dir="ltr">
            {toPersianDigits(phone)}
          </a>
          {address ? <span className="leading-6">{address}</span> : null}
          <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" dir="ltr">
            {website}
          </a>
        </div>

        {agencyCode && agencyCode.trim() ? (
          <p className="text-center text-xs text-muted-foreground leading-6">
            کد نمایندگی: <span dir="ltr" className="font-mono">{agencyCode}</span>
          </p>
        ) : null}

        <p className="text-center text-xs text-muted-foreground leading-6">
          © {persianYear} {name} — {title} — تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
