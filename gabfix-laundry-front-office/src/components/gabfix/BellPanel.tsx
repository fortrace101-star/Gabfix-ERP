import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bellAge, bellText, useBell } from "@/lib/bell";

/**
 * Bell panel (plan v5 F1/F2): live unread notifications for the laundry
 * console. Vendored per app per plan §8 — no shared source imports.
 */
export function BellPanel() {
  const { items, connected, markRead, markAll } = useBell();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={`Notifications${items.length ? ` (${items.length} unread)` : ""}`}
        title="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="relative inline-flex">
          <Bell />
          {items.length > 0 && (
            <span
              aria-hidden="true"
              className={`absolute ${
                items.length > 9
                  ? "-top-1 -right-1 size-2 rounded-full"
                  : "-top-2 -right-2 grid size-4 place-items-center rounded-full text-[10px] font-bold leading-none text-destructive-foreground"
              } bg-destructive`}
            >
              {items.length > 9 ? null : items.length}
            </span>
          )}
        </span>
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="font-semibold">Notifications</p>
            <div className="flex items-center gap-2">
              <span
                className={`size-1.5 rounded-full ${connected ? "bg-success" : "bg-muted-foreground/40"}`}
                title={connected ? "Live" : "Reconnecting…"}
              />
              {items.length > 0 && (
                <button
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => void markAll()}
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications — laundry events appear here live.
              </p>
            )}
            {items.map((item) => {
              const { title, body } = bellText(item);
              return (
                <button
                  key={item.id}
                  className="block w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40"
                  onClick={() => void markRead(item.id)}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {bellAge(item.created_at)}
                    </span>
                  </div>
                  {body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{body}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
