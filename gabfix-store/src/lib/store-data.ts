/**
 * Store UI type definitions + formatters.
 *
 * All live data comes from GET /api/data via the useWorkspace() / useDerived()
 * hooks in workspace.ts. This module retains only the type contracts and pure
 * formatting helpers so the UI keeps its types; the data source is the server.
 */

export type StockStatus = "healthy" | "low" | "critical" | "out";

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string;
  location: string;
}

export interface Movement {
  id: string;
  date: string;
  materialCode: string;
  material: string;
  type: "Received" | "Issued" | "Adjustment" | "Return";
  qty: number;
  job: string;
  by: string;
}

export interface PurchaseRequest {
  id: string;
  material: string;
  qty: number;
  supplier: string;
  value: number;
  raisedBy: string;
  date: string;
  status: "Draft" | "Pending approval" | "Approved" | "Rejected";
}

export interface Tool {
  id: string;
  code: string;
  name: string;
  condition: "Good" | "Fair" | "Needs repair";
  status: "In store" | "Checked out" | "Overdue" | "In repair";
  holder: string | null;
  job: string | null;
  dueBack: string | null;
  notes: string;
}

export interface UtilityEntry {
  id: string;
  date: string;
  type: "Power" | "Water" | "Fuel" | "Transport" | "Maintenance";
  reference: string;
  reading: string;
  amount: number;
  category: "1 · Direct job cost" | "4 · Operations";
  capturedBy: string;
  status: "Quarantined" | "Approved" | "Rejected";
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  categories: string;
  spendYtd: number;
  rating: "Preferred" | "Approved" | "Watchlist";
}

export const currency = (value: number) => `UGX ${Math.round(value).toLocaleString("en-UG")}`;

export const compactCurrency = (value: number) => {
  if (value >= 1_000_000) return `UGX ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `UGX ${(value / 1_000).toFixed(0)}K`;
  return `UGX ${value}`;
};

export const stockStatus = (m: Material): StockStatus => {
  if (m.onHand === 0) return "out";
  if (m.onHand <= m.reorderLevel * 0.5) return "critical";
  if (m.onHand <= m.reorderLevel) return "low";
  return "healthy";
};
