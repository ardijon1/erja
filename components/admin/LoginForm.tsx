"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingField } from "@/components/admin/FloatingField";

const loginSchema = z.object({
  password: z.string().trim().min(1, "لطفاً رمز عبور را وارد کنید."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: LoginValues) {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        if (res.status === 401) {
          form.setError("root", { message: "رمز عبور نادرست است." });
          return;
        }
        if (res.status === 429) {
          const msg = typeof data.error === "string" ? data.error : "تعداد تلاش‌ها زیاد است";
          form.setError("root", { message: msg });
          return;
        }
        const msg = typeof data.error === "string" ? data.error : "خطا در ورود. لطفاً دوباره تلاش کنید.";
        form.setError("root", { message: msg });
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ورود.";
      form.setError("root", { message: msg });
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-base">پنل مدیریت</CardTitle>
        <CardDescription className="leading-6">برای ورود، رمز عبور را وارد کنید.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              label="رمز عبور"
              id="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              className="text-start"
              autoFocus
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {form.formState.errors.root ? (
            <p role="alert" className="text-sm text-destructive leading-6">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? "در حال ورود..." : "ورود"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default LoginForm;
