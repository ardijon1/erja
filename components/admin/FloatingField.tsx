"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  as?: "input" | "textarea";
  textareaRows?: number;
  ref?: React.Ref<HTMLInputElement>;
}

const baseClasses =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function FloatingField({ label, className, as = "input", textareaRows, id, ref, ...props }: FloatingFieldProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  // Merge react-hook-form's ref callback with internal ref for textarea
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mergedTextareaRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === "function") ref(node as unknown as HTMLInputElement);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node as unknown as HTMLInputElement;
    },
    [ref],
  );

  if (as === "textarea") {
    return (
      <div className="ff-ctl relative">
        <textarea
          ref={mergedTextareaRef}
          id={inputId}
          rows={textareaRows}
          placeholder=" "
          className={cn(baseClasses, "peer min-h-20 h-auto pt-5 pb-1", className)}
        />
        <label htmlFor={inputId} className="ff-lbl">
          {label}
        </label>
      </div>
    );
  }

  return (
    <div className="ff-ctl relative">
      <input
        ref={ref}
        id={inputId}
        placeholder=" "
        className={cn(baseClasses, "peer h-10", className)}
        {...props}
      />
      <label htmlFor={inputId} className="ff-lbl">
        {label}
      </label>
    </div>
  );
}
