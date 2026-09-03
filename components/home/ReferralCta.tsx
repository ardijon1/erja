import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReferralCta({ title, description }: { title?: string; description?: string }) {
  return (
    <section aria-labelledby="referral-cta-heading" className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle id="referral-cta-heading" className="text-base">
            {title || "لینک اختصاصی ارجاع شما را دارید؟"}
          </CardTitle>
          <CardDescription className="leading-6">
            {description || "اگر از طریق یکی از بیمه‌شده‌های ما به این صفحه آمده‌اید، مشاوره شما با همان ارجاع ثبت می‌شود."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="w-full">
            <Link href="#calculator">شروع مشاوره</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
