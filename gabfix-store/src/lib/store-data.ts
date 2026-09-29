/**
 * Demo dataset for Gabfix Store. Replace with API/database reads later —
 * shapes mirror the intended backend resources.
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

export const materials: Material[] = [
  {
    id: "m1",
    code: "MAT-001",
    name: 'PVC pipe 1/2" x 3m',
    category: "Plumbing",
    unit: "length",
    onHand: 148,
    reorderLevel: 60,
    unitCost: 12500,
    supplier: "Kampala Hardware Ltd",
    location: "Rack A1",
  },
  {
    id: "m2",
    code: "MAT-002",
    name: "Cement 50kg (Hima)",
    category: "Masonry",
    unit: "bag",
    onHand: 24,
    reorderLevel: 40,
    unitCost: 34000,
    supplier: "Hima Depot Ntinda",
    location: "Floor bay 2",
  },
  {
    id: "m3",
    code: "MAT-003",
    name: "Twin cable 2.5mm",
    category: "Electrical",
    unit: "roll",
    onHand: 9,
    reorderLevel: 20,
    unitCost: 185000,
    supplier: "Volt Supplies UG",
    location: "Cage E",
  },
  {
    id: "m4",
    code: "MAT-004",
    name: "Emulsion paint white 20L",
    category: "Finishes",
    unit: "bucket",
    onHand: 31,
    reorderLevel: 15,
    unitCost: 145000,
    supplier: "Sadolin Kololo",
    location: "Rack C3",
  },
  {
    id: "m5",
    code: "MAT-005",
    name: "Gypsum board 8x4",
    category: "Ceilings",
    unit: "sheet",
    onHand: 0,
    reorderLevel: 25,
    unitCost: 52000,
    supplier: "Kampala Hardware Ltd",
    location: "Rack B2",
  },
  {
    id: "m6",
    code: "MAT-006",
    name: "Tile adhesive 20kg",
    category: "Finishes",
    unit: "bag",
    onHand: 63,
    reorderLevel: 30,
    unitCost: 41000,
    supplier: "Tilemart Nakawa",
    location: "Floor bay 1",
  },
  {
    id: "m7",
    code: "MAT-007",
    name: "Conduit pipe 20mm",
    category: "Electrical",
    unit: "length",
    onHand: 210,
    reorderLevel: 80,
    unitCost: 8500,
    supplier: "Volt Supplies UG",
    location: "Rack A4",
  },
  {
    id: "m8",
    code: "MAT-008",
    name: "Mixer tap chrome",
    category: "Plumbing",
    unit: "piece",
    onHand: 14,
    reorderLevel: 12,
    unitCost: 96000,
    supplier: "Aqua Fittings Ltd",
    location: "Cage P",
  },
  {
    id: "m9",
    code: "MAT-009",
    name: "Silicone sealant",
    category: "Consumables",
    unit: "tube",
    onHand: 5,
    reorderLevel: 24,
    unitCost: 18000,
    supplier: "Tilemart Nakawa",
    location: "Shelf S1",
  },
  {
    id: "m10",
    code: "MAT-010",
    name: "Sand (tipper share)",
    category: "Masonry",
    unit: "m³",
    onHand: 18,
    reorderLevel: 10,
    unitCost: 62000,
    supplier: "Lweza Aggregates",
    location: "Yard",
  },
  {
    id: "m11",
    code: "MAT-011",
    name: "Steel bar Y12",
    category: "Masonry",
    unit: "bar",
    onHand: 76,
    reorderLevel: 50,
    unitCost: 48000,
    supplier: "Roofings Group",
    location: "Yard rack",
  },
  {
    id: "m12",
    code: "MAT-012",
    name: "Door lockset",
    category: "Carpentry",
    unit: "set",
    onHand: 22,
    reorderLevel: 10,
    unitCost: 78000,
    supplier: "Aqua Fittings Ltd",
    location: "Cage P",
  },
];

export const movements: Movement[] = [
  {
    id: "v1",
    date: "2026-09-28",
    materialCode: "MAT-001",
    material: 'PVC pipe 1/2" x 3m',
    type: "Issued",
    qty: -24,
    job: "JOB-1184 · Ntinda villa",
    by: "Moses Okello",
  },
  {
    id: "v2",
    date: "2026-09-28",
    materialCode: "MAT-006",
    material: "Tile adhesive 20kg",
    type: "Received",
    qty: 40,
    job: "GRN-0421",
    by: "Grace Atim",
  },
  {
    id: "v3",
    date: "2026-09-27",
    materialCode: "MAT-003",
    material: "Twin cable 2.5mm",
    type: "Issued",
    qty: -6,
    job: "JOB-1179 · Kololo rewire",
    by: "Diana Achieng",
  },
  {
    id: "v4",
    date: "2026-09-27",
    materialCode: "MAT-005",
    material: "Gypsum board 8x4",
    type: "Issued",
    qty: -18,
    job: "JOB-1180 · Bugolobi ceiling",
    by: "John Kato",
  },
  {
    id: "v5",
    date: "2026-09-26",
    materialCode: "MAT-009",
    material: "Silicone sealant",
    type: "Adjustment",
    qty: -3,
    job: "Stock count variance",
    by: "Grace Atim",
  },
  {
    id: "v6",
    date: "2026-09-26",
    materialCode: "MAT-011",
    material: "Steel bar Y12",
    type: "Received",
    qty: 100,
    job: "GRN-0419",
    by: "Grace Atim",
  },
  {
    id: "v7",
    date: "2026-09-25",
    materialCode: "MAT-004",
    material: "Emulsion paint white 20L",
    type: "Return",
    qty: 4,
    job: "JOB-1172 · Muyenga",
    by: "Moses Okello",
  },
  {
    id: "v8",
    date: "2026-09-25",
    materialCode: "MAT-002",
    material: "Cement 50kg (Hima)",
    type: "Issued",
    qty: -30,
    job: "JOB-1184 · Ntinda villa",
    by: "John Kato",
  },
];

export const purchaseRequests: PurchaseRequest[] = [
  {
    id: "pr1",
    material: "Gypsum board 8x4",
    qty: 60,
    supplier: "Kampala Hardware Ltd",
    value: 3120000,
    raisedBy: "Grace Atim",
    date: "2026-09-28",
    status: "Pending approval",
  },
  {
    id: "pr2",
    material: "Twin cable 2.5mm",
    qty: 20,
    supplier: "Volt Supplies UG",
    value: 3700000,
    raisedBy: "Grace Atim",
    date: "2026-09-27",
    status: "Pending approval",
  },
  {
    id: "pr3",
    material: "Cement 50kg (Hima)",
    qty: 80,
    supplier: "Hima Depot Ntinda",
    value: 2720000,
    raisedBy: "John Kato",
    date: "2026-09-26",
    status: "Approved",
  },
  {
    id: "pr4",
    material: "Silicone sealant",
    qty: 48,
    supplier: "Tilemart Nakawa",
    value: 864000,
    raisedBy: "Grace Atim",
    date: "2026-09-24",
    status: "Draft",
  },
  {
    id: "pr5",
    material: "Mixer tap chrome",
    qty: 10,
    supplier: "Aqua Fittings Ltd",
    value: 960000,
    raisedBy: "Diana Achieng",
    date: "2026-09-22",
    status: "Rejected",
  },
];

export const tools: Tool[] = [
  {
    id: "t1",
    code: "TL-014",
    name: "Bosch rotary hammer",
    condition: "Good",
    status: "Checked out",
    holder: "Moses Okello",
    job: "JOB-1184 · Ntinda villa",
    dueBack: "2026-09-29",
    notes: "New chisel set attached",
  },
  {
    id: "t2",
    code: "TL-021",
    name: "Pipe threading machine",
    condition: "Fair",
    status: "Overdue",
    holder: "John Kato",
    job: "JOB-1180 · Bugolobi",
    dueBack: "2026-09-25",
    notes: "Oil top-up needed",
  },
  {
    id: "t3",
    code: "TL-002",
    name: "Ladder 4m aluminium",
    condition: "Good",
    status: "In store",
    holder: null,
    job: null,
    dueBack: null,
    notes: "",
  },
  {
    id: "t4",
    code: "TL-008",
    name: 'Angle grinder 5"',
    condition: "Needs repair",
    status: "In repair",
    holder: null,
    job: null,
    dueBack: null,
    notes: "Switch faulty — at Nakawa workshop",
  },
  {
    id: "t5",
    code: "TL-031",
    name: "Multimeter Fluke 117",
    condition: "Good",
    status: "Checked out",
    holder: "Diana Achieng",
    job: "JOB-1179 · Kololo rewire",
    dueBack: "2026-09-30",
    notes: "",
  },
  {
    id: "t6",
    code: "TL-005",
    name: "Concrete mixer 350L",
    condition: "Fair",
    status: "In store",
    holder: null,
    job: null,
    dueBack: null,
    notes: "Serviced 12 Sep",
  },
  {
    id: "t7",
    code: "TL-019",
    name: "Tile cutter 900mm",
    condition: "Good",
    status: "Checked out",
    holder: "Peter Ssali",
    job: "JOB-1186 · Muyenga bath",
    dueBack: "2026-10-02",
    notes: "",
  },
];

export const utilityEntries: UtilityEntry[] = [
  {
    id: "u1",
    date: "2026-09-28",
    type: "Fuel",
    reference: "Shell Ntinda · 441882",
    reading: "42.5 L",
    amount: 236000,
    category: "1 · Direct job cost",
    capturedBy: "Moses Okello",
    status: "Quarantined",
  },
  {
    id: "u2",
    date: "2026-09-27",
    type: "Power",
    reference: "Yaka meter 0431 7719",
    reading: "1,284 → 1,412 kWh",
    amount: 410000,
    category: "4 · Operations",
    capturedBy: "Grace Atim",
    status: "Quarantined",
  },
  {
    id: "u3",
    date: "2026-09-26",
    type: "Water",
    reference: "NWSC acct 88213",
    reading: "214 → 231 m³",
    amount: 128000,
    category: "4 · Operations",
    capturedBy: "Grace Atim",
    status: "Approved",
  },
  {
    id: "u4",
    date: "2026-09-25",
    type: "Transport",
    reference: "Truck hire UBK 442H",
    reading: "Kololo run",
    amount: 180000,
    category: "1 · Direct job cost",
    capturedBy: "John Kato",
    status: "Approved",
  },
  {
    id: "u5",
    date: "2026-09-24",
    type: "Maintenance",
    reference: "Grinder repair TL-008",
    reading: "Workshop slip 118",
    amount: 95000,
    category: "4 · Operations",
    capturedBy: "Grace Atim",
    status: "Quarantined",
  },
  {
    id: "u6",
    date: "2026-09-22",
    type: "Fuel",
    reference: "Total Kamwokya · 30219",
    reading: "31 L",
    amount: 172000,
    category: "1 · Direct job cost",
    capturedBy: "Diana Achieng",
    status: "Rejected",
  },
];

export const suppliers: Supplier[] = [
  {
    id: "s1",
    name: "Kampala Hardware Ltd",
    contact: "Sam Lubega",
    phone: "+256 772 114 220",
    categories: "Masonry, Ceilings",
    spendYtd: 42800000,
    rating: "Preferred",
  },
  {
    id: "s2",
    name: "Volt Supplies UG",
    contact: "Ritah Nabwire",
    phone: "+256 700 884 512",
    categories: "Electrical",
    spendYtd: 28400000,
    rating: "Preferred",
  },
  {
    id: "s3",
    name: "Tilemart Nakawa",
    contact: "Eric Mugisha",
    phone: "+256 782 330 907",
    categories: "Finishes, Consumables",
    spendYtd: 11250000,
    rating: "Approved",
  },
  {
    id: "s4",
    name: "Aqua Fittings Ltd",
    contact: "Joan Kirabo",
    phone: "+256 704 662 018",
    categories: "Plumbing",
    spendYtd: 9600000,
    rating: "Approved",
  },
  {
    id: "s5",
    name: "Lweza Aggregates",
    contact: "Musa Sentongo",
    phone: "+256 758 221 743",
    categories: "Masonry",
    spendYtd: 6400000,
    rating: "Watchlist",
  },
];

export const throughput = [
  { week: "W31", issued: 18, received: 24 },
  { week: "W32", issued: 22, received: 19 },
  { week: "W33", issued: 27, received: 31 },
  { week: "W34", issued: 24, received: 22 },
  { week: "W35", issued: 33, received: 28 },
  { week: "W36", issued: 38, received: 35 },
  { week: "W37", issued: 42, received: 30 },
];

export const costPerJob = [
  { job: "JOB-1184", materials: 4.2, utilities: 0.9 },
  { job: "JOB-1180", materials: 3.1, utilities: 0.6 },
  { job: "JOB-1179", materials: 2.6, utilities: 0.4 },
  { job: "JOB-1186", materials: 1.9, utilities: 0.5 },
  { job: "JOB-1172", materials: 1.4, utilities: 0.3 },
];

export const stockValuation = materials.reduce((sum, m) => sum + m.onHand * m.unitCost, 0);
export const lowStockItems = materials.filter((m) => stockStatus(m) !== "healthy");
export const toolsOut = tools.filter((t) => t.status === "Checked out" || t.status === "Overdue");
export const quarantinedSpend = utilityEntries
  .filter((u) => u.status === "Quarantined")
  .reduce((sum, u) => sum + u.amount, 0);
