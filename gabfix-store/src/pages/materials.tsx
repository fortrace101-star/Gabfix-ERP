import { useState } from "react";
import { X } from "lucide-react";
import { DataTable, type Column } from "@/components/store/DataTable";
import { KpiCard, KpiStrip } from "@/components/store/KpiCard";
import { PageHeader } from "@/components/store/PageHeader";
import { StatusBadge } from "@/components/store/StatusBadge";
import { StoreButton } from "@/components/store/StoreButton";
import {
  compactCurrency,
  currency,
  lowStockItems,
  materials,
  movements,
  stockStatus,
  stockValuation,
  type Material,
} from "@/lib/store-data";
import { useDocumentTitle } from "@/lib/use-document-title";

function MaterialsPage() {
  useDocumentTitle(
    "Contract materials — Gabfix Store",
    "On-hand stock, issue-to-job movements, reorder levels and valuation for Gabfix contract materials.",
  );
  const [selected, setSelected] = useState<Material | null>(null);

  const columns: Column<Material>[] = [
    {
      key: "name",
      header: "Material",
      cell: (m) => (
        <div>
          <p className="font-medium text-foreground">{m.name}</p>
          <p className="text-xs text-muted-foreground">
            {m.code} · {m.location}
          </p>
        </div>
      ),
      sortValue: (m) => m.name,
      search: (m) => `${m.name} ${m.code} ${m.supplier}`,
    },
    {
      key: "category",
      header: "Category",
      cell: (m) => <span className="text-muted-foreground">{m.category}</span>,
      sortValue: (m) => m.category,
      search: (m) => m.category,
    },
    {
      key: "onHand",
      header: "On hand",
      align: "right",
      cell: (m) => (
        <span className="font-medium">
          {m.onHand} <span className="text-xs text-muted-foreground">{m.unit}</span>
        </span>
      ),
      sortValue: (m) => m.onHand,
    },
    {
      key: "reorder",
      header: "Reorder at",
      align: "right",
      cell: (m) => <span className="text-muted-foreground">{m.reorderLevel}</span>,
      sortValue: (m) => m.reorderLevel,
    },
    {
      key: "status",
      header: "Status",
      cell: (m) => <StatusBadge label={stockStatus(m)} />,
      sortValue: (m) => stockStatus(m),
      search: (m) => stockStatus(m),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (m) => <span className="font-medium">{compactCurrency(m.onHand * m.unitCost)}</span>,
      sortValue: (m) => m.onHand * m.unitCost,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Store"
        title="Contract materials"
        description="Receive goods, issue to jobs and adjust movements. Purchase orders and valuations post through the Admin Console."
        actions={
          <>
            <StoreButton variant="outline">Goods received</StoreButton>
            <StoreButton variant="gold">Restock request</StoreButton>
            <StoreButton variant="primary">Issue to job</StoreButton>
          </>
        }
      />

      <KpiStrip>
        <KpiCard
          label="Lines on hand"
          value={String(materials.length)}
          hint="Across 7 categories"
        />
        <KpiCard
          label="Stock valuation"
          value={compactCurrency(stockValuation)}
          hint="At last unit cost"
        />
        <KpiCard
          label="Below reorder"
          value={String(lowStockItems.length)}
          hint="Raise a restock request"
          delta="2 critical"
          deltaTone="negative"
        />
        <KpiCard
          label="Movements this week"
          value={String(movements.length)}
          hint="Received, issued, adjusted"
        />
      </KpiStrip>

      <DataTable
        columns={columns}
        rows={materials}
        searchPlaceholder="Search material, code or supplier..."
        onRowClick={setSelected}
        actions={<StoreButton variant="ghost">Filters</StoreButton>}
      />

      {selected ? (
        <>
          <button
            aria-label="Close details"
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 bg-foreground/30"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-card">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-foreground">
                  {selected.code}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selected.category} · {selected.location}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border">
              <Detail label="On hand" value={`${selected.onHand} ${selected.unit}`} />
              <Detail label="Reorder level" value={String(selected.reorderLevel)} />
              <Detail label="Unit cost" value={currency(selected.unitCost)} />
              <Detail label="Line value" value={currency(selected.onHand * selected.unitCost)} />
            </div>

            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Supplier
              </p>
              <p className="mt-1 text-sm text-foreground">{selected.supplier}</p>
            </div>

            <div className="flex-1 overflow-y-auto border-t border-border px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Movement timeline
              </p>
              <ol className="mt-3 space-y-4">
                {movements
                  .filter((mv) => mv.materialCode === selected.code)
                  .map((mv) => (
                    <li key={mv.id} className="relative pl-5">
                      <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" />
                      <span className="absolute left-[3px] top-4 h-full w-px bg-border" />
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge label={mv.type} />
                        <span className="tabular text-sm font-semibold">
                          {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{mv.job}</p>
                      <p className="text-xs text-muted-foreground">
                        {mv.date} · {mv.by}
                      </p>
                    </li>
                  ))}
                {movements.filter((mv) => mv.materialCode === selected.code).length === 0 ? (
                  <li className="text-sm text-muted-foreground">No movements recorded yet.</li>
                ) : null}
              </ol>
            </div>

            <div className="flex gap-2 border-t border-border px-5 py-4">
              <StoreButton variant="primary" className="flex-1">
                Issue to job
              </StoreButton>
              <StoreButton variant="outline" className="flex-1">
                Adjust stock
              </StoreButton>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default MaterialsPage;
