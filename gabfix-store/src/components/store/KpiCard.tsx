import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaTone = "positive",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-3 bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon ? <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} /> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="tabular text-2xl font-semibold leading-none text-foreground">{value}</span>
        {delta ? (
          <span
            className={cn(
              "tabular text-xs font-semibold",
              deltaTone === "positive" && "text-primary",
              deltaTone === "negative" && "text-destructive",
              deltaTone === "neutral" && "text-muted-foreground",
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 [&>*]:border-border sm:[&>*:nth-child(n+3)]:border-t sm:[&>*:nth-child(even)]:border-l lg:[&>*:nth-child(n+3)]:border-t-0 lg:[&>*+*]:border-l">
      {children}
    </div>
  );
}
