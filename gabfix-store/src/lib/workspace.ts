import { useEffect, useMemo, useState } from "react";
import { storeApi } from "@/lib/api";
import {
  stockStatus,
  type Material,
  type Movement,
  type PurchaseRequest,
  type Tool,
  type UtilityEntry,
  type Supplier,
} from "@/lib/store-data";

/**
 * Live-data layer (plan A6/E1): fetches GET /api/data and adapts the server's
 * DB rows onto the UI types in store-data.ts. The UI keeps its types; only the
 * data source changes.
 */

/** Raw /api/data row shapes the server returns (camelCase aliases from db.ts). */
type Workspace = {
  inventory: Array<{
    id: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    minimum: number;
    cost: number;
    code: string | null;
    location: string | null;
    kind: "contract" | "facility";
    supplierId: string | null;
  }>;
  suppliers: Array<{ id: string; name: string; phone: string; email: string; notes: string;
    contact: string | null; categories: string | null; spendYtd: number | null; rating: string | null }>;
  inventoryMovements: Array<{
    id: string;
    itemId: string;
    type: "Received" | "Issued" | "Adjustment" | "Return";
    qty: number;
    reference: string | null;
    movedOn: string;
    byName: string;
  }>;
  purchaseRequests: Array<{
    id: string;
    itemId: string;
    description: string;
    qty: number;
    supplierId: string | null;
    value: number;
    requestedBy: string;
    requestedOn: string;
    status: "Draft" | "Pending approval" | "Approved" | "Rejected";
    decidedBy: string | null;
    decidedOn: string | null;
  }>;
  toolCheckouts: Array<{
    id: string;
    code: string;
    name: string;
    condition: "Good" | "Fair" | "Needs repair";
    status: "In store" | "Checked out" | "Overdue" | "In repair";
    holderEmployeeId: string | null;
    holderName: string | null;
    jobId: string | null;
    jobLabel: string | null;
    dueBack: string | null;
    notes: string | null;
  }>;
  utilityCaptures: Array<{
    id: string;
    capturedOn: string;
    type: "Power" | "Water" | "Fuel" | "Transport" | "Maintenance";
    reference: string;
    reading: string;
    amount: number;
    categoryKind: "direct" | "operations";
    capturedBy: string;
    status: "Quarantined" | "Approved" | "Rejected";
  }>;
};

function adaptMaterials(ws: Workspace, supplierName: (id: string | null) => string): Material[] {
  return ws.inventory
    .filter((row) => row.kind === "contract")
    .map((row) => ({
      id: row.id,
      code: row.code ?? row.id.toUpperCase(),
      name: row.name,
      category: row.category,
      unit: row.unit,
      onHand: row.quantity,
      reorderLevel: row.minimum,
      unitCost: row.cost,
      supplier: supplierName(row.supplierId),
      location: row.location ?? "",
    }));
}

