import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const storeButton = cva(
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        gold: "bg-gold text-gold-foreground hover:bg-gold/90",
        outline: "border border-input bg-surface text-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export function StoreButton({
  className,
  variant,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof storeButton>) {
  return <button className={cn(storeButton({ variant }), className)} {...props} />;
}
