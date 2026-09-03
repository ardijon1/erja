"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = ["/card", "/admin", "/r", "/ref"];

const NAV_ITEMS = [
  { href: "/", label: "خانه" },
  { href: "/card", label: "کارت دیجیتال" },
  { href: "/faq", label: "پرسش‌های پرتکرار" },
] as const;

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeader({ siteName }: { siteName?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const hidden = React.useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }, [pathname]);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (hidden) return null;

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b">
      <div className="mx-auto max-w-4xl flex items-center justify-between px-4 h-14 gap-2">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-sm sm:text-base shrink-0">
            {siteName ?? "خانه"}
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="ناوبری اصلی">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/dashboard" aria-label="ورود به پنل مدیریت" title="ورود به پنل مدیریت">
              <Lock className="size-5" aria-hidden />
            </Link>
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="md:hidden border-t bg-background"
          aria-label="ناوبری موبایل"
        >
          <div className="mx-auto max-w-4xl flex flex-col gap-1 px-2 py-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export default SiteHeader;
