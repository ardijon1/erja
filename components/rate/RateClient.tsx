"use client";

import * as React from "react";
import { Check, Copy, Share2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Phase =
  | { kind: "form"; hover: number }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "invalid"; reason: string };

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

const RATING_LABELS: Record<number, string> = {
  1: "خیلی ضعیف",
  2: "ضعیف",
  3: "متوسط",
  4: "خوب",
  5: "عالی",
};

export function RateClient({
  token,
  referrerName,
  referralUrl,
}: {
  token: string;
  referrerName: string | null;
  referralUrl: string;
}) {
  const [phase, setPhase] = React.useState<Phase>({ kind: "form", hover: 0 });
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function onSubmit() {
    if (rating < 1) {
      setError("لطفاً امتیاز را انتخاب کنید");
      return;
    }
    setPhase({ kind: "submitting" });
    setError(null);
    try {
      const res = await fetch(`/api/rate/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 410) {
          setPhase({ kind: "invalid", reason: "این لینک قبلاً استفاده شده یا منقضی است." });
          return;
        }
        throw new Error(typeof data.error === "string" ? data.error : "خطا در ثبت امتیاز");
      }
      setPhase({ kind: "done" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت امتیاز");
      setPhase({ kind: "form", hover: 0 });
    }
  }

  if (phase.kind === "invalid") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-8 text-center">
          <p className="text-sm leading-7">{phase.reason}</p>
        </CardContent>
      </Card>
    );
  }

  if (phase.kind === "done") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Check className="size-6" aria-hidden />
          </span>
          <p className="text-sm leading-7">امتیاز شما ثبت شد — سپاس از وقت‌تان.</p>
          <div className="w-full rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">لینک معرفی اختصاصی شما</p>
            <code dir="ltr" className="mt-2 block break-all text-xs font-mono">
              {referralUrl}
            </code>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (await copyToClipboard(referralUrl)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                کپی لینک
              </Button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: "مشاوره بیمه عمر",
                        text: "مشاوره بیمه عمر از طریق لینک زیر:",
                        url: referralUrl,
                      });
                    } catch {
                      // انصراف کاربر
                    }
                  }}
                >
                  <Share2 className="size-4" aria-hidden />
                  اشتراک‌گذاری
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            اگر کسی از این لینک مشاوره بگیرد، با نام شما به {referrerName ? "عنوان معرف" : "ثبت"} می‌رسد.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hover = phase.kind === "form" ? phase.hover : 0;

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
        <div>
          <h1 className="text-base font-bold">تجربه‌ی شما چطور بود؟</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {referrerName ? `${referrerName}،` : ""} لطفاً به مشاوره‌ای که دریافت کردید امتیاز بدهید.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1" role="radiogroup" aria-label="امتیاز از ۱ تا ۵">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ستاره`}
                className="rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseEnter={() => phase.kind === "form" && setPhase({ kind: "form", hover: n })}
                onMouseLeave={() => phase.kind === "form" && setPhase({ kind: "form", hover: 0 })}
                onClick={() => {
                  setRating(n);
                  setError(null);
                }}
              >
                <Star
                  className={
                    n <= (hover || rating)
                      ? "size-9 fill-warning text-warning"
                      : "size-9 text-border"
                  }
                  aria-hidden
                />
              </button>
            ))}
          </div>
          {rating > 0 ? <p className="text-xs text-muted-foreground">{RATING_LABELS[rating]}</p> : null}
        </div>

        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="نظرتان (اختیاری)"
          maxLength={500}
          aria-label="نظر (اختیاری)"
        />

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="w-full" onClick={() => void onSubmit()} disabled={phase.kind === "submitting"}>
          {phase.kind === "submitting" ? "در حال ثبت..." : "ثبت امتیاز"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default RateClient;
