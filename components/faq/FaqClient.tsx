"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Card } from "@/components/ui/card";
import { FaqCategoryPicker } from "@/components/faq/FaqCategoryPicker";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { faqItems, type FaqCategory } from "@/content/faq";

export function FaqClient() {
  const [category, setCategory] = React.useState<FaqCategory>("همه");

  const filtered = React.useMemo(() => {
    if (category === "همه") return faqItems;
    return faqItems.filter((i) => i.category === category);
  }, [category]);

  return (
    <div className="flex flex-col gap-4">
      {/* Persistent trust notice — block order from wireframe frame 3 */}
      <Card className="border-primary/15 bg-muted/60">
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-strong">
            <Info className="size-4" aria-hidden />
          </span>
          <p className="text-sm leading-7">پاسخ‌ها توسط نماینده نوشته شده — بدون هوش مصنوعی</p>
        </div>
      </Card>

      {/* Category chips */}
      <FaqCategoryPicker value={category} onChange={setCategory} />

      {/* Accordion */}
      <FaqAccordion items={filtered} />
    </div>
  );
}

export default FaqClient;
