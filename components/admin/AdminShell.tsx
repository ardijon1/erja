"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = React.useState(false);

  async function onLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="px-2">
            <Link href="/" aria-label="بازگشت به صفحه اصلی" title="بازگشت به صفحه اصلی">
              <ArrowRight className="size-4" aria-hidden />
              صفحه اصلی
            </Link>
          </Button>
          <h1 className="text-lg font-bold">پنل مدیریت</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} disabled={logoutLoading}>
          {logoutLoading ? "در حال خروج..." : "خروج"}
        </Button>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}

export default AdminShell;