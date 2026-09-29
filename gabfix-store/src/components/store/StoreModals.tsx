import { useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { StoreButton } from "@/components/store/StoreButton";

/** Shared modal shell — all store CRUD happens in modals (design rule). */
export function StoreModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

const field = "block space-y-1.5";
const fieldLabel = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const inputClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-hidden transition focus:border-ring focus:ring-2 focus:ring-ring/20";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={field}>
      <span className={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

export const inputClasses = inputClass;

/** New stock movement (receive / issue / adjust / return). */
export function MovementModal({
  open,
  onClose,
  onSubmit,
  items,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { itemId: string; type: "Received" | "Issued" | "Adjustment" | "Return"; qty: number; reference: string }) => Promise<void>;
  items: Array<{ id: string; name: string; code: string }>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        itemId: String(fd.get("itemId")),
        type: String(fd.get("type")) as "Received" | "Issued" | "Adjustment" | "Return",
        qty: Number(fd.get("qty")),
        reference: String(fd.get("reference") ?? ""),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Movement failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StoreModal
      open={open}
      title="New stock movement"
      description="Received/Return add stock; Issued/Adjustment use negative quantities."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Material">
          <select name="itemId" required className={inputClass}>
            {items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} · {m.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select name="type" className={inputClass} defaultValue="Received">
              <option>Received</option>
              <option>Issued</option>
              <option>Adjustment</option>
              <option>Return</option>
            </select>
          </Field>
          <Field label="Quantity">
            <input name="qty" type="number" step="any" required className={inputClass} placeholder="e.g. -12 or 40" />
          </Field>
        </div>
        <Field label="Reference (GRN / job)">
          <input name="reference" className={inputClass} placeholder="GRN-00422 or JOB-00184 · Ntinda" />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <StoreButton type="submit" variant="primary" className="w-full" disabled={saving}>
          {saving ? "Posting…" : "Post movement"}
        </StoreButton>
      </form>
    </StoreModal>
  );
}

/** Raise a purchase request → arrives at the Admin Console for approval. */
export function PurchaseRequestModal({
  open,
  onClose,
  onSubmit,
  items,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { itemId: string; description: string; qty: number; value: number }) => Promise<void>;
  items: Array<{ id: string; name: string; code: string; unitCost: number }>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        itemId: String(fd.get("itemId")),
        description: String(fd.get("description")),
        qty: Number(fd.get("qty")),
        value: Number(fd.get("value")),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StoreModal
      open={open}
      title="New purchase request"
      description="Sent to the Admin Console for approval."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Material">
          <select name="itemId" required className={inputClass}>
            {items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} · {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <input name="description" required className={inputClass} placeholder="What and why" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input name="qty" type="number" min="1" required className={inputClass} />
          </Field>
          <Field label="Value (UGX)">
            <input name="value" type="number" min="0" required className={inputClass} />
          </Field>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <StoreButton type="submit" variant="primary" className="w-full" disabled={saving}>
          {saving ? "Sending…" : "Send request"}
        </StoreButton>
      </form>
    </StoreModal>
  );
}

/** Meter / slip capture — lands Quarantined until Admin posts it to expenses. */
export function UtilityModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { type: string; reference: string; reading: string; amount: number; categoryKind: "direct" | "operations" }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        type: String(fd.get("type")),
        reference: String(fd.get("reference")),
        reading: String(fd.get("reading") ?? ""),
        amount: Number(fd.get("amount")),
        categoryKind: String(fd.get("categoryKind")) as "direct" | "operations",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StoreModal
      open={open}
      title="Capture utility / cost"
      description="Quarantined until Admin posts it to the ledger."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select name="type" className={inputClass}>
              <option>Fuel</option>
              <option>Power</option>
              <option>Water</option>
              <option>Transport</option>
              <option>Maintenance</option>
            </select>
          </Field>
          <Field label="Category">
            <select name="categoryKind" className={inputClass}>
              <option value="direct">1 · Direct job cost</option>
              <option value="operations">4 · Operations</option>
            </select>
          </Field>
        </div>
        <Field label="Reference">
          <input name="reference" required className={inputClass} placeholder="Shell Ntinda · 441882" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reading">
            <input name="reading" className={inputClass} placeholder="42.5 L" />
          </Field>
          <Field label="Amount (UGX)">
            <input name="amount" type="number" min="0" required className={inputClass} />
          </Field>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <StoreButton type="submit" variant="primary" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Capture"}
        </StoreButton>
      </form>
    </StoreModal>
  );
}

/** Tool check-out / check-in. */
export function ToolModal({
  open,
  onClose,
  onSubmit,
  tool,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (patch: { status: string; holderName: string | null; jobLabel: string | null; dueBack: string | null }) => Promise<void>;
  tool: { id: string; name: string; code: string; status: string } | null;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const checkingOut = tool?.status === "In store";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        status: checkingOut ? "Checked out" : "In store",
        holderName: checkingOut ? String(fd.get("holderName") || "") : null,
        jobLabel: checkingOut ? String(fd.get("jobLabel") || "") : null,
        dueBack: checkingOut ? String(fd.get("dueBack") || "") : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StoreModal
      open={open && Boolean(tool)}
      title={checkingOut ? "Check out tool" : "Check in tool"}
      description={tool ? `${tool.code} · ${tool.name}` : ""}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {checkingOut ? (
          <>
            <Field label="Holder">
              <input name="holderName" required className={inputClass} placeholder="Who takes it" />
            </Field>
            <Field label="Job">
              <input name="jobLabel" className={inputClass} placeholder="JOB-00184 · Ntinda villa" />
            </Field>
            <Field label="Due back">
              <input name="dueBack" type="date" className={inputClass} />
            </Field>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Returning this tool to the store clears its holder and due-back date.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <StoreButton type="submit" variant="primary" className="w-full" disabled={saving}>
          {saving ? "Saving…" : checkingOut ? "Check out" : "Check in"}
        </StoreButton>
      </form>
    </StoreModal>
  );
}
