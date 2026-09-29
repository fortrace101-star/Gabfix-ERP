import { useEffect, useState } from "react";
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
  }, []);

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
  return { ws, stockValuation, lowStockItems, toolsOut, quarantinedSpend };
}
