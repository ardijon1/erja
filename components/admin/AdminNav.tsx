"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  tab: "overview" | "content" | "settings" | "faq";
};

const ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "مرور", tab: "overview" },
  { href: "/admin/dashboard?tab=content", label: "محتوای صفحه اصلی", tab: "content" },
  { href: "/admin/faq", label: "پرسش‌های پرتکرار", tab: "faq" },
  { href: "/admin/settings", label: "تنظیمات اتصال", tab: "settings" },
];

function isActive(pathname: string | null, searchParams: URLSearchParams | null, item: NavItem) {
  if (!pathname) return false;
  if (item.tab === "settings") {
    return pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");
  }
  if (item.tab === "faq") {
    return pathname === "/admin/faq" || pathname.startsWith("/admin/faq/");
  }
  if (item.tab === "content") {
    return pathname === "/admin/dashboard" && searchParams?.get("tab") === "content";
  }
  return pathname === "/admin/dashboard" && (!searchParams?.get("tab") || searchParams?.get("tab") === "overview");
}

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <nav className="flex gap-1 border-b pb-2" aria-label="ناوبری پنل مدیریت" role="tablist">
      {ITEMS.map((item) => {
        const active = isActive(pathname, searchParams, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default AdminNav;
