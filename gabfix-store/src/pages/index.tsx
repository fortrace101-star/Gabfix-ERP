import { Link } from "react-router-dom";
import { useState } from "react";
import { AlertTriangle, Boxes, Fuel, Wrench } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, KpiStrip } from "@/components/store/KpiCard";
import { PageHeader } from "@/components/store/PageHeader";
import { StatusBadge } from "@/components/store/StatusBadge";
import { StoreButton } from "@/components/store/StoreButton";
import { compactCurrency, currency, stockStatus } from "@/lib/store-data";
import { useDerived, storeMutations } from "@/lib/workspace";
import { MovementModal } from "@/components/store/StoreModals";
import { useDocumentTitle } from "@/lib/use-document-title";

function Overview() {
  useDocumentTitle(
    "Store overview — Gabfix Store",
    "Live stock valuation, low-stock alerts, tool check-outs and quarantined running costs for Gabfix Home Solutions.",
  );
    const { ws, stockValuation, lowStockItems, toolsOut, quarantinedSpend, throughput } = useDerived();
  const movements = ws.movements;
  const [movementOpen, setMovementOpen] = useState(false);
  void storeMutations;

  if (ws.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading store data">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    );
  }
  if (ws.error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        Could not load store data: {ws.error}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Monday, 28 September"
        title="Store overview"
        description="On-hand quantities, valuation and running costs across the Gabfix contract store."
        actions={
          <>
            <StoreButton variant="outline">Export stock list</StoreButton>
            <StoreButton variant="primary" onClick={() => setMovementOpen(true)}>
              + New movement
            </StoreButton>
            <MovementModal
              open={movementOpen}
              onClose={() => setMovementOpen(false)}
              items={ws.materials}
              onSubmit={async (input) => {
                await storeMutations.createMovement(input);
              }}
            />
          </>
        }
      />

      <KpiStrip>
        <KpiCard
          label="Stock valuation"
          value={compactCurrency(stockValuation)}
          hint={`${ws.materials.length} material lines on hand`}
          delta="+6.4%"
          icon={Boxes}
        />
        <KpiCard
          label="Low / out of stock"
          value={String(lowStockItems.length)}
          hint="Needs restock request"
          delta="2 critical"
          deltaTone="negative"
          icon={AlertTriangle}
        />
        <KpiCard
          label="Tools out"
          value={`${toolsOut.length} / ${ws.tools.length}`}
          hint="Checked out or overdue"
          icon={Wrench}
        />
        <KpiCard
          label="Costs awaiting approval"
          value={compactCurrency(quarantinedSpend)}
          hint="Quarantined until Admin posts"
          delta="3 slips"
          deltaTone="neutral"
          icon={Fuel}
        />
      </KpiStrip>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Weekly movement volume</h2>
              <p className="text-sm text-muted-foreground">Lines received vs issued to jobs</p>
            </div>
            <StatusBadge label="Last 7 weeks" tone="outline" />
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="fillReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillIssued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-popover)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Received"
                  stroke="var(--color-chart-1)"
                  fill="url(#fillReceived)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="issued"
                  name="Issued"
                  stroke="var(--color-chart-2)"
                  fill="url(#fillIssued)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Restock watchlist</h2>
              <p className="text-sm text-muted-foreground">Below reorder level</p>
            </div>
            <Link to="/materials" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {lowStockItems.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.onHand} {m.unit} · reorder at {m.reorderLevel}
                  </p>
                </div>
                <StatusBadge label={stockStatus(m)} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Recent movements</h2>
            <Link to="/reports" className="text-xs font-semibold text-primary hover:underline">
              Movement ledger
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {movements.slice(0, 6).map((mv) => (
              <li key={mv.id} className="flex items-center gap-4 px-5 py-3">
                <StatusBadge label={mv.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{mv.material}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {mv.job} · {mv.by}
                  </p>
                </div>
                <span className="tabular text-sm font-semibold text-foreground">
                  {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">{mv.date}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Tools in the field</h2>
            <p className="text-sm text-muted-foreground">Check-outs and due-back dates</p>
          </div>
          <ul className="divide-y divide-border">
            {toolsOut.map((t) => (
              <li key={t.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                  <StatusBadge label={t.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.holder} · due {t.dueBack}
                </p>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {toolsOut.length} {toolsOut.length === 1 ? "tool" : "tools"} on loan
          </div>
        </div>
      </div>
    </>
  );
}

export default Overview;
