"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FloatingField } from "@/components/admin/FloatingField";
import { Skeleton } from "@/components/ui/skeleton";
import { siteContentSchema } from "@/lib/site-content";
import type { Resolver } from "react-hook-form";

const contentSchema = siteContentSchema.pick({
  name: true,
  title: true,
  photo: true,
  bio: true,
  shortBio: true,
  yearsExperience: true,
  insuredCount: true,
  satisfactionScore: true,
  phone: true,
  website: true,
  address: true,
  agencyCode: true,
  calculatorTitle: true,
  calculatorDesc: true,
  faqPreviewTitle: true,
  referralTitle: true,
  referralDesc: true,
});

type ContentInput = z.infer<typeof contentSchema>;

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

export function SiteContentForm() {
  const [loadState, setLoadState] = React.useState<LoadState>({ status: "loading" });
  const [saveMessage, setSaveMessage] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [fullContent, setFullContent] = React.useState<Record<string, unknown> | null>(null);

  const form = useForm<ContentInput>({
    resolver: zodResolver(contentSchema) as unknown as Resolver<ContentInput>,
    defaultValues: {
      name: "",
      title: "",
      photo: "",
      bio: "",
      shortBio: "",
      yearsExperience: 0,
      insuredCount: 0,
      satisfactionScore: 0,
      phone: "",
      website: "",
      address: "",
      agencyCode: "",
      calculatorTitle: "",
      calculatorDesc: "",
      faqPreviewTitle: "",
      referralTitle: "",
      referralDesc: "",
    },
  });

  const load = React.useCallback(async () => {
    setLoadState({ status: "loading" });
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof data.error === "string" ? data.error : "خطا در بارگذاری محتوا");
      }
      const data = (await res.json()) as { content: Record<string, unknown> };
      const c = data.content as Record<string, string | number | null>;
      setFullContent(c as Record<string, unknown>);
      form.reset({
        name: String(c.name ?? ""),
        title: String(c.title ?? ""),
        photo: String(c.photo ?? ""),
        bio: String(c.bio ?? ""),
        shortBio: String(c.shortBio ?? ""),
        yearsExperience: Number(c.yearsExperience ?? 0),
        insuredCount: Number(c.insuredCount ?? 0),
        satisfactionScore: Number(c.satisfactionScore ?? 0),
        phone: String(c.phone ?? ""),
        website: String(c.website ?? ""),
        address: String(c.address ?? ""),
        agencyCode: String(c.agencyCode ?? ""),
        calculatorTitle: String(c.calculatorTitle ?? ""),
        calculatorDesc: String(c.calculatorDesc ?? ""),
        faqPreviewTitle: String(c.faqPreviewTitle ?? ""),
        referralTitle: String(c.referralTitle ?? ""),
        referralDesc: String(c.referralDesc ?? ""),
      });
      setLoadState({ status: "ready" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بارگذاری";
      setLoadState({ status: "error", message: msg });
    }
  }, [form]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: ContentInput) {
    setSaveMessage(null);
    if (!fullContent) {
      setSaveMessage({ kind: "error", text: "داده‌های اولیه بارگذاری نشده است." });
      return;
    }
    const payload = { ...fullContent, ...values };
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "خطا در ذخیره";
        throw new Error(msg);
      }
      setFullContent((prev) => (prev ? { ...prev, ...values } : prev));
      setSaveMessage({ kind: "success", text: "تغییرات با موفقیت ذخیره شد." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ذخیره";
      setSaveMessage({ kind: "error", text: msg });
      form.setError("root" as unknown as keyof ContentInput, { message: msg });
    }
  }

  if (loadState.status === "loading") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (loadState.status === "error") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive leading-7">{loadState.message}</p>
          <Button variant="outline" className="mt-4" onClick={load}>
            تلاش دوباره
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit as unknown as Parameters<typeof form.handleSubmit>[0])} className="flex flex-col gap-6" noValidate>
      <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-xs leading-6 text-muted-foreground">
        تنظیمات پیام‌رسان‌ها (واتساپ و تلگرام) به صفحهٔ <span className="font-medium text-foreground">تنظیمات اتصال</span> منتقل شده است.
      </p>

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">هویت و معرفی</CardTitle>
          <CardDescription className="leading-6">نام، عنوان، عکس و توضیحات بخش Hero</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="نام *"
                id="sc-name"
                {...form.register("name")}
                aria-invalid={!!form.formState.errors.name}
              />
              {form.formState.errors.name ? (
                <p role="alert" className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="عنوان *"
                id="sc-title"
                {...form.register("title")}
                aria-invalid={!!form.formState.errors.title}
              />
              {form.formState.errors.title ? (
                <p role="alert" className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="کد نمایندگی"
                id="sc-agency-code"
                dir="ltr"
                className="text-start"
                {...form.register("agencyCode")}
              />
              <p className="text-xs text-muted-foreground mt-1">در فوتر و کارت دیجیتال نمایش داده می‌شود</p>
            </div>
          </div>

          <PhotoUploader form={form} />

          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              label="بیوی کوتاه *"
              id="sc-shortBio"
              {...form.register("shortBio")}
              aria-invalid={!!form.formState.errors.shortBio}
            />
            {form.formState.errors.shortBio ? (
              <p role="alert" className="text-xs text-destructive">{form.formState.errors.shortBio.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              as="textarea"
              label="بیوگرافی کامل *"
              id="sc-bio"
              textareaRows={4}
              {...form.register("bio")}
              aria-invalid={!!form.formState.errors.bio}
            />
            {form.formState.errors.bio ? (
              <p role="alert" className="text-xs text-destructive">{form.formState.errors.bio.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="سال سابقه *"
                id="sc-years"
                inputMode="numeric"
                dir="ltr"
                className="text-start"
                {...form.register("yearsExperience")}
                aria-invalid={!!form.formState.errors.yearsExperience}
              />
              {form.formState.errors.yearsExperience ? (
                <p role="alert" className="text-xs text-destructive">{form.formState.errors.yearsExperience.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="تعداد بیمه‌شده *"
                id="sc-insured"
                inputMode="numeric"
                dir="ltr"
                className="text-start"
                {...form.register("insuredCount")}
                aria-invalid={!!form.formState.errors.insuredCount}
              />
              {form.formState.errors.insuredCount ? (
                <p role="alert" className="text-xs text-destructive">{form.formState.errors.insuredCount.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="امتیاز رضایت (۰ تا ۵) *"
                id="sc-score"
                inputMode="decimal"
                dir="ltr"
                className="text-start"
                {...form.register("satisfactionScore")}
                aria-invalid={!!form.formState.errors.satisfactionScore}
              />
              {form.formState.errors.satisfactionScore ? (
                <p role="alert" className="text-xs text-destructive">{form.formState.errors.satisfactionScore.message}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">اطلاعات تماس</CardTitle>
          <CardDescription className="leading-6">تلفن، وب‌سایت، کد نمایندگی و آدرس — در فوتر و کارت دیجیتال نمایش داده می‌شود</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="تلفن *"
                id="sc-phone"
                dir="ltr"
                className="text-start"
                {...form.register("phone")}
                aria-invalid={!!form.formState.errors.phone}
              />
              {form.formState.errors.phone ? (
                <p role="alert" className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              label="وب‌سایت *"
              id="sc-website"
              dir="ltr"
              className="text-start"
              {...form.register("website")}
              aria-invalid={!!form.formState.errors.website}
            />
            {form.formState.errors.website ? (
              <p role="alert" className="text-xs text-destructive">{form.formState.errors.website.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              label="آدرس"
              id="sc-address"
              {...form.register("address")}
              aria-invalid={!!form.formState.errors.address}
            />
            {form.formState.errors.address ? (
              <p role="alert" className="text-xs text-destructive">{form.formState.errors.address.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Section copy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">متن سکشن‌های صفحه اصلی</CardTitle>
          <CardDescription className="leading-6">خالی بگذارید تا متن پیش‌فرض نمایش داده شود</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              label="عنوان ماشین‌حساب"
              id="sc-calc-title"
              {...form.register("calculatorTitle")}
            />
          </div>
          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              as="textarea"
              label="توضیح ماشین‌حساب"
              id="sc-calc-desc"
              textareaRows={2}
              {...form.register("calculatorDesc")}
            />
          </div>
          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              label="عنوان پیش‌نمایش FAQ"
              id="sc-faq-title"
              {...form.register("faqPreviewTitle")}
            />
          </div>
          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              label="عنوان دعوت معرفی"
              id="sc-ref-title"
              {...form.register("referralTitle")}
            />
          </div>
          <div className="flex flex-col gap-0.5 relative">
            <FloatingField
              as="textarea"
              label="توضیح دعوت معرفی"
              id="sc-ref-desc"
              textareaRows={2}
              {...form.register("referralDesc")}
            />
          </div>
        </CardContent>
      </Card>

      {saveMessage ? (
        <p role="status" className={`text-sm leading-6 ${saveMessage.kind === "success" ? "text-success" : "text-destructive"}`}>
          {saveMessage.text}
        </p>
      ) : null}
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {(form.formState.errors.root as unknown as { message?: string }).message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-32">
          {form.formState.isSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        <Button type="button" variant="outline" onClick={load} disabled={form.formState.isSubmitting}>
          بازگردانی
        </Button>
      </div>
    </form>
  );
}

export default SiteContentForm;

/**
 * آپلود عکس از گالری یا دوربین — جایگزین ورود دستی مسیر.
 * input با accept=image و capture=environment: روی موبایل منوی «دوربین/گالری»
 * بومی نمایش داده می‌شود؛ روی دسکتاپ پنجره انتخاب فایل.
 * فایل مستقیم به /api/admin/upload می‌رود و مسیر برگشتی در photo ست می‌شود.
 */
function PhotoUploader({
  form,
}: {
  form: ReturnType<typeof useForm<ContentInput>>;
}) {
  const photoValue = form.watch("photo");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok || !data.path) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در آپلود عکس");
      }
      form.setValue("photo", data.path, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "خطا در آپلود عکس");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>عکس نماینده *</Label>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoValue || "/images/profile-placeholder.jpg"}
          alt="پیش‌نمایش عکس نماینده"
          className="size-16 rounded-full border object-cover"
        />
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="انتخاب عکس از گالری یا دوربین"
            onChange={(e) => void onFileChosen(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "در حال آپلود..." : "انتخاب عکس (گالری / دوربین)"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG/PNG — به‌صورت خودکار برش مربعی و فشرده می‌شود
          </p>
        </div>
      </div>
      {uploadError ? <p role="alert" className="text-xs text-destructive">{uploadError}</p> : null}
      {form.formState.errors.photo ? (
        <p role="alert" className="text-xs text-destructive">{form.formState.errors.photo.message}</p>
      ) : null}
    </div>
  );
}
