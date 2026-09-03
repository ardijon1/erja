import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "ورود مدیریت",
  description: "ورود به پنل مدیریت",
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col items-center justify-center px-4 py-10">
      <LoginForm />
    </div>
  );
}
