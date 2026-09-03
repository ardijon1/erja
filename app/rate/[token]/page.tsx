import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { RateClient } from "@/components/rate/RateClient";
import { lookupRatingToken } from "@/lib/rating";
import { buildReferralBaseUrl } from "@/lib/referral-codes";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت امتیاز",
  robots: { index: false, follow: false },
};

export default async function RatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lookup = await lookupRatingToken(token);

  // لینک ارجاع شخصی صاحب امتیاز — تا بعد از ثبت امتیاز، خودش لینکش را بگیرد
  const referralBase = buildReferralBaseUrl();
  let referralUrl = referralBase;
  if (lookup.valid) {
    const req = await prisma.ratingRequest.findUnique({
      where: { token },
      select: { referrer: { select: { code: true } } },
    });
    if (req) referralUrl = `${referralBase}/${req.referrer.code}`;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-4 py-8">
      {lookup.valid ? (
        <RateClient
          token={token}
          referrerName={lookup.referrerName ?? null}
          referralUrl={referralUrl}
        />
      ) : (
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <p className="text-sm leading-7">
              {lookup.reason === "already_submitted"
                ? "امتیاز شما قبلاً ثبت شده — سپاس از همراهی‌تان."
                : lookup.reason === "expired"
                  ? "این لینک امتیاز منقضی شده است. لطفاً از نماینده لینک جدید بگیرید."
                  : "لینک امتیاز معتبر نیست."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
