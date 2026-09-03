"use client";

import * as React from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * دکمه‌های اشتراک لینک ارجاع — کانال‌محور:
 * «اشتراک» فقط وقتی Web Share API موجود است رندر می‌شود (شیتر بومی گوشی —
 * کاربر هر اپی دارد انتخاب می‌کند: واتساپ، تلگرام، ایتا، روبیکا، پیامک، …).
 * «کپی» همیشه هست — fallback همگانی برای هر محیط.
 */

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
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

function useCopiedFlash(): [boolean, () => void] {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = React.useCallback(() => {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, []);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return [copied, flash];
}

export function CopyLinkButton({
  url,
  size = "sm",
  label = "کپی لینک",
}: {
  url: string;
  size?: "sm" | "icon";
  label?: string;
}) {
  const [copied, flash] = useCopiedFlash();

  return (
    <Button
      variant="ghost"
      size={size}
      className={size === "sm" ? "px-2" : ""}
      aria-label={copied ? "کپی شد" : label}
      title={copied ? "کپی شد" : label}
      disabled={copied}
      onClick={async () => {
        if (await copyToClipboard(url)) flash();
      }}
    >
      {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {size === "sm" ? <span className="sr-only">{label}</span> : null}
    </Button>
  );
}

export function ShareLinkButton({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text?: string;
}) {
  const [canShare, setCanShare] = React.useState(false);
  const [copied, flash] = useCopiedFlash();

  React.useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  if (!canShare) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-2"
      aria-label="اشتراک‌گذاری لینک"
      title="اشتراک‌گذاری لینک"
      onClick={async () => {
        try {
          await navigator.share({ title, text, url });
        } catch {
          // کاربر انصراف داد یا شکست خورد — بی‌صدا
        }
      }}
      onDoubleClick={async () => {
        if (await copyToClipboard(url)) flash();
      }}
    >
      {copied ? <Check className="size-4 text-success" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      <span className="sr-only">اشتراک‌گذاری لینک</span>
    </Button>
  );
}
