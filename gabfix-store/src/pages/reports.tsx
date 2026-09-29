import { FileText } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable, type Column } from "@/components/store/DataTable";
import { KpiCard, KpiStrip } from "@/components/store/KpiCard";
import { PageHeader } from "@/components/store/PageHeader";
import { StatusBadge } from "@/components/store/StatusBadge";
import { StoreButton } from "@/components/store/StoreButton";
import {
  compactCurrency,
  costPerJob,
  lowStockItems,
  movements,
  purchaseRequests,
  stockValuation,
  type Movement,
} from "@/lib/store-data";
import { useDocumentTitle } from "@/lib/use-document-title";

const ledgerColumns: Column<Movement>[] = [
  {
    key: "date",
    header: "Date",
    cell: (m) => <span className="tabular text-muted-foreground">{m.date}</span>,
    sortValue: (m) => m.date,
    search: (m) => m.date,
  },
  {
    key: "material",
    header: "Material",
    cell: (m) => (
      <div>
        <p className="font-medium text-foreground">{m.material}</p>
        <p className="text-xs text-muted-foreground">{m.materialCode}</p>
      </div>
    ),
    sortValue: (m) => m.material,
    search: (m) => `${m.material} ${m.materialCode}`,
  },
  {
    key: "type",
    header: "Type",
    cell: (m) => <StatusBadge label={m.type} />,
    sortValue: (m) => m.type,
    search: (m) => m.type,
  },
  {
    key: "job",
    header: "Job / reference",
    cell: (m) => <span className="text-muted-foreground">{m.job}</span>,
    search: (m) => m.job,
  },
  {
    key: "by",
    header: "By",
    cell: (m) => <span className="text-muted-foreground">{m.by}</span>,
    search: (m) => m.by,
  },
  {
    key: "qty",
    header: "Qty",
    align: "right",
    cell: (m) => (
      <span className={m.qty < 0 ? "font-medium text-destructive" : "font-medium text-primary"}>
        {m.qty > 0 ? `+${m.qty}` : m.qty}
      </span>
    ),
    sortValue: (m) => m.qty,
  },
];

const documents = [
  { id: "d1", name: "Goods received note", hint: "GRN-0421 · Tilemart Nakawa" },
  { id: "d2", name: "Materials issued slip", hint: "JOB-1184 · Ntinda villa" },
  { id: "d3", name: "Stock list & valuation", hint: "As at 28 September 2026" },
  { id: "d4", name: "Low stock report", hint: `${lowStockItems.length} lines below reorder` },
  { id: "d5", name: "Expense slip pack", hint: "Utilities awaiting approval" },
  { id: "d6", name: "Request status report", hint: `${purchaseRequests.length} requests` },
];

function ReportsPage() {
  useDocumentTitle(
    "Reports & documents — Gabfix Store",
    "Movement ledger, low-stock and request status reports, plus goods-received, issue and expense slip documents for Gabfix Store.",
  );

  return (
    <>
      <PageHeader
        eyebrow="Reporting"
        title="Reports & documents"
        description="Stock list, movement ledger, low-stock and request status. Valuation, cost-per-job and supplier spend also feed the Admin Console."
        actions={
          <>
            <StoreButton variant="outline">Choose period</StoreButton>
            <StoreButton variant="primary">Export PDF</StoreButton>
          </>
        }
      />

      <KpiStrip>
        <KpiCard
          label="Stock valuation"
          value={compactCurrency(stockValuation)}
          hint="Closing balance"
        />
        <KpiCard label="Movements logged" value={String(movements.length)} hint="This week" />
        <KpiCard
          label="Low-stock lines"
          value={String(lowStockItems.length)}
          hint="Below reorder level"
        />
        <KpiCard
          label="Requests open"
          value={String(purchaseRequests.filter((r) => r.status !== "Approved").length)}
          hint="Draft, pending or rejected"
        />
      </KpiStrip>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Cost per job (UGX millions)</h2>
          <p className="text-sm text-muted-foreground">Materials issued vs utilities recharged</p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costPerJob} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="job"
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
                <Bar
                  dataKey="materials"
                  name="Materials"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="utilities"
                  name="Utilities"
                  fill="var(--color-chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Store documents</h2>
            <p className="text-sm text-muted-foreground">Printable slips and reports</p>
          </div>
          <ul className="divide-y divide-border">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="size-4 text-muted-foreground" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.hint}</p>
                </div>
                <StoreButton variant="ghost" className="h-8 px-2 text-xs">
                  PDF
                </StoreButton>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Movement ledger</h2>
        <DataTable
          columns={ledgerColumns}
          rows={movements}
          searchPlaceholder="Search material, job, staff or type..."
        />
      </section>
    </>
  );
}

export default ReportsPage;
