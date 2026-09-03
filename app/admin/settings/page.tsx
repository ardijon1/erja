import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthToken, verifySession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { MessagingSettingsForm } from "@/components/admin/MessagingSettingsForm";

export const metadata: Metadata = {
  title: "تنظیمات اتصال — پنل مدیریت",
  description: "تنظیمات پیام‌رسان‌ها: واتساپ و تلگرام",
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const token = await getAuthToken();
  const authed = token ? await verifySession(token) : false;
  if (!authed) redirect("/admin/login");
  return (
    <AdminShell>
      <MessagingSettingsForm />
    </AdminShell>
  );
}
