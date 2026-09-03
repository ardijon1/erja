import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SealMark } from "@/components/shared/SealMark";
import { ReferralBeacon } from "@/components/ref/ReferralBeacon";
import { getSiteContent } from "@/lib/site-content";
import { prisma } from "@/lib/db";
import { REFERRAL_COOKIE_NAME, verifyReferralCookieValue } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "خوش آمدید",
  robots: { index: false, follow: false },
};

export default async function RefLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // نمایش فقط برای کد معتبر — کد نامعتبر همان اطلاعات عمومی بدون معرف
  const referrer = await prisma.referrer.findUnique({
    where: { code },
    select: { displayName: true },
  });

  // اگر کوکی معتبر همین کد هست، کلیک قبلاً شمرده شده — beacon لازم نیست
  const cookieStore = await cookies();
  const verified = verifyReferralCookieValue(cookieStore.get(REFERRAL_COOKIE_NAME)?.value);
  const needsBeacon = referrer !== null && verified !== code;

  const content = await getSiteContent();

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-4 py-8">
      <ReferralBeacon code={code} enabled={needsBeacon} />
      <Card className="relative w-full overflow-hidden">
        <SealMark className="pointer-events-none absolute -top-8 -end-8 size-36 opacity-[0.05]" />
        <CardContent className="flex flex-col items-center gap-5 p-6 text-center">
          <div className="size-24 overflow-hidden rounded-full bg-muted ring-1 ring-primary/25 ring-offset-2 ring-offset-card sm:size-28">
            <Image
              src={content.photo}
              alt={`عکس ${content.name}`}
              width={112}
              height={112}
              priority
              sizes="112px"
              className="size-24 object-cover sepia-[.08] saturate-[1.05] sm:size-28"
            />
          </div>

          <div className="flex flex-col gap-2">
            {referrer ? (
              <p className="text-sm leading-7 text-muted-foreground">
                از طرف <span className="font-bold text-foreground">{referrer.displayName}</span> به این‌جا
                آمدید — خوش آمدید!
              </p>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">خوش آمدید!</p>
            )}
            <h1 className="text-xl font-bold">{content.name}</h1>
            <p className="text-sm text-muted-foreground">{content.title}</p>
            {content.shortBio ? (
              <p className="text-sm leading-7 text-muted-foreground">{content.shortBio}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-muted/50 px-4 py-2.5 text-xs leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">
              +{toFa(content.yearsExperience)} سال سابقه
            </span>
            <span aria-hidden>·</span>
            <span className="font-medium text-foreground">+{toFa(content.insuredCount)} بیمه‌شده</span>
            <span aria-hidden>·</span>
            <span>مشاوره‌ی شما با همین ارجاع ثبت می‌شود</span>
          </div>

          <Button asChild size="lg" className="w-full">
            <Link href="/#calculator">شروع مشاوره — محاسبه پوشش موردنیاز</Link>
          </Button>

          <p className="text-xs leading-6 text-muted-foreground">
            با لمس دکمه بالا، مشاوره و برآورد شما با معرفی{" "}
            {referrer ? referrer.displayName : "معرف"} ثبت خواهد شد.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function toFa(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
