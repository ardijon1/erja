import { cn } from "@/lib/utils";

/**
 * موتیف «مهر اعتماد» — نشان هندسی برنزی شبیه مهر روی سند رسمی.
 * به‌عنوان واترمارک با opacity کم (۴–۶٪) استفاده می‌شود؛ تزئین معنادار برند.
 */
export function SealMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      className={cn("text-primary", className)}
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="9" stroke="currentColor" strokeWidth="2.5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const x1 = 50 + 16 * Math.cos(a);
        const y1 = 50 + 16 * Math.sin(a);
        const x2 = 50 + 34 * Math.cos(a);
        const y2 = 50 + 34 * Math.sin(a);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="2.5"
          />
        );
      })}
    </svg>
  );
}

export default SealMark;
