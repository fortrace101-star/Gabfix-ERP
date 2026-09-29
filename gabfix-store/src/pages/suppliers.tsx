import { DataTable, type Column } from "@/components/store/DataTable";
import { KpiCard, KpiStrip } from "@/components/store/KpiCard";
import { PageHeader } from "@/components/store/PageHeader";
import { StatusBadge } from "@/components/store/StatusBadge";
import { StoreButton } from "@/components/store/StoreButton";
import { compactCurrency, currency, type PurchaseRequest, type Supplier } from "@/lib/store-data";
import { useDocumentTitle } from "@/lib/use-document-title";
import { useState } from "react";
import { storeMutations, useWorkspace } from "@/lib/workspace";
import { PurchaseRequestModal } from "@/components/store/StoreModals";

const requestColumns: Column<PurchaseRequest>[] = [
  {
    key: "material",
    header: "Material",
    cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.material}</p>
        <p className="text-xs text-muted-foreground">Qty {r.qty}</p>
      </div>
    ),
    sortValue: (r) => r.material,
    search: (r) => r.material,
  },
  {
    key: "supplier",
    header: "Supplier",
    cell: (r) => <span className="text-muted-foreground">{r.supplier}</span>,
    sortValue: (r) => r.supplier,
    search: (r) => r.supplier,
  },
  {
    key: "raised",
    header: "Raised by",
    cell: (r) => (
      <div>
        <p className="text-foreground">{r.raisedBy}</p>
        <p className="tabular text-xs text-muted-foreground">{r.date}</p>
      </div>
    ),
    sortValue: (r) => r.date,
    search: (r) => r.raisedBy,
  },
  {
    key: "value",
    header: "Value",
    align: "right",
    cell: (r) => <span className="font-medium">{currency(r.value)}</span>,
    sortValue: (r) => r.value,
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => <StatusBadge label={r.status} />,
    sortValue: (r) => r.status,
    search: (r) => r.status,
  },
];

const supplierColumns: Column<Supplier>[] = [
  {
    key: "name",
    header: "Supplier",
    cell: (s) => (
      <div>
        <p className="font-medium text-foreground">{s.name}</p>
        <p className="text-xs text-muted-foreground">{s.categories}</p>
      </div>
    ),
    sortValue: (s) => s.name,
    search: (s) => `${s.name} ${s.categories}`,
  },
  {
    key: "contact",
    header: "Contact",
    cell: (s) => (
      <div>
        <p className="text-foreground">{s.contact}</p>
        <p className="text-xs text-muted-foreground">{s.phone}</p>
      </div>
    ),
    search: (s) => `${s.contact} ${s.phone}`,
  },
  {
    key: "spend",
    header: "Spend YTD",
    align: "right",
    cell: (s) => <span className="font-medium">{compactCurrency(s.spendYtd)}</span>,
    sortValue: (s) => s.spendYtd,
  },
  {
    key: "rating",
    header: "Rating",
    cell: (s) => <StatusBadge label={s.rating} />,
    sortValue: (s) => s.rating,
    search: (s) => s.rating,
  },
];

function SuppliersPage() {
  useDocumentTitle(
    "Suppliers & requests — Gabfix Store",
    "Supplier master list, year-to-date spend and the status of restock and purchase requests awaiting Admin approval.",
  );
  const ws = useWorkspace();
  const purchaseRequests = ws.purchaseRequests;
  const suppliers = ws.suppliers;
  const pending = purchaseRequests.filter((r) => r.status === "Pending approval");
  const pendingValue = pending.reduce((s, r) => s + r.value, 0);
  const spend = suppliers.reduce((s, x) => s + x.spendYtd, 0);
  const [prOpen, setPrOpen] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Supply chain"
        title="Suppliers & purchase requests"
        description="Raise restock requests against the supplier master. Purchase orders, the supplier master and journal posting are approved in the Admin Console."
        actions={
          <>
            <StoreButton variant="outline">Export supplier list</StoreButton>
            <StoreButton variant="primary" onClick={() => setPrOpen(true)}>
              New request
            </StoreButton>
          </>
        }
      />

      <KpiStrip>
        <KpiCard label="Active suppliers" value={String(suppliers.length)} hint="2 preferred" />
        <KpiCard label="Spend year to date" value={compactCurrency(spend)} hint="All categories" />
        <KpiCard
          label="Requests pending"
          value={String(pending.length)}
          hint="Awaiting Admin approval"
          delta="Admin review"
          deltaTone="neutral"
        />
        <KpiCard
          label="Value pending"
          value={compactCurrency(pendingValue)}
          hint="If all approved"
        />
      </KpiStrip>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Restock & purchase requests</h2>
        <DataTable
          columns={requestColumns}
          rows={purchaseRequests}
          searchPlaceholder="Search request, supplier or status..."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Supplier list</h2>
        <DataTable
          columns={supplierColumns}
          rows={suppliers}
          searchPlaceholder="Search supplier, contact or category..."
        />
      </section>

      <PurchaseRequestModal
        open={prOpen}
        onClose={() => setPrOpen(false)}
        items={ws.materials}
        onSubmit={async (input) => {
          await storeMutations.createPurchaseRequest(input);
        }}
      />
    </>
  );
}

export default SuppliersPage;
