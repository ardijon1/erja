"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface QrBlockProps {
  url: string;
  size?: number;
}

export function QrBlock({ url, size = 180 }: QrBlockProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const qrSrc = `/api/qr?url=${encodeURIComponent(url)}&width=${size}`;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4">
        <p className="text-sm text-destructive">خطا در بارگذاری QR</p>
        <p className="text-xs text-muted-foreground break-all" dir="ltr">
          {url}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">QR برای اشتراک‌گذاری بیشتر</p>
      <div className="relative" style={{ width: size, height: size }}>
        {!loaded && <Skeleton className="absolute inset-0 rounded-lg" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt="QR کد کارت دیجیتال"
          width={size}
          height={size}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`rounded-lg border bg-white p-2 ${loaded ? "block" : "hidden"}`}
          loading="eager"
        />
      </div>
      <p className="text-xs text-muted-foreground break-all max-w-[260px]" dir="ltr">
        {url}
      </p>
    </div>
  );
}

export default QrBlock;
