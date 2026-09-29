import { useState } from "react";
import { Plus } from "lucide-react";
import { AdminModal, AdminPage, adminFieldLabel, adminInputClass } from "@/components/AdminPage";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useWorkspaceData, useWorkspaceSse } from "@/lib/workspace-data";

const money = (v: number) => `UGX ${Math.round(v).toLocaleString("en-UG")}`;

export function FinancePage({ onBack }: { onBack?: () => void }) {
  const { data, error, refresh } = useWorkspaceData();
  useWorkspaceSse(refresh);
  const [modal, setModal] = useState<"payment" | "expense" | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const arTotal = (data?.invoices ?? [])
    .filter((i) => i.status !== "Paid")
    .reduce((sum, i) => sum + (i.total - i.paid), 0);
  const revenue = (data?.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const expenses = (data?.expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  async function submitPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setFormError("");
    try {
      await apiClient.request("/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: String(fd.get("invoiceId")),
          amount: Number(fd.get("amount")),
          methodId: String(fd.get("methodId") || "") || null,
          reference: String(fd.get("reference") || ""),
        }),
      });
      setModal(null);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  async function submitExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setFormError("");
    try {
      await apiClient.request("/expenses", {
        method: "POST",
        body: JSON.stringify({
          category: String(fd.get("category")),
          description: String(fd.get("description")),
          amount: Number(fd.get("amount")),
          date: String(fd.get("date")),
          division: String(fd.get("division") || "operations"),
        }),
      });
      setModal(null);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Expense failed");
    } finally {
      setSaving(false);
    }
  }

  const unpaid = (data?.invoices ?? []).filter((i) => i.status !== "Paid");

  return (
    <AdminPage
      title="Finance"
      subtitle="Payments, receivables, and expenses — double-entry in one ledger"
      onBack={onBack}
      loading={!data}
      error={error}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => setModal("expense")}>
            <Plus /> Expense
          </Button>
          <Button size="sm" onClick={() => setModal("payment")}>
            <Plus /> Record payment
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        <div className="bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Cash in (payments)</p>
          <p className="mt-2 text-2xl font-semibold">{money(revenue)}</p>
        </div>
        <div className="bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Open receivables</p>
          <p className="mt-2 text-2xl font-semibold">{money(arTotal)}</p>
        </div>
        <div className="bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Expenses</p>
          <p className="mt-2 text-2xl font-semibold">{money(expenses)}</p>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold">Invoices</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {(data?.invoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{inv.number}</td>
                  <td className="px-4 py-3">{inv.status}</td>
                  <td className="px-4 py-3 text-right">{money(inv.total)}</td>
                  <td className="px-4 py-3 text-right">{money(inv.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Payments</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.payments ?? []).slice(0, 10).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{p.number}</td>
                  <td className="px-4 py-3">{p.receivedAt?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminModal open={modal === "payment"} title="Record payment" description="Posts through the double-entry ledger." onClose={() => setModal(null)}>
        <form onSubmit={submitPayment} className="space-y-4">
          <label className="block space-y-2">
            <span className={adminFieldLabel}>Invoice</span>
            <select name="invoiceId" required className={adminInputClass}>
              {unpaid.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} · balance {money(inv.total - inv.paid)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className={adminFieldLabel}>Amount (UGX)</span>
              <input name="amount" type="number" min="1" required className={adminInputClass} />
            </label>
            <label className="block space-y-2">
              <span className={adminFieldLabel}>Reference</span>
              <input name="reference" className={adminInputClass} placeholder="Receipt no." />
            </label>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button className="w-full" disabled={saving}>
            {saving ? "Posting…" : "Post payment"}
          </Button>
        </form>
      </AdminModal>

      <AdminModal open={modal === "expense"} title="New expense" onClose={() => setModal(null)}>
        <form onSubmit={submitExpense} className="space-y-4">
          <label className="block space-y-2">
            <span className={adminFieldLabel}>Category</span>
            <select name="category" required className={adminInputClass}>
              <option>Consumables</option>
              <option>Fuel</option>
              <option>Maintenance</option>
              <option>Rent</option>
              <option>Utilities</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className={adminFieldLabel}>Description</span>
            <input name="description" required className={adminInputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className={adminFieldLabel}>Amount (UGX)</span>
              <input name="amount" type="number" min="1" required className={adminInputClass} />
            </label>
            <label className="block space-y-2">
              <span className={adminFieldLabel}>Date</span>
              <input name="date" type="date" required className={adminInputClass} />
            </label>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Save expense"}
          </Button>
        </form>
      </AdminModal>
    </AdminPage>
  );
}
