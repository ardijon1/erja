import type { Metadata } from "next";
import { FaqClient } from "@/components/faq/FaqClient";

export const metadata: Metadata = {
  title: "پرسش‌های پرتکرار",
  description: "پاسخ پرسش‌های متداول درباره بیمه عمر — نوشته و تأیید شده توسط نماینده.",
};

export default function FaqPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-bold">پرسش‌های پرتکرار</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          پاسخ پرسش‌های متداول درباره خدمات بیمه عمر
        </p>
      </div>
      <FaqClient />
    </div>
  );
}
