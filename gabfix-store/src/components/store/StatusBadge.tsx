import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        success: "border-primary/25 bg-primary-soft text-accent-foreground",
        gold: "border-gold/40 bg-gold-soft text-gold-foreground",
        warning: "border-warning/40 bg-gold-soft text-warning-foreground",
        danger: "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border bg-surface text-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badge>["tone"]>;

const toneMap: Record<string, BadgeTone> = {
  healthy: "success",
  low: "warning",
  critical: "danger",
  out: "danger",
  Approved: "success",
  Received: "success",
  "In store": "success",
  Good: "success",
  Preferred: "success",
  Quarantined: "warning",
  "Pending approval": "warning",
  Overdue: "danger",
  Rejected: "danger",
  "Needs repair": "danger",
  Issued: "gold",
  "Checked out": "gold",
  Fair: "gold",
  Watchlist: "gold",
  "In repair": "neutral",
  Draft: "neutral",
  Adjustment: "neutral",
  Return: "neutral",
};

export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  const resolved = tone ?? toneMap[label] ?? "outline";
  return (
    <span className={cn(badge({ tone: resolved }), className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
