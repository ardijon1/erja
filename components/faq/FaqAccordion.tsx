"use client";

import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FaqItem } from "@/content/faq";
import { EmptyState } from "@/components/shared/EmptyState";

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="پرسشی در این دسته یافت نشد"
        description="دسته دیگری را انتخاب کنید یا همه پرسش‌ها را ببینید."
      />
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full rounded-lg border bg-card px-4">
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id} className="last:border-0">
          <AccordionTrigger className="text-start leading-6">{item.question}</AccordionTrigger>
          <AccordionContent className="leading-8 text-foreground">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default FaqAccordion;
