"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { faqCategories, type FaqCategory } from "@/content/faq";

interface FaqCategoryPickerProps {
  value: FaqCategory;
  onChange: (cat: FaqCategory) => void;
}

export function FaqCategoryPicker({ value, onChange }: FaqCategoryPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="دسته‌بندی پرسش‌ها">
      {faqCategories.map((cat) => {
        const active = value === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-pressed={active}
            className={cn("rounded-full transition-colors")}
          >
            <Badge
              variant={active ? "default" : "secondary"}
              className={cn(
                "cursor-pointer select-none px-3 py-1 text-xs",
                active ? "bg-primary text-primary-foreground" : ""
              )}
            >
              {cat}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

export default FaqCategoryPicker;
