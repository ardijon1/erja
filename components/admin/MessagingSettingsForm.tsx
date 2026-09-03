"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ExternalLink, MessageCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloatingField } from "@/components/admin/FloatingField";
import { Skeleton } from "@/components/ui/skeleton";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { buildTelegramUrl, buildEitaaUrl, buildRubikaUrl, siteContentSchema } from "@/lib/site-content";
import { EitaaIcon, RubikaIcon } from "@/components/shared/CustomIcons";
import type { Resolver } from "react-hook-form";
import { z } from "zod";

const messagingSchema = siteContentSchema.pick({
  whatsappNumber: true,
  whatsappMessage: true,
  whatsappApiToken: true,
  telegramUsername: true,
  telegramMessage: true,
  telegramBotToken: true,
  eitaaUsername: true,
  eitaaMessage: true,
  eitaaBotToken: true,
  rubikaUsername: true,
  rubikaMessage: true,
  rubikaBotToken: true,
});

type MessagingInput = z.infer<typeof messagingSchema>;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

export function MessagingSettingsForm() {
  const [loadState, setLoadState] = React.useState<LoadState>({ status: "loading" });
  const [saveMessage, setSaveMessage] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showWaToken, setShowWaToken] = React.useState(false);
  const [showTgToken, setShowTgToken] = React.useState(false);
  const [showEitaaToken, setShowEitaaToken] = React.useState(false);
  const [showRubikaToken, setShowRubikaToken] = React.useState(false);
  const [fullContent, setFullContent] = React.useState<Record<string, unknown> | null>(null);

  const form = useForm<MessagingInput>({
    resolver: zodResolver(messagingSchema) as unknown as Resolver<MessagingInput>,
    defaultValues: {
      whatsappNumber: "",
      whatsappMessage: "",
      whatsappApiToken: "",
      telegramUsername: "",
      telegramMessage: "",
      telegramBotToken: "",
      eitaaUsername: "",
      eitaaMessage: "",
      eitaaBotToken: "",
      rubikaUsername: "",
      rubikaMessage: "",
      rubikaBotToken: "",
    },
  });

  const load = React.useCallback(async () => {
    setLoadState({ status: "loading" });
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof data.error === "string" ? data.error : "خطا در بارگذاری تنظیمات");
      }
      const data = (await res.json()) as { content: Record<string, unknown> };
      const c = data.content as Record<string, string | number | null>;
      setFullContent(c as Record<string, unknown>);
      form.reset({
        whatsappNumber: String(c.whatsappNumber ?? ""),
        whatsappMessage: String(c.whatsappMessage ?? ""),
        whatsappApiToken: String((c.whatsappApiToken as string) ?? ""),
        telegramUsername: String(c.telegramUsername ?? ""),
        telegramMessage: String(c.telegramMessage ?? ""),
        telegramBotToken: String((c.telegramBotToken as string) ?? ""),
        eitaaUsername: String(c.eitaaUsername ?? ""),
        eitaaMessage: String(c.eitaaMessage ?? ""),
        eitaaBotToken: String((c.eitaaBotToken as string) ?? ""),
        rubikaUsername: String(c.rubikaUsername ?? ""),
        rubikaMessage: String(c.rubikaMessage ?? ""),
        rubikaBotToken: String((c.rubikaBotToken as string) ?? ""),
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

  async function onSubmit(values: MessagingInput) {
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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "خطا در ذخیره";
        throw new Error(msg);
      }
      setSaveMessage({ kind: "success", text: "تنظیمات پیام‌رسان‌ها ذخیره شد." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ذخیره";
      setSaveMessage({ kind: "error", text: msg });
    }
  }

  const waNumber = form.watch("whatsappNumber");
  const waMessage = form.watch("whatsappMessage");
  const tgUsername = form.watch("telegramUsername");
  const tgMessage = form.watch("telegramMessage");
  const tgBotToken = form.watch("telegramBotToken");
  const waToken = form.watch("whatsappApiToken");
  const eitaaUsername = form.watch("eitaaUsername");
  const eitaaMessage = form.watch("eitaaMessage");
  const eitaaToken = form.watch("eitaaBotToken");
  const rubikaUsername = form.watch("rubikaUsername");
  const rubikaMessage = form.watch("rubikaMessage");
  const rubikaToken = form.watch("rubikaBotToken");

  let waPreview: string | null = null;
  try {
    if (waNumber?.trim()) waPreview = buildWhatsAppUrl(waNumber, waMessage);
  } catch {
    waPreview = null;
  }

  let tgPreview: string | null = null;
  try {
    if (tgUsername?.trim()) tgPreview = buildTelegramUrl(tgUsername, tgMessage);
  } catch {
    tgPreview = null;
  }

  let eitaaPreview: string | null = null;
  try {
    if (eitaaUsername?.trim()) eitaaPreview = buildEitaaUrl(eitaaUsername, eitaaMessage);
  } catch {
    eitaaPreview = null;
  }

  let rubikaPreview: string | null = null;
  try {
    if (rubikaUsername?.trim()) rubikaPreview = buildRubikaUrl(rubikaUsername, rubikaMessage);
  } catch {
    rubikaPreview = null;
  }

  const waValid = !!waNumber?.trim() && !form.formState.errors.whatsappNumber && !form.formState.errors.whatsappMessage;
  const tgValid = !tgUsername?.trim() || (!!tgPreview && !form.formState.errors.telegramUsername);
  const eitaaValid = !eitaaUsername?.trim() || (!!eitaaPreview && !form.formState.errors.eitaaUsername);
  const rubikaValid = !rubikaUsername?.trim() || (!!rubikaPreview && !form.formState.errors.rubikaUsername);

  if (loadState.status === "loading") {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
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
    <form
      onSubmit={form.handleSubmit(onSubmit as unknown as Parameters<typeof form.handleSubmit>[0])}
      className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-start"
      noValidate
    >
      {/* Main column — forms */}
      <div className="flex flex-col gap-6">
        {/* WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="flex size-7 items-center justify-center rounded-full bg-whatsapp text-white">
                <MessageCircle className="size-4" aria-hidden />
              </span>
              واتساپ
            </CardTitle>
            <CardDescription className="leading-6">
              دکمه سبز فوتر، دکمه کارت دیجیتال و لینک wa.me — مستقیم و بدون API
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/50 px-3 py-2.5 text-xs leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">راهنما:</p>
              <ul className="list-disc ps-4 mt-1 space-y-0.5">
                <li>
                  شماره را بدون صفر اول و بدون + وارد کنید. مثال:{" "}
                  <span dir="ltr" className="font-mono">
                    989123456789
                  </span>{" "}
                  (ایران +۹۸)
                </li>
                <li>عدد فارسی هم پذیرفته می‌شود و خودکار به انگلیسی تبدیل می‌شود.</li>
                <li>پیام پیش‌فرض همان متنی است که کاربر با کلیک روی دکمه در واتساپ می‌بیند.</li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="شماره واتساپ *"
                  id="msg-wa-number"
                  dir="ltr"
                  className="text-start"
                  {...form.register("whatsappNumber")}
                  aria-invalid={!!form.formState.errors.whatsappNumber}
                />
                {form.formState.errors.whatsappNumber ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.whatsappNumber.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">بدون + و بدون فاصله — فقط رقم</p>
                )}
              </div>
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="پیام پیش‌فرض واتساپ *"
                  id="msg-wa-msg"
                  {...form.register("whatsappMessage")}
                  aria-invalid={!!form.formState.errors.whatsappMessage}
                />
                {form.formState.errors.whatsappMessage ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.whatsappMessage.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Advanced — API token */}
            <details className="rounded-md border bg-muted/30 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-medium select-none">
                پیشرفته — توکن WhatsApp Business (اختیاری، فعلاً استفاده نمی‌شود)
              </summary>
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs leading-6 text-muted-foreground">
                  اگر در آینده ارسال خودکار واتساپ فعال شود، توکن اینجا ذخیره می‌شود. در حال حاضر لینک wa.me کافی است و نیازی به پر کردن نیست.
                </p>
                <Label htmlFor="msg-wa-token" className="text-xs">
                  توکن WhatsApp Business API
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="msg-wa-token"
                    dir="ltr"
                    className="text-start font-mono text-xs"
                    type={showWaToken ? "text" : "password"}
                    placeholder="— خالی —"
                    autoComplete="off"
                    {...form.register("whatsappApiToken")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label={showWaToken ? "مخفی کردن توکن" : "نمایش توکن"}
                    onClick={() => setShowWaToken((v) => !v)}
                  >
                    {showWaToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                {waToken ? (
                  <p className="text-xs text-muted-foreground">ذخیره شده — در دیتابیس به صورت متن ساده نگه‌داری می‌شود.</p>
                ) : null}
              </div>
            </details>

            {waPreview ? (
              <div className="rounded-md border px-3 py-2.5">
                <p className="text-xs text-muted-foreground">پیش‌نمایش لینک:</p>
                <a
                  href={waPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="mt-1 block break-all text-xs text-primary-strong underline underline-offset-2"
                >
                  {waPreview}
                </a>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href={waPreview} target="_blank" rel="noopener noreferrer">
                    تست در واتساپ <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="flex size-7 items-center justify-center rounded-full bg-telegram text-white">
                <Send className="size-4" aria-hidden />
              </span>
              تلگرام
            </CardTitle>
            <CardDescription className="leading-6">دکمه آبی فوتر و کارت — خالی بگذارید تا دکمه مخفی بماند</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/50 px-3 py-2.5 text-xs leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">راهنما:</p>
              <ul className="list-disc ps-4 mt-1 space-y-0.5">
                <li>
                  فقط نام کاربری (username) — بدون لینک کامل. مثال:{" "}
                  <span dir="ltr" className="font-mono">
                    ardalan_insurance
                  </span>{" "}
                  یا{" "}
                  <span dir="ltr" className="font-mono">
                    @ardalan_insurance
                  </span>
                </li>
                <li>اگر خالی باشد، دکمه تلگرام در سایت نمایش داده نمی‌شود.</li>
                <li>
                  پیام تلگرام اختیاری است — اگر پر شود به صورت{" "}
                  <span dir="ltr" className="font-mono">
                    ?text=...
                  </span>{" "}
                  به لینک اضافه می‌شود.
                </li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="نام کاربری تلگرام"
                  id="msg-tg-username"
                  dir="ltr"
                  className="text-start"
                  {...form.register("telegramUsername")}
                  aria-invalid={!!form.formState.errors.telegramUsername}
                />
                {form.formState.errors.telegramUsername ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.telegramUsername.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">۳ تا ۳۲ حرف — فقط a-z, 0-9 و _</p>
                )}
              </div>
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="پیام پیش‌فرض تلگرام (اختیاری)"
                  id="msg-tg-msg"
                  {...form.register("telegramMessage")}
                  aria-invalid={!!form.formState.errors.telegramMessage}
                />
                {form.formState.errors.telegramMessage ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.telegramMessage.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Bot token */}
            <details className="rounded-md border bg-muted/30 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-medium select-none">توکن ربات تلگرام — از @BotFather (اختیاری، رزرو)</summary>
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs leading-6 text-muted-foreground">
                  برای ارسال خودکار آینده (اطلاع‌رسانی لید جدید و ...). فعلاً فقط ذخیره می‌شود و هیچ درخواستی به api.telegram.org ارسال نمی‌شود. از @BotFather با دستور /newbot بگیرید.
                </p>
                <Label htmlFor="msg-tg-token" className="text-xs">
                  Bot Token
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="msg-tg-token"
                    dir="ltr"
                    className="text-start font-mono text-xs"
                    type={showTgToken ? "text" : "password"}
                    placeholder="123456:ABC-..."
                    autoComplete="off"
                    {...form.register("telegramBotToken")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label={showTgToken ? "مخفی کردن توکن" : "نمایش توکن"}
                    onClick={() => setShowTgToken((v) => !v)}
                  >
                    {showTgToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                {tgBotToken ? (
                  <p className="text-xs text-muted-foreground">ذخیره شده — فعلاً استفاده نمی‌شود.</p>
                ) : null}
              </div>
            </details>

            {tgPreview ? (
              <div className="rounded-md border px-3 py-2.5">
                <p className="text-xs text-muted-foreground">پیش‌نمایش لینک:</p>
                <a
                  href={tgPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="mt-1 block break-all text-xs text-primary-strong underline underline-offset-2"
                >
                  {tgPreview}
                </a>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href={tgPreview} target="_blank" rel="noopener noreferrer">
                    تست در تلگرام <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs leading-6 text-muted-foreground">
                نام کاربری خالی است — دکمه تلگرام در فوتر و کارت دیجیتال نمایش داده نمی‌شود.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eitaa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#E8434A] text-white">
                <EitaaIcon className="size-4" aria-hidden />
              </span>
              ایتا
            </CardTitle>
            <CardDescription className="leading-6">دکمه قرمز فوتر و کارت — خالی بگذارید تا دکمه مخفی بماند</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/50 px-3 py-2.5 text-xs leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">راهنما:</p>
              <ul className="list-disc ps-4 mt-1 space-y-0.5">
                <li>
                  فقط نام کاربری (username) — بدون لینک کامل. مثال:{" "}
                  <span dir="ltr" className="font-mono">
                    ardalan_insurance
                  </span>
                </li>
                <li>اگر خالی باشد، دکمه ایتا در سایت نمایش داده نمی‌شود.</li>
                <li>
                  پیام اختیاری است — اگر پر شود به صورت{" "}
                  <span dir="ltr" className="font-mono">
                    ?text=...
                  </span>{" "}
                  به لینک اضافه می‌شود.
                </li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="نام کاربری ایتا"
                  id="msg-eitaa-username"
                  dir="ltr"
                  className="text-start"
                  {...form.register("eitaaUsername")}
                  aria-invalid={!!form.formState.errors.eitaaUsername}
                />
                {form.formState.errors.eitaaUsername ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.eitaaUsername.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">فقط a-z, 0-9 و _</p>
                )}
              </div>
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="پیام پیش‌فرض ایتا (اختیاری)"
                  id="msg-eitaa-msg"
                  {...form.register("eitaaMessage")}
                  aria-invalid={!!form.formState.errors.eitaaMessage}
                />
                {form.formState.errors.eitaaMessage ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.eitaaMessage.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Bot token */}
            <details className="rounded-md border bg-muted/30 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-medium select-none">توکن ربات ایتا — اختیاری، رزرو</summary>
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs leading-6 text-muted-foreground">
                  برای ارسال خودکار آینده. فعلاً فقط ذخیره می‌شود.
                </p>
                <Label htmlFor="msg-eitaa-token" className="text-xs">
                  Bot Token
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="msg-eitaa-token"
                    dir="ltr"
                    className="text-start font-mono text-xs"
                    type={showEitaaToken ? "text" : "password"}
                    placeholder="— خالی —"
                    autoComplete="off"
                    {...form.register("eitaaBotToken")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label={showEitaaToken ? "مخفی کردن توکن" : "نمایش توکن"}
                    onClick={() => setShowEitaaToken((v) => !v)}
                  >
                    {showEitaaToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                {eitaaToken ? (
                  <p className="text-xs text-muted-foreground">ذخیره شده — فعلاً استفاده نمی‌شود.</p>
                ) : null}
              </div>
            </details>

            {eitaaPreview ? (
              <div className="rounded-md border px-3 py-2.5">
                <p className="text-xs text-muted-foreground">پیش‌نمایش لینک:</p>
                <a
                  href={eitaaPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="mt-1 block break-all text-xs text-primary-strong underline underline-offset-2"
                >
                  {eitaaPreview}
                </a>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href={eitaaPreview} target="_blank" rel="noopener noreferrer">
                    تست در ایتا <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs leading-6 text-muted-foreground">
                نام کاربری خالی است — دکمه ایتا در فوتر و کارت دیجیتال نمایش داده نمی‌شود.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rubika */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#4A4A4A] text-white">
                <RubikaIcon className="size-4" aria-hidden />
              </span>
              روبیکا
            </CardTitle>
            <CardDescription className="leading-6">دکمه خاکستری فوتر و کارت — خالی بگذارید تا دکمه مخفی بماند</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/50 px-3 py-2.5 text-xs leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">راهنما:</p>
              <ul className="list-disc ps-4 mt-1 space-y-0.5">
                <li>
                  فقط نام کاربری (username) — بدون لینک کامل. مثال:{" "}
                  <span dir="ltr" className="font-mono">
                    ardalan_insurance
                  </span>
                </li>
                <li>اگر خالی باشد، دکمه روبیکا در سایت نمایش داده نمی‌شود.</li>
                <li>
                  پیام اختیاری است — اگر پر شود به صورت{" "}
                  <span dir="ltr" className="font-mono">
                    ?text=...
                  </span>{" "}
                  به لینک اضافه می‌شود.
                </li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="نام کاربری روبیکا"
                  id="msg-rubika-username"
                  dir="ltr"
                  className="text-start"
                  {...form.register("rubikaUsername")}
                  aria-invalid={!!form.formState.errors.rubikaUsername}
                />
                {form.formState.errors.rubikaUsername ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.rubikaUsername.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">فقط a-z, 0-9 و _</p>
                )}
              </div>
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="پیام پیش‌فرض روبیکا (اختیاری)"
                  id="msg-rubika-msg"
                  {...form.register("rubikaMessage")}
                  aria-invalid={!!form.formState.errors.rubikaMessage}
                />
                {form.formState.errors.rubikaMessage ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.rubikaMessage.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Bot token */}
            <details className="rounded-md border bg-muted/30 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-medium select-none">توکن ربات روبیکا — اختیاری، رزرو</summary>
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs leading-6 text-muted-foreground">
                  برای ارسال خودکار آینده. فعلاً فقط ذخیره می‌شود.
                </p>
                <Label htmlFor="msg-rubika-token" className="text-xs">
                  Bot Token
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="msg-rubika-token"
                    dir="ltr"
                    className="text-start font-mono text-xs"
                    type={showRubikaToken ? "text" : "password"}
                    placeholder="— خالی —"
                    autoComplete="off"
                    {...form.register("rubikaBotToken")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label={showRubikaToken ? "مخفی کردن توکن" : "نمایش توکن"}
                    onClick={() => setShowRubikaToken((v) => !v)}
                  >
                    {showRubikaToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                {rubikaToken ? (
                  <p className="text-xs text-muted-foreground">ذخیره شده — فعلاً استفاده نمی‌شود.</p>
                ) : null}
              </div>
            </details>

            {rubikaPreview ? (
              <div className="rounded-md border px-3 py-2.5">
                <p className="text-xs text-muted-foreground">پیش‌نمایش لینک:</p>
                <a
                  href={rubikaPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="mt-1 block break-all text-xs text-primary-strong underline underline-offset-2"
                >
                  {rubikaPreview}
                </a>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href={rubikaPreview} target="_blank" rel="noopener noreferrer">
                    تست در روبیکا <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-3 py-3 text-xs leading-6 text-muted-foreground">
                نام کاربری خالی است — دکمه روبیکا در فوتر و کارت دیجیتال نمایش داده نمی‌شود.
              </div>
            )}
          </CardContent>
        </Card>

        {saveMessage ? (
          <p
            role="status"
            className={`text-sm leading-6 ${saveMessage.kind === "success" ? "text-success" : "text-destructive"}`}
          >
            {saveMessage.text}
          </p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-32">
            {form.formState.isSubmitting ? "در حال ذخیره..." : "ذخیره تنظیمات"}
          </Button>
          <Button type="button" variant="outline" onClick={load} disabled={form.formState.isSubmitting}>
            بازگردانی
          </Button>
        </div>
      </div>

      {/* Side column — preview + health + docs (A2) */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        {/* Live preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">پیش‌نمایش زنده</CardTitle>
            <CardDescription className="leading-6">هم‌زمان با تایپ به‌روز می‌شود — نیازی به ذخیره نیست</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="rounded-md border px-3 py-3">
              <p className="text-xs font-medium">واتساپ</p>
              {waPreview ? (
                <>
                  <a
                    href={waPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="mt-1.5 block break-all text-xs text-primary-strong underline underline-offset-2"
                  >
                    {waPreview}
                  </a>
                  <span className="mt-2 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                    آماده
                  </span>
                </>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">شماره را وارد کنید تا لینک ساخته شود.</p>
              )}
            </div>
            <div className="rounded-md border px-3 py-3">
              <p className="text-xs font-medium">تلگرام</p>
              {tgPreview ? (
                <>
                  <a
                    href={tgPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="mt-1.5 block break-all text-xs text-primary-strong underline underline-offset-2"
                  >
                    {tgPreview}
                  </a>
                  <span className="mt-2 inline-flex rounded-full bg-info/10 px-2 py-0.5 text-xs text-info">
                    آماده
                  </span>
                </>
              ) : (
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  نام کاربری خالی است — لینک تلگرام ساخته نمی‌شود و دکمه در سایت مخفی می‌ماند.
                </p>
              )}
            </div>
            <div className="rounded-md border px-3 py-3">
              <p className="text-xs font-medium">ایتا</p>
              {eitaaPreview ? (
                <>
                  <a
                    href={eitaaPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="mt-1.5 block break-all text-xs text-primary-strong underline underline-offset-2"
                  >
                    {eitaaPreview}
                  </a>
                  <span className="mt-2 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                    آماده
                  </span>
                </>
              ) : (
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  نام کاربری خالی است — لینک ایتا ساخته نمی‌شود و دکمه در سایت مخفی می‌ماند.
                </p>
              )}
            </div>
            <div className="rounded-md border px-3 py-3">
              <p className="text-xs font-medium">روبیکا</p>
              {rubikaPreview ? (
                <>
                  <a
                    href={rubikaPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="mt-1.5 block break-all text-xs text-primary-strong underline underline-offset-2"
                  >
                    {rubikaPreview}
                  </a>
                  <span className="mt-2 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                    آماده
                  </span>
                </>
              ) : (
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  نام کاربری خالی است — لینک روبیکا ساخته نمی‌شود و دکمه در سایت مخفی می‌ماند.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Health checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">چک‌لیست سلامت</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs leading-6">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${waValid ? "bg-success" : "bg-warning"}`}
                aria-hidden
              />
              <span className={waValid ? "text-foreground" : "text-muted-foreground"}>
                واتساپ: {waValid ? "معتبر" : "نیاز به بررسی"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${tgValid ? "bg-success" : "bg-warning"}`} aria-hidden />
              <span className={tgValid ? "text-foreground" : "text-muted-foreground"}>
                تلگرام: {tgValid ? (tgUsername?.trim() ? "معتبر" : "غیرفعال (مجاز)") : "نامعتبر"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${eitaaValid ? "bg-success" : "bg-warning"}`} aria-hidden />
              <span className={eitaaValid ? "text-foreground" : "text-muted-foreground"}>
                ایتا: {eitaaValid ? (eitaaUsername?.trim() ? "معتبر" : "غیرفعال (مجاز)") : "نامعتبر"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${rubikaValid ? "bg-success" : "bg-warning"}`} aria-hidden />
              <span className={rubikaValid ? "text-foreground" : "text-muted-foreground"}>
                روبیکا: {rubikaValid ? (rubikaUsername?.trim() ? "معتبر" : "غیرفعال (مجاز)") : "نامعتبر"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${waToken || tgBotToken || eitaaToken || rubikaToken ? "bg-info" : "bg-muted-foreground/40"}`}
                aria-hidden
              />
              <span className="text-muted-foreground">توکن‌ها: {waToken || tgBotToken || eitaaToken || rubikaToken ? "ذخیره شده (رزرو)" : "خالی — نیازی نیست"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">آموزش کوتاه</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-xs leading-6 text-muted-foreground">
            <details>
              <summary className="cursor-pointer font-medium text-foreground select-none">چطور نام کاربری تلگرام را پیدا کنم؟</summary>
              <ul className="list-disc ps-4 mt-2 space-y-1">
                <li>کانال/گروه خود را باز کنید → روی نام کانال بزنید → username را کپی کنید.</li>
                <li>برای اکانت شخصی: Settings → Username.</li>
                <li>فقط حروف انگلیسی، عدد و _ — بدون فاصله یا @ اجباری.</li>
              </ul>
            </details>
            <details>
              <summary className="cursor-pointer font-medium text-foreground select-none">BotFather و توکن ربات چیست؟</summary>
              <ul className="list-disc ps-4 mt-2 space-y-1">
                <li>در تلگرام به @BotFather پیام دهید → /newbot → نام ربات را بسازید.</li>
                <li>توکن را کپی و اینجا paste کنید. فعلاً فقط ذخیره می‌شود.</li>
                <li>توکن را با کسی به اشتراک نگذارید — مثل رمز عبور است.</li>
              </ul>
            </details>
            <details>
              <summary className="cursor-pointer font-medium text-foreground select-none">فرمت شماره واتساپ</summary>
              <ul className="list-disc ps-4 mt-2 space-y-1">
                <li>با 98 شروع شود، بدون صفر اول: 98912... نه 0912...</li>
                <li>عدد فارسی خودکار تبدیل می‌شود.</li>
                <li>برای تست، لینک پیش‌نمایش را در تب جدید باز کنید.</li>
              </ul>
            </details>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

export default MessagingSettingsForm;
