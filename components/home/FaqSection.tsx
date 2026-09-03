"use client";

import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

interface FaqSectionProps {
  items: FaqItem[];
  title?: string;
}

export function FaqSection({ items, title = "پرسش‌های پرتکرار" }: FaqSectionProps) {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return Array.from(cats);
  }, [items]);

  const filtered = React.useMemo(() => {
    if (!activeCategory) return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="faq-section-heading" className="flex flex-col gap-4">
      <h2 id="faq-section-heading" className="text-base font-semibold">
        {title}
      </h2>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-transparent hover:bg-accent"
            }`}
          >
            همه ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-transparent hover:bg-accent"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      <Accordion type="single" collapsible className="w-full rounded-lg border bg-card px-4">
        {filtered.map((item) => (
          <AccordionItem key={item.id} value={item.id} className="last:border-0">
            <AccordionTrigger className="text-start leading-6 text-sm">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="leading-8 text-sm text-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export default FaqSection;
