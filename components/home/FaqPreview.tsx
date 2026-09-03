import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { faqItems } from "@/content/faq";

export default function FaqPreview({ title }: { title?: string }) {
  const preview = faqItems.slice(0, 3);

  return (
    <section aria-labelledby="faq-preview-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="faq-preview-heading" className="text-base font-semibold">
          {title || "پرسش‌های پرتکرار"}
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {preview.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">پرسشی یافت نشد.</p>
            </CardContent>
          </Card>
        ) : (
          preview.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <h3 className="text-sm font-medium leading-6">{item.question}</h3>
                <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Button variant="outline" asChild className="w-full">
        <Link href="/faq">مشاهده همه سؤالات</Link>
      </Button>
    </section>
  );
}
