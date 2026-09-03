"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CALCULATOR_CONSTANTS, type CalculatorResult } from "@/lib/calculator";
import { formatCurrencyIRT, formatFriendlyToman, formatNumberFa, toEnglishDigits, toPersianDigits, normalizeNumericInput } from "@/lib/format";

function parseIrrInput(value: string): number | null {
  const ascii = toEnglishDigits(value).replace(/[,،\s٬]/g, "").trim();
  if (!ascii) return null;
  const n = Number(ascii);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  return Math.trunc(n);
}

// Referral attribution is via httpOnly signed cookie — JS cannot read it (XSS protection).
// Server automatically attaches referral via getReferralCode(request) in /api/leads.
// No client-side cookie parsing needed.

const calculatorSchema = z.object({
  monthlyIncome: z
    .string()
    .trim()
    .min(1, "لطفاً درآمد ماهانه را وارد کنید.")
    .refine((v) => parseIrrInput(v) !== null && (parseIrrInput(v) as number) >= 0, {
      message: "لطفاً درآمد ماهانه را به‌صورت عدد صحیح وارد کنید.",
    }),
  dependents: z
    .string()
    .trim()
    .min(1, "لطفاً تعداد افراد تحت تکفل را وارد کنید.")
    .refine(
      (v) => {
        const n = parseIrrInput(v);
        return n !== null && Number.isInteger(n) && n >= 0 && n <= 20;
      },
      { message: "تعداد افراد تحت تکفل باید عددی بین ۰ تا ۲۰ باشد." },
    ),
  debt: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const n = parseIrrInput(v);
        return n !== null && n >= 0;
      },
      { message: "مبلغ بدهی را به‌صورت عدد صحیح وارد کنید یا خالی بگذارید." },
    ),
});

const leadSchema = z.object({
  leadName: z.string().trim().min(1, "نام و نام خانوادگی الزامی است.").max(200),
  leadPhone: z.string().trim().min(7, "شماره تماس الزامی است.").max(30),
  leadMessage: z.string().trim().max(2000).optional().or(z.literal("")),
});

type CalculatorFormValues = z.infer<typeof calculatorSchema>;
type LeadFormValues = z.infer<typeof leadSchema>;

/**
 * فیلد مبلغ با فرمت‌کننده زنده: هر بار که کاربر تایپ می‌کند، مقدار input
 * نرمال می‌شود (ارقام فارسی + جداکننده هزارگان «٬»). چون input با register
 * غیرکنترل است، مقدار DOM مستقیم به‌روزرسانی و رویداد به RHF داده می‌شود تا
 * هم نمایش و هم مقدار فرم یکی باشند. خواندن مقدار همیشه از طریق
 * parseIrrInput (نرمال‌سازی + حذف جداکننده) انجام می‌شود.
 */
function GroupedMoneyInput({
  id,
  field,
  placeholder,
  invalid,
}: {
  id: string;
  field: ReturnType<ReturnType<typeof useForm>["register"]>;
  placeholder: string;
  invalid: boolean;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder={placeholder}
      dir="rtl"
      autoComplete="off"
      aria-invalid={invalid}
      {...field}
      onChange={(e) => {
        e.target.value = normalizeNumericInput(e.target.value);
        field.onChange(e);
      }}
    />
  );
}

