import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { FaqManager } from "@/components/admin/FaqManager";
import { getAuthToken, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مدیریت پرسش‌های پرتکرار",
};

export default async function AdminFaqPage() {
  const token = await getAuthToken();
  if (!token || !(await verifySession(token))) {
    redirect("/admin/login");
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold">پرسش‌های پرتکرار</h1>
          <p className="text-sm text-muted-foreground mt-1">
            سوالات و جواب‌هایی که در صفحه اصلی نمایش داده می‌شوند را اینجا مدیریت کنید.
          </p>
        </div>
        <FaqManager />
      </div>
    </AdminShell>
  );
}
