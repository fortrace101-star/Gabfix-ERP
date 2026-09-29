import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  Fuel,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  Truck,
  Wrench,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lowStockItems, purchaseRequests, utilityEntries } from "@/lib/store-data";

const groups = [
  {
    label: "Store",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, badge: null },
      {
        to: "/materials",
        label: "Contract materials",
        icon: Package,
        badge: lowStockItems.length,
      },
      { to: "/tools", label: "Tools & equipment", icon: Wrench, badge: null },
      {
        to: "/utilities",
        label: "Utilities & costs",
        icon: Fuel,
        badge: utilityEntries.filter((u) => u.status === "Quarantined").length,
      },
    ],
  },
  {
    label: "Supply chain",
    items: [
      {
        to: "/suppliers",
        label: "Suppliers & requests",
        icon: Truck,
        badge: purchaseRequests.filter((p) => p.status === "Pending approval").length,
      },
      { to: "/reports", label: "Reports", icon: FileBarChart, badge: null },
    ],
  },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {open ? (
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
          <img src="/gabfix-logo.png" alt="Gabfix" className="size-9 rounded-md" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-sidebar-foreground">Gabfix</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Store & Utilities
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Hide navigation"
            className="ml-auto text-muted-foreground lg:hidden"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                        )
                      }
                    >
                      <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="tabular ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground">
            <Settings className="size-4" strokeWidth={1.75} />
            Settings
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="text-muted-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <label className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3">
            <Search className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <input
              placeholder="Search materials, tools, jobs..."
              className="h-full w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            />
          </label>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-primary" />
              Store PC online
            </span>
            <span className="relative text-muted-foreground">
              <Bell className="size-5" strokeWidth={1.75} />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-gold" />
            </span>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                GA
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-foreground">Grace Atim</p>
                <p className="text-[11px] text-muted-foreground">Store keeper</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
