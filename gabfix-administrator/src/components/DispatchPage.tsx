import { useState } from "react";
import { Plus } from "lucide-react";
import { AdminModal, AdminPage, adminFieldLabel, adminInputClass } from "@/components/AdminPage";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useWorkspaceData, useWorkspaceSse, type Workspace } from "@/lib/workspace-data";

const money = (v: number) => `UGX ${Math.round(v).toLocaleString("en-UG")}`;

export function DispatchPage({ onBack }: { onBack?: () => void }) {
  const { data, error, refresh } = useWorkspaceData();
  useWorkspaceSse(refresh);
  const [modal, setModal] = useState<"job" | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function createJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setFormError("");
    try {
      await apiClient.request("/jobs", {
        method: "POST",
        body: JSON.stringify({
          customerId: String(fd.get("customerId")),
          serviceId: String(fd.get("serviceId")),
          date: String(fd.get("date")),
          status: "Scheduled",
          revenue: Number(fd.get("revenue") || 0),
        }),
      });
      setModal(null);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create job");
    } finally {
      setSaving(false);
    }
  }

  async function advance(job: Workspace["jobs"][number], status: string) {
    await apiClient.request(`/jobs/${job.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  return (
    <AdminPage
      title="Dispatch board"
      subtitle="All jobs, crews, and lifecycle state across the field"
      onBack={onBack}
      loading={!data}
      error={error}
      actions={
        <Button size="sm" onClick={() => setModal("job")}>
          <Plus /> New job
        </Button>
      }
    >
      <div className="space-y-3">
        {(data?.jobs ?? []).map((job) => {
          const customer = data?.customers.find((c) => c.id === job.customerId)?.name ?? "—";
          const service = data?.services.find((s) => s.id === job.serviceId)?.name ?? "—";
          return (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {job.number} · {service}
                </p>
                <p className="text-xs text-muted-foreground">
                  {customer} · {job.date} · {job.assignees.join(", ") || "unassigned"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{money(job.revenue)}</span>
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">{job.status}</span>
                {job.status === "Scheduled" && (
                  <Button size="sm" variant="outline" onClick={() => advance(job, "In Progress")}>
                    Start
                  </Button>
                )}
                {job.status === "In Progress" && (
                  <Button size="sm" variant="outline" onClick={() => advance(job, "Completed")}>
                    Complete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {data && data.jobs.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No jobs yet — create the first one.</p>
        )}
      </div>

      <AdminModal
        open={modal === "job"}
        title="New job"
        description="Scheduled jobs appear on the dispatch board and the customer statement."
        onClose={() => setModal(null)}
      >
        <form onSubmit={createJob} className="space-y-4">
          <label className="block space-y-2">
            <span className={adminFieldLabel}>Customer</span>
            <select name="customerId" required className={adminInputClass}>
              {(data?.customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className={adminFieldLabel}>Service</span>
            <select name="serviceId" required className={adminInputClass}>
              {(data?.services ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {money(s.price)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className={adminFieldLabel}>Date</span>
              <input name="date" type="date" required className={adminInputClass} />
            </label>
            <label className="block space-y-2">
              <span className={adminFieldLabel}>Revenue (UGX)</span>
              <input name="revenue" type="number" min="0" className={adminInputClass} />
            </label>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button className="w-full" disabled={saving}>
            {saving ? "Creating…" : "Create job"}
          </Button>
        </form>
      </AdminModal>
    </AdminPage>
  );
}