export default function NeedsCalculatorForm({ title, description }: { title?: string; description?: string }) {
  const [result, setResult] = React.useState<CalculatorResult | null>(null);
  const [calcError, setCalcError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showLead, setShowLead] = React.useState(false);
  const [leadSuccess, setLeadSuccess] = React.useState(false);

  // اسنپ‌شات ورودی‌های زمان محاسبه — برای بولت‌ها و معادل ماه حقوق، تا با نتیجه هم‌خوان بماند
  const [calcInputs, setCalcInputs] = React.useState<{ income: number; dep: number } | null>(null);
  const monthlyIncomeToman = calcInputs?.income ?? 0;
  const dependentsCount = calcInputs?.dep ?? 0;

  const calcForm = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: { monthlyIncome: "", dependents: "", debt: "" },
    mode: "onSubmit",
  });

  const leadForm = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { leadName: "", leadPhone: "", leadMessage: "" },
    mode: "onSubmit",
  });

  async function onCalculate(values: CalculatorFormValues) {
    setCalcError(null);
    setResult(null);
    setLeadSuccess(false);

    const income = parseIrrInput(values.monthlyIncome) as number;
    const dep = parseIrrInput(values.dependents) as number;
    const debtVal = values.debt?.trim() ? (parseIrrInput(values.debt) as number) : 0;

    setLoading(true);
    setCalcInputs({ income, dep });
    try {
      const res = await fetch("/api/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyIncome: income,
          dependents: dep,
          debt: debtVal,
        }),
      });
      const data = (await res.json()) as CalculatorResult & { error?: string };
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "خطا در محاسبه. لطفاً دوباره تلاش کنید.";
        throw new Error(msg);
      }
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در محاسبه.";
      setCalcError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitLead(values: LeadFormValues) {
    const calcValues = calcForm.getValues();
    const income = parseIrrInput(calcValues.monthlyIncome) ?? 0;
    const dep = parseIrrInput(calcValues.dependents) ?? 0;
    const debtVal = calcValues.debt?.trim() ? (parseIrrInput(calcValues.debt) ?? 0) : 0;

    try {
      const payload: Record<string, unknown> = {
        name: values.leadName.trim(),
        phone: values.leadPhone.trim(),
        monthlyIncome: income,
        dependents: dep,
        debt: debtVal,
        message: values.leadMessage?.trim() || null,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "ارسال درخواست ناموفق بود.");

      setLeadSuccess(true);
      leadForm.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ارسال درخواست.";
      leadForm.setError("root", { message: msg });
    }
  }

  return (
    <section
      id="calculator"
      aria-labelledby="calculator-heading"
      className="flex flex-col gap-4 rounded-xl border bg-muted/50 p-4 sm:p-6"
    >
      <Card>
        <CardHeader>
          <CardTitle id="calculator-heading" className="text-base">
            {title || "در ۳۰ ثانیه بفهمید خانواده‌تان به چه عددی نیاز دارد"}
          </CardTitle>
          <CardDescription className="leading-6">
            {description || "با وارد کردن اطلاعات زیر، برآورد اولیه پوشش پیشنهادی را به‌صورت تخمینی مشاهده کنید."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={calcForm.handleSubmit(onCalculate)} className="flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthlyIncome">درآمد ماهانه (تومان)</Label>
              <GroupedMoneyInput
                id="monthlyIncome"
                field={calcForm.register("monthlyIncome")}
                placeholder={`مثال: ${formatNumberFa(5000000)}`}
                invalid={!!calcForm.formState.errors.monthlyIncome}
              />
              {calcForm.formState.errors.monthlyIncome ? (
                <p role="alert" className="text-xs text-destructive">
                  {calcForm.formState.errors.monthlyIncome.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dependents">چند نفر از مخارج‌شان به شما وابسته است؟</Label>
              <Input
                id="dependents"
                inputMode="numeric"
                placeholder="مثال: ۲ — فرزند، پدر یا مادر"
                dir="rtl"
                autoComplete="off"
                aria-invalid={!!calcForm.formState.errors.dependents}
                {...calcForm.register("dependents")}
              />
              {calcForm.formState.errors.dependents ? (
                <p role="alert" className="text-xs text-destructive">
                  {calcForm.formState.errors.dependents.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="debt">وام یا اقساطی که اگر شما نبودید روی دوش خانواده می‌ماند؟ (اختیاری)</Label>
              <GroupedMoneyInput
                id="debt"
                field={calcForm.register("debt")}
                placeholder={`مثال: ${formatNumberFa(20000000)}`}
                invalid={!!calcForm.formState.errors.debt}
              />
              {calcForm.formState.errors.debt ? (
                <p role="alert" className="text-xs text-destructive">
                  {calcForm.formState.errors.debt.message}
                </p>
              ) : null}
            </div>

            {calcError ? (
              <p role="alert" className="text-sm text-destructive">
                {calcError}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "در حال محاسبه..." : "محاسبه برآورد"}
            </Button>

            {loading ? (
              <div className="flex flex-col gap-3 pt-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span>نتیجه تخمینی</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-strong">
                تخمینی
              </span>
            </CardTitle>
            <CardDescription className="text-xs leading-6 text-muted-foreground">
              برآورد اولیه — مشاوره تخصصی جایگزین نیست
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">پوشش پیشنهادی</p>
              <p className="mt-1 text-2xl font-bold">{formatFriendlyToman(result.estimatedCover)}</p>
              {monthlyIncomeToman > 0 ? (
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  معادل {formatNumberFa(Math.round(result.estimatedCover / monthlyIncomeToman))} ماه حقوق فعلی شما
                </p>
              ) : null}
            </div>

            <ul className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
                <span>
                  جایگزین درآمد خانواده برای{" "}
                  <b>{formatNumberFa(CALCULATOR_CONSTANTS.YEARS * 12)} ماه</b>
                  {" "}(سهم درآمد: {formatCurrencyIRT(result.breakdown.incomeComponent)})
                </span>
              </li>
              {result.breakdown.dependentsComponent > 0 ? (
                <li className="flex items-start gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
                  <span>
                    هزینه‌ی نگهداری و آینده‌ی {formatNumberFa(dependentsCount)} نفر از عزیزانتان
                    {" "}(سهم هر نفر: {formatCurrencyIRT(CALCULATOR_CONSTANTS.DEPENDENT_ALLOWANCE)})
                  </span>
                </li>
              ) : null}
              {result.breakdown.debtComponent > 0 ? (
                <li className="flex items-start gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
                  <span>
                    تسویه‌ی کامل بدهی‌ها و اقساط
                    {" "}(سهم بدهی: {formatCurrencyIRT(result.breakdown.debtComponent)})
                  </span>
                </li>
              ) : null}
            </ul>

            <p className="text-center text-xs leading-6 text-muted-foreground">
              این عدد چطور به دست آمده؟ {formatNumberFa(CALCULATOR_CONSTANTS.YEARS)} برابر حقوق سالانه‌ی شما
              {dependentsCount > 0 ? ` + سهم ${formatNumberFa(dependentsCount)} نفر وابسته` : ""}
              {result.breakdown.debtComponent > 0 ? " + مجموع بدهی‌ها" : ""} = این عدد
            </p>

            <p className="text-center text-xs text-muted-foreground">
              نسخه فرمول: {toPersianDigits(result.meta.formulaVersion)}
            </p>

            {!showLead ? (
              <Button onClick={() => setShowLead(true)} variant="outline" className="w-full">
                ثبت درخواست مشاوره با این برآورد
              </Button>
            ) : (
              <form
                onSubmit={leadForm.handleSubmit(onSubmitLead)}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4"
                noValidate
              >
                <p className="text-sm font-medium">ثبت درخواست مشاوره</p>
                <p className="text-xs leading-6 text-muted-foreground">
                  اطلاعات تماس خود را وارد کنید تا مشاوره تخصصی بر اساس همین برآورد انجام شود.
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="leadName">نام و نام خانوادگی</Label>
                  <Input
                    id="leadName"
                    placeholder="نام شما"
                    aria-invalid={!!leadForm.formState.errors.leadName}
                    {...leadForm.register("leadName")}
                  />
                  {leadForm.formState.errors.leadName ? (
                    <p role="alert" className="text-xs text-destructive">
                      {leadForm.formState.errors.leadName.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="leadPhone">شماره تماس</Label>
                  <Input
                    id="leadPhone"
                    inputMode="tel"
                    placeholder={toPersianDigits("09123456789")}
                    dir="ltr"
                    className="text-right"
                    aria-invalid={!!leadForm.formState.errors.leadPhone}
                    {...leadForm.register("leadPhone")}
                  />
                  {leadForm.formState.errors.leadPhone ? (
                    <p role="alert" className="text-xs text-destructive">
                      {leadForm.formState.errors.leadPhone.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="leadMessage">پیام (اختیاری)</Label>
                  <textarea
                    suppressHydrationWarning
                    id="leadMessage"
                    placeholder="توضیح کوتاه درباره نیاز شما"
                    rows={3}
                    className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...leadForm.register("leadMessage")}
                  />
                  {leadForm.formState.errors.leadMessage ? (
                    <p role="alert" className="text-xs text-destructive">
                      {leadForm.formState.errors.leadMessage.message}
                    </p>
                  ) : null}
                </div>

                {leadForm.formState.errors.root ? (
                  <p role="alert" className="text-sm text-destructive">
                    {leadForm.formState.errors.root.message}
                  </p>
                ) : null}
                {leadSuccess ? (
                  <p role="status" className="text-sm text-success">
                    درخواست شما با موفقیت ثبت شد. به‌زودی با شما تماس می‌گیریم.
                  </p>
                ) : null}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={leadForm.formState.isSubmitting}
                    className="flex-1"
                  >
                    {leadForm.formState.isSubmitting ? "در حال ارسال..." : "ارسال درخواست"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLead(false)}
                    className="flex-1"
                  >
                    انصراف
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
