import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthToken, verifySession } from "@/lib/auth";
import { DashboardClient } from "@/components/admin/DashboardClient";

export const metadata: Metadata = {
  title: "داشبورد مدیریت",
  description: "پنل مدیریت — معرف‌ها و سرنخ‌ها",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const token = await getAuthToken();
  const authed = token ? await verifySession(token) : false;

  if (!authed) {
    redirect("/admin/login");
  }

  return <DashboardClient />;
}
