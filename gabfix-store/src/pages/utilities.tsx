import { DataTable, type Column } from "@/components/store/DataTable";
import { KpiCard, KpiStrip } from "@/components/store/KpiCard";
import { PageHeader } from "@/components/store/PageHeader";
import { StatusBadge } from "@/components/store/StatusBadge";
import { StoreButton } from "@/components/store/StoreButton";
import { compactCurrency, currency, type UtilityEntry } from "@/lib/store-data";
import { useDocumentTitle } from "@/lib/use-document-title";
import { useState } from "react";
import { storeMutations, useWorkspace, type NewUtilityCapture } from "@/lib/workspace";
import { storeApi } from "@/lib/api";
import { UtilityModal } from "@/components/store/StoreModals";

/**
 * Download the printable slip PDF for one capture (plan v5 E5). Mirrors the
 * admin pdf helpers but vendored: the store api client already carries the
 * auth token and app id headers.
 */
async function downloadSlip(id: string): Promise<void> {
  const res = await fetch(`${storeApi.baseUrl}/documents/utility-slip/${id}.pdf`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("gabfix-store:auth-token") ?? ""}`,
      "X-App-Id": "store",
    },
  });
  if (!res.ok) throw new Error(`Slip download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `UTC-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const columns: Column<UtilityEntry>[] = [
  {
    key: "type",
    header: "Type",
    cell: (u) => <span className="font-medium text-foreground">{u.type}</span>,
    sortValue: (u) => u.type,
    search: (u) => u.type,
  },
  {
    key: "reference",
    header: "Reference / meter",
    cell: (u) => (
      <div>
        <p className="text-foreground">{u.reference}</p>
        <p className="text-xs text-muted-foreground">{u.reading}</p>
      </div>
    ),
    search: (u) => `${u.reference} ${u.reading}`,
  },
  {
    key: "category",
    header: "Cost category",
    cell: (u) => <span className="text-muted-foreground">{u.category}</span>,
    sortValue: (u) => u.category,
    search: (u) => u.category,
  },
  {
    key: "captured",
    header: "Captured by",
    cell: (u) => (
      <div>
        <p className="text-foreground">{u.capturedBy}</p>
        <p className="tabular text-xs text-muted-foreground">{u.date}</p>
      </div>
    ),
    sortValue: (u) => u.date,
    search: (u) => u.capturedBy,
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    cell: (u) => <span className="font-medium">{currency(u.amount)}</span>,
    sortValue: (u) => u.amount,
  },
  {
    key: "status",
    header: "Status",
    cell: (u) => <StatusBadge label={u.status} />,
    sortValue: (u) => u.status,
    search: (u) => u.status,
  },
];

function UtilitiesPage() {
  useDocumentTitle(
    "Utilities & running costs — Gabfix Store",
    "Capture power, water, fuel, transport and maintenance slips. Entries stay quarantined until Admin approval posts them to the P&L.",
  );
  const ws = useWorkspace();
  const utilityEntries = ws.utilities;
  const quarantinedSpend = utilityEntries
    .filter((u) => u.status === "Quarantined")
    .reduce((s, u) => s + u.amount, 0);
  const total = utilityEntries.reduce((s, u) => s + u.amount, 0);
  const jobCost = utilityEntries
    .filter((u) => u.category.startsWith("1"))
    .reduce((s, u) => s + u.amount, 0);
  const quarantined = utilityEntries.filter((u) => u.status === "Quarantined").length;
  const [capOpen, setCapOpen] = useState(false);
  const [slipBusy, setSlipBusy] = useState("");

  return (
    <>
      <PageHeader
        eyebrow="Running costs"
        title="Utilities & running costs"
        description="Capture meter readings and slips for power, water, fuel, transport and maintenance. Entries are limited to category 1 (direct job cost) and 4 (operations) and stay quarantined until the Admin Console approves and posts them."
        actions={
          <>
            <StoreButton variant="outline">Meter reading</StoreButton>
            <StoreButton variant="primary" onClick={() => setCapOpen(true)}>
              Capture slip
            </StoreButton>
          </>
        }
      />

      <KpiStrip>
        <KpiCard
          label="Captured this month"
          value={compactCurrency(total)}
          hint={`${utilityEntries.length} slips`}
        />
        <KpiCard
          label="Awaiting approval"
          value={compactCurrency(quarantinedSpend)}
          hint={`${quarantined} quarantined entries`}
          delta="Admin review"
          deltaTone="neutral"
        />
        <KpiCard
          label="Direct job cost (cat 1)"
          value={compactCurrency(jobCost)}
          hint="Recharged to jobs"
        />
        <KpiCard
          label="Operations (cat 4)"
          value={compactCurrency(total - jobCost)}
          hint="Overhead"
        />
      </KpiStrip>

      <DataTable
        columns={columns}
        rows={utilityEntries}
        searchPlaceholder="Search type, meter, category or staff..."
        actions={<StoreButton variant="ghost">Filters</StoreButton>}
      />

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Slip PDFs</h2>
          <p className="text-xs text-muted-foreground">Printable record per capture — quarantine note or ledger reference.</p>
        </div>
        <div className="divide-y divide-border">
          {utilityEntries.slice(0, 8).map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium">{u.type} · {u.reference}</p>
                <p className="text-xs text-muted-foreground">{u.date} · {currency(u.amount)} · {u.status}</p>
              </div>
              <StoreButton
                variant="outline"
                disabled={slipBusy === u.id}
                onClick={async () => {
                  setSlipBusy(u.id);
                  try {
                    await downloadSlip(u.id);
                  } catch {
                    window.alert("Could not download the slip PDF.");
                  } finally {
                    setSlipBusy("");
                  }
                }}
              >
                {slipBusy === u.id ? "Preparing…" : "Slip PDF"}
              </StoreButton>
            </div>
          ))}
          {utilityEntries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No captures yet — "Capture slip" records the first meter reading.
            </p>
          )}
        </div>
      </section>

      <UtilityModal
        open={capOpen}
        onClose={() => setCapOpen(false)}
        onSubmit={async (input) => {
          await storeMutations.createUtilityCapture({
            ...input,
            type: input.type as NewUtilityCapture["type"],
          });
        }}
      />

      <div className="rounded-xl border border-gold/40 bg-gold-soft px-5 py-4 text-sm text-gold-foreground">
        Quarantined slips do not reach the P&L until an administrator approves them. Store keepers
        can edit an entry while it is quarantined; after posting, only an admin override can change
        it.
      </div>
    </>
  );
}

export default UtilitiesPage;
