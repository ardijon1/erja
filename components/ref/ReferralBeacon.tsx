"use client";

import * as React from "react";

/**
 * فاز ۵ — اگر بازدیدکننده مستقیم روی /ref/[code] وارد شود (بدون عبور از /r/[code]
 * که کوکی را ست می‌کند)، این beacon یک‌باره attribution را از طریق
 * /api/referral/[code] انجام می‌دهد: ثبت کلیک + کوکی first-touch.
 * اگر کوکی معتبر از قبل هست، صفحه این کامپوننت را اصلاً رندر نمی‌کند
 * (تا کلیک دوباره‌شماری نشود).
 */
export function ReferralBeacon({ code, enabled }: { code: string; enabled: boolean }) {
  const fired = React.useRef(false);

  React.useEffect(() => {
    if (!enabled || fired.current) return;
    fired.current = true;
    void fetch(`/api/referral/${encodeURIComponent(code)}`, {
      credentials: "include",
      redirect: "manual",
    }).catch(() => {
      // بی‌صدا — انتساب حیاتی نیست
    });
  }, [code, enabled]);

  return null;
}

export default ReferralBeacon;