export function useWorkspace() {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeToWorkspaceEvents(() => setTick((t) => t + 1)), []);
  const [data, setData] = useState<{
    materials: Material[];
    movements: Movement[];
    purchaseRequests: PurchaseRequest[];
    tools: Tool[];
    utilities: UtilityEntry[];
    suppliers: Supplier[];
    loading: boolean;
    error: string | null;
  }>({ materials: [], movements: [], purchaseRequests: [], tools: [], utilities: [], suppliers: [], loading: true, error: null });

  useEffect(() => {
    let alive = true;
    storeApi
      .get<Workspace>("/data")
      .then((ws) => {
        if (!alive) return;
        const supplierName = (id: string | null) =>
          ws.suppliers.find((s) => s.id === id)?.name ?? "";
        const itemCode = (itemId: string) =>
          ws.inventory.find((i) => i.id === itemId)?.code ?? itemId;
        const itemName = (itemId: string) =>
          ws.inventory.find((i) => i.id === itemId)?.name ?? itemId;

        const materials = adaptMaterials(ws, supplierName);
        const movements: Movement[] = ws.inventoryMovements.map((mv) => ({
          id: mv.id,
          date: mv.movedOn,
          materialCode: itemCode(mv.itemId),
          material: itemName(mv.itemId),
          type: mv.type,
          qty: mv.qty,
          job: mv.reference ?? "",
          by: mv.byName,
        }));
        const purchaseRequests: PurchaseRequest[] = ws.purchaseRequests.map((pr) => ({
          id: pr.id,
          material: pr.description,
          qty: pr.qty,
          supplier: supplierName(pr.supplierId),
          value: pr.value,
          raisedBy: pr.requestedBy,
          date: pr.requestedOn,
          status: pr.status,
        }));
        const tools: Tool[] = ws.toolCheckouts.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          condition: t.condition,
          status: t.status,
          holder: t.holderName || null,
          job: t.jobLabel || null,
          dueBack: t.dueBack,
          notes: t.notes ?? "",
        }));
        const utilities: UtilityEntry[] = ws.utilityCaptures.map((u) => ({
          id: u.id,
          date: u.capturedOn,
          type: u.type,
          reference: u.reference,
          reading: u.reading,
          amount: u.amount,
          category: u.categoryKind === "direct" ? "1 · Direct job cost" : "4 · Operations",
          capturedBy: u.capturedBy,
          status: u.status,
        }));
        const suppliers: Supplier[] = ws.suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          contact: s.contact ?? "",
          phone: s.phone,
          categories: s.categories ?? "",
          spendYtd: s.spendYtd ?? 0,
          rating: (s.rating ?? "Approved") as Supplier["rating"],
        }));

        setData({ materials, movements, purchaseRequests, tools, utilities, suppliers, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setData({
          materials: [],
          movements: [],
          purchaseRequests: [],
          tools: [],
          utilities: [],
          suppliers: [],
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load workspace data",
        });
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  return data;
}

/** Derived selectors kept API-compatible with the fixture helpers pages already import. */
export function useDerived() {
  const ws = useWorkspace();
  const stockValuation = ws.materials.reduce((sum, m) => sum + m.onHand * m.unitCost, 0);
  const lowStockItems = ws.materials.filter((m) => stockStatus(m) !== "healthy");
  const toolsOut = ws.tools.filter((t) => t.status === "Checked out" || t.status === "Overdue");
  const quarantinedSpend = ws.utilities
    .filter((u) => u.status === "Quarantined")
    .reduce((sum, u) => sum + u.amount, 0);

      // Weekly throughput: group movements by ISO week, count received vs issued.
  const throughput = useMemo(() => {
    const getWeek = (d: Date): number => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - dayNum + 3);
      const firstWeek = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const week = 1 + Math.round(((date.getTime() - firstWeek.getTime()) / 86400000 - 3 + 6) / 7);
      return week;
    };
    const byWeek = new Map<string, { issued: number; received: number }>();
    for (const mv of ws.movements) {
      try {
        const d = new Date(mv.date);
        const week = `W${String(getWeek(d)).padStart(2, "0")}`;
        const slot = byWeek.get(week) ?? { issued: 0, received: 0 };
        if (mv.type === "Issued" || mv.type === "Adjustment" || mv.type === "Return") {
          slot.issued += Math.abs(mv.qty);
        }
        if (mv.type === "Received") {
          slot.received += mv.qty;
        }
        byWeek.set(week, slot);
      } catch {
        /* skip rows without a parseable date */
      }
    }
    return Array.from(byWeek.entries())
      .map(([week, counts]) => ({ week, issued: counts.issued, received: counts.received }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [ws.movements]);

  // Cost per job: materials issued + utilities recharged per job.
  const costPerJob = useMemo(() => {
    const byJob = new Map<string, { materials: number; utilities: number }>();
    for (const mv of ws.movements) {
      if ((mv.type === "Issued" || mv.type === "Adjustment" || mv.type === "Return") && mv.qty < 0) {
        if (!mv.job) continue;
        const jobKey = mv.job.split(" · ")[0] ?? mv.job;
        const slot = byJob.get(jobKey) ?? { materials: 0, utilities: 0 };
        slot.materials += Math.abs(mv.qty) * (ws.materials.find((m) => m.code === mv.materialCode)?.unitCost ?? 0);
        byJob.set(jobKey, slot);
      }
    }
    for (const u of ws.utilities) {
      if (u.category === "1 · Direct job cost" && u.status === "Approved") {
        // Utilities don't always map to a specific job; group under the reference.
        const jobKey = u.reference.split(" · ")[0] ?? u.reference;
        const slot = byJob.get(jobKey) ?? { materials: 0, utilities: 0 };
        slot.utilities += u.amount;
        byJob.set(jobKey, slot);
      }
    }
    return Array.from(byJob.entries())
      .map(([job, costs]) => ({ job, materials: +(costs.materials / 1_000_000).toFixed(1), utilities: +(costs.utilities / 1_000_000).toFixed(1) }))
      .sort((a, b) => b.materials + b.utilities - (a.materials + a.utilities));
  }, [ws.movements, ws.utilities, ws.materials]);

  return { ws, stockValuation, lowStockItems, toolsOut, quarantinedSpend, throughput, costPerJob };
}

/** ── Phase E: mutations + cross-app SSE refresh ──────────────────────────── */

export type NewMovement = {
  itemId: string;
  type: "Received" | "Issued" | "Adjustment" | "Return";
  qty: number;
  reference?: string;
};

export type NewPurchaseRequest = {
  itemId: string;
  description: string;
  qty: number;
  supplierId?: string | null;
  value: number;
};

export type NewUtilityCapture = {
  type: "Power" | "Water" | "Fuel" | "Transport" | "Maintenance";
  reference: string;
  reading?: string;
  amount: number;
  categoryKind: "direct" | "operations";
};

export const storeMutations = {
  async createMovement(input: NewMovement): Promise<void> {
    await storeApi.request("/store/movements", {
      method: "POST",
      body: JSON.stringify({ ...input, byName: localStorage.getItem("gabfix-store:who") ?? "" }),
    });
  },

  async updateTool(
    id: string,
    patch: { status?: string; condition?: string; holderName?: string | null; jobLabel?: string | null; dueBack?: string | null; notes?: string | null },
  ): Promise<void> {
    await storeApi.request(`/store/tools/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  async createPurchaseRequest(input: NewPurchaseRequest): Promise<void> {
    await storeApi.request("/store/purchase-requests", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async createUtilityCapture(input: NewUtilityCapture): Promise<void> {
    await storeApi.request("/store/utility-captures", {
      method: "POST",
      body: JSON.stringify({ ...input, capturedBy: localStorage.getItem("gabfix-store:who") ?? "" }),
    });
  },
};

/**
 * Re-fetch trigger: subscribes to the workspace SSE stream and calls `onChange`
 * whenever a server event that could affect store data arrives. Cross-app by
 * design — an admin approval or a laundry issue surfaces here without polling.
 */
export function subscribeToWorkspaceEvents(onChange: () => void): () => void {
  const base = storeApi.baseUrl;
  if (!base || typeof EventSource === "undefined") return () => undefined;
  const token = localStorage.getItem("gabfix-store:auth-token");
  // EventSource cannot send headers; the server accepts a bearer query param.
  const url = token ? `${base}/events?access_token=${encodeURIComponent(token)}` : `${base}/events`;
  const es = new EventSource(url);
  const events = [
    "inventory-updated",
    "store-updated",
    "purchase-approved",
    "purchase-created",
    "workspace-reset",
    "settings-updated",
  ];
  for (const type of events) es.addEventListener(type, onChange);
  return () => es.close();
}
