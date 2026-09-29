import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CloudOff,
  Download,
  Gauge,
  History,
  Menu,
  PackageCheck,
  Plus,
  Search,
  Settings,
  Shirt,
  Store,
  UserRound,
  Wifi,
  X,
} from "lucide-react";
import { laundryApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { laundryDb, queueOrder, type CachedOrder, type OrderStatus } from "@/lib/offline-db";
import { useLaundryWorkspace } from "@/lib/workspace";

// Server laundry orders are pulled live (A6) and mapped onto CachedOrder below.
const stock = [
  { name: "Laundry detergent", category: "Consumable", qty: 18, min: 12, unit: "L", value: 684000 },
  { name: "Fabric softener", category: "Consumable", qty: 7, min: 10, unit: "L", value: 266000 },
  { name: "Garment bags", category: "Packaging", qty: 42, min: 50, unit: "pcs", value: 126000 },
  { name: "Receipt rolls", category: "Supply", qty: 16, min: 8, unit: "rolls", value: 96000 },
  { name: "Washer belt A42", category: "Spare", qty: 3, min: 2, unit: "pcs", value: 210000 },
];
const nav: ReadonlyArray<readonly [string, string, ComponentType<{ className?: string }>]> = [
  ["overview", "Overview", Gauge],
  ["orders", "Laundry orders", ClipboardList],
  ["board", "Status board", Shirt],
  ["collections", "Collections", PackageCheck],
  ["inventory", "Inventory", Boxes],
  ["expenses", "Expenses", CircleDollarSign],
  ["sync", "Sync health", Wifi],
  ["settings", "Settings", Settings],
] as const;
const statuses: OrderStatus[] = ["received", "washing", "drying", "ready", "collected"];
const money = (amount: number) => `UGX ${amount.toLocaleString("en-UG")}`;
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function LaundryDashboard({ active }: { active: string }) {
  const navigate = useNavigate();
  const cachedOrders = useLiveQuery(() => laundryDb.orders_cache.toArray(), []) ?? [];
  const waiting = useLiveQuery(() => laundryDb.outbox.count(), []) ?? 0;
  const serverOrders = useLaundryWorkspace();
  const [orders, setOrders] = useState<CachedOrder[]>([]);
  const [sidebar, setSidebar] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [selected, setSelected] = useState<CachedOrder | null>(null);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (cachedOrders.length)
      setOrders((current) => [
        ...cachedOrders,
        ...current.filter((order) => !cachedOrders.some((cached) => cached.id === order.id)),
      ]);
  }, [cachedOrders]);
  useEffect(() => {
    if (serverOrders.length) {
      setOrders((current) => [
        ...serverOrders,
        ...current.filter((order) => !serverOrders.some((server) => server.id === order.id)),
      ]);
    }
  }, [serverOrders]);

  const filtered = useMemo(
    () =>
      orders.filter((order) =>
        `${order.orderNumber} ${order.customerName} ${order.customerPhone}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [orders, query],
  );
  const ready = orders.filter((order) => order.status === "ready").length;
  const overdue = orders.filter(
    (order) =>
      order.status !== "collected" && new Date(order.dueAt) < new Date("2026-09-28T10:07:00.000Z"),
  ).length;
  const kpis: ReadonlyArray<
    readonly [string, string | number, ComponentType<{ className?: string }>]
  > = [
    ["Active orders", orders.filter((order) => order.status !== "collected").length, ClipboardList],
    ["Ready to collect", ready, PackageCheck],
    ["Overdue", overdue, History],
    ["Low stock", 2, Boxes],
    ["Inventory value", money(1382000), CircleDollarSign],
  ];

  async function signOut() {
    await laundryApi.auth.signOut();
    navigate("/", { replace: true });
  }
  async function addOrder(formData: FormData) {
    const createdAt = new Date().toISOString();
    const id = `local-${crypto.randomUUID()}`;
    const order: CachedOrder = {
      id,
      orderNumber: `DRAFT-${id.slice(-5).toUpperCase()}`,
      customerName: String(formData.get("name")),
      customerPhone: String(formData.get("phone")),
      service: String(formData.get("service")),
      itemCount: Number(formData.get("items")),
      amount: Number(formData.get("amount")),
      status: "received",
      dueAt: String(formData.get("due")),
      synced: false,
      createdAt,
    };
    await queueOrder(order);
    setIntakeOpen(false);
    setSelected(order);
    toast.success("Intake saved", { description: "Draft ticket queued for sync." });
  }
  async function advance(order: CachedOrder) {
    const index = statuses.indexOf(order.status);
    if (index >= statuses.length - 1) return;
    const updated = { ...order, status: statuses[index + 1] ?? order.status, synced: false };
    setOrders((current) => current.map((item) => (item.id === order.id ? updated : item)));
    if (order.id.startsWith("local-")) await laundryDb.orders_cache.put(updated);
    await laundryDb.outbox.put({
      id: crypto.randomUUID(),
      entity: "laundry_order",
      action: "update_status",
      payload: updated,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    setSelected(updated);
    toast.success(`Moved to ${label(updated.status)}`);
  }
  async function ticket(order: CachedOrder) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("GABFIX LAUNDRY", 16, 20);
    pdf.setFontSize(10);
    pdf.text(order.synced ? "AUTHORITATIVE TICKET" : "DRAFT — PENDING SYNC", 16, 28);
    autoTable(pdf, {
      startY: 36,
      head: [["Order", "Customer", "Service", "Items", "Amount"]],
      body: [
        [
          order.orderNumber,
          order.customerName,
          order.service,
          String(order.itemCount),
          money(order.amount),
        ],
      ],
    });
    pdf.text(`Status: ${label(order.status)}`, 16, 65);
    pdf.save(`${order.orderNumber}.pdf`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors />
      {sidebar && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-overlay md:hidden"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:translate-x-0 ${sidebar ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
          <img src="/gabfix-logo.png" alt="Gabfix" className="h-11 w-11" />
          <div>
            <strong className="block text-lg text-sidebar-foreground">Gabfix</strong>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              Laundry Front Office
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">
            Laundry workspace
          </p>
          {nav.map(([key, title, Icon]) => (
            <Link
              key={key}
              to={`/dashboard/${key}`}
              onClick={() => setSidebar(false)}
              className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${active === key ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
            >
              <Icon className={`h-4 w-4 ${active === key ? "text-primary" : ""}`} />
              <span>{title}</span>
              {key === "orders" && (
                <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                  {orders.length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              GA
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Grace Atim</p>
              <p className="text-xs text-sidebar-muted">Counter operator</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <UserRound />
            </Button>
          </div>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebar(true)}
          >
            <Menu />
          </Button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders, customers…"
              className="pl-9"
            />
          </div>
          <div
            className={`hidden items-center gap-2 text-xs sm:flex ${online ? "text-success" : "text-danger"}`}
          >
            {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            <span>
              {online ? `Last synced · ${waiting} waiting` : `Offline · ${waiting} waiting`}
            </span>
          </div>
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell />
          </Button>
        </header>
        <main className="p-4 md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                Monday, 28 September
              </p>
              <h1 className="text-2xl font-bold md:text-3xl">
                {active === "overview"
                  ? "Good afternoon, Grace"
                  : (nav.find(([key]) => key === active)?.[1] ?? "Laundry operations")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep every garment, supply, and handover moving.
              </p>
            </div>
            <Button size="lg" onClick={() => setIntakeOpen(true)}>
              <Plus />
              New intake
            </Button>
          </div>
          {(active === "overview" || active === "orders") && (
            <>
              <section className="mb-5 grid grid-cols-2 overflow-hidden rounded-md border border-border lg:grid-cols-5">
                {kpis.map(([title, value, Icon]) => (
                  <div
                    key={title}
                    className="border-b border-r border-border bg-card p-5 last:border-r-0 lg:border-b-0"
                  >
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{title}</span>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-4 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </section>
              <OrderTable orders={filtered} onSelect={setSelected} />
            </>
          )}
          {active === "board" && <StatusBoard orders={orders} onSelect={setSelected} />}
          {active === "collections" && (
            <OrderTable
              orders={filtered.filter((o) => o.status === "ready" || o.status === "collected")}
              onSelect={setSelected}
            />
          )}
          {active === "inventory" && <InventoryTable />}
          {active === "expenses" && <ExpensePanel />}
          {active === "sync" && <SyncPanel waiting={waiting} online={online} />}
          {active === "settings" && <SettingsPanel />}
        </main>
      </div>
      {intakeOpen && <IntakeModal onClose={() => setIntakeOpen(false)} onSubmit={addOrder} />}
      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onAdvance={advance}
          onTicket={ticket}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`status-pill status-${status}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label(status)}
    </span>
  );
}
function OrderTable({
  orders,
  onSelect,
}: {
  orders: CachedOrder[];
  onSelect: (order: CachedOrder) => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">Today’s orders</h2>
          <p className="text-xs text-muted-foreground">Live laundry queue and promised handovers</p>
        </div>
        <Button variant="outline" size="sm">
          <Download />
          Export
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              {["Order", "Customer", "Service", "Items", "Due", "Amount", "Status"].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => onSelect(order)}
                className="cursor-pointer border-t border-border hover:bg-muted/35"
              >
                <td className="px-5 py-4 font-mono text-xs font-bold">
                  {order.orderNumber}
                  {!order.synced && <span className="ml-2 text-danger">•</span>}
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                </td>
                <td className="px-5 py-4">{order.service}</td>
                <td className="px-5 py-4">{order.itemCount}</td>
                <td className="px-5 py-4">
                  {new Date(order.dueAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-4 font-semibold">{money(order.amount)}</td>
                <td className="px-5 py-4">
                  <StatusPill status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function StatusBoard({
  orders,
  onSelect,
}: {
  orders: CachedOrder[];
  onSelect: (o: CachedOrder) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-5">
      {statuses.map((status) => (
        <section key={status} className="min-h-80 rounded-md border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold">{label(status)}</h2>
            <span className="rounded bg-muted px-2 py-1 text-xs">
              {orders.filter((o) => o.status === status).length}
            </span>
          </header>
          <div className="space-y-3 p-3">
            {orders
              .filter((o) => o.status === status)
              .map((order) => (
                <button
                  key={order.id}
                  onClick={() => onSelect(order)}
                  className="w-full rounded-md border border-border bg-background p-3 text-left hover:border-primary/60"
                >
                  <p className="font-mono text-xs text-primary">{order.orderNumber}</p>
                  <p className="mt-2 font-semibold">{order.customerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.itemCount} items · {money(order.amount)}
                  </p>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
function InventoryTable() {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="font-semibold">Facility stock</h2>
          <p className="text-xs text-muted-foreground">
            Consumables, packaging, supplies, and spares
          </p>
        </div>
        <Button>
          <Plus />
          Stock movement
        </Button>
      </div>
      <div className="divide-y divide-border">
        {stock.map((item) => (
          <div key={item.name} className="grid grid-cols-[1fr_auto] gap-4 p-5 md:grid-cols-5">
            <div className="md:col-span-2">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
            <p className="text-sm">
              <strong>{item.qty}</strong> {item.unit}
            </p>
            <p className="text-sm text-muted-foreground">Reorder at {item.min}</p>
            <div className="text-right">
              <p className="font-semibold">{money(item.value)}</p>
              {item.qty <= item.min && (
                <span className="status-pill status-overdue">Low stock</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function ExpensePanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="font-semibold">Facility expenses</h2>
        <div className="mt-5 space-y-3">
          {[
            ["Generator fuel", "Operations", "UGX 180,000", "Pending"],
            ["Express order detergent", "Direct job cost", "UGX 74,000", "Approved"],
            ["Dryer maintenance", "Operations", "UGX 320,000", "Pending"],
          ].map((row) => (
            <div
              key={row[0]}
              className="flex items-center justify-between rounded-md border border-border p-4"
            >
              <div>
                <p className="font-semibold">{row[0]}</p>
                <p className="text-xs text-muted-foreground">{row[1]}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{row[2]}</p>
                <span className="text-xs text-primary">{row[3]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="font-semibold">Capture expense</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Expense queued for approval");
          }}
        >
          <select className="field">
            <option>Operations (Category 4)</option>
            <option>Direct job cost (Category 1)</option>
          </select>
          <Input placeholder="Description" required />
          <Input type="number" placeholder="Amount (UGX)" required />
          <Input type="file" accept="image/*" />
          <Button className="w-full">Submit expense</Button>
        </form>
      </section>
    </div>
  );
}
function SyncPanel({ waiting, online }: { waiting: number; online: boolean }) {
  return (
    <section className="max-w-3xl rounded-md border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <span
          className={`grid h-12 w-12 place-items-center rounded-md ${online ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
        >
          {online ? <Wifi /> : <CloudOff />}
        </span>
        <div>
          <h2 className="text-lg font-semibold">
            {online ? "Connection available" : "Working offline"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {waiting} action{waiting === 1 ? "" : "s"} waiting to sync. Draft numbers upgrade
            automatically after acknowledgement.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Queued", waiting],
          ["Failed", 0],
          ["Last sync", "10:03"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-2 text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
function SettingsPanel() {
  return (
    <section className="max-w-2xl rounded-md border border-border bg-card p-6">
      <h2 className="font-semibold">Front office settings</h2>
      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="font-medium">Laundry location</p>
            <p className="text-xs text-muted-foreground">Kampala Central Facility</p>
          </div>
          <Store className="text-primary" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Application scope</p>
            <p className="text-xs text-muted-foreground">laundry · counter operator</p>
          </div>
          <span className="status-pill status-ready">Active</span>
        </div>
      </div>
    </section>
  );
}
function IntakeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4">
      <div className="w-full max-w-xl rounded-lg border border-border bg-popover shadow-2xl">
        <header className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">New laundry intake</h2>
            <p className="text-xs text-muted-foreground">
              A draft ticket is available immediately, even offline.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </header>
        <form action={onSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="field-label">
            Customer name
            <Input name="name" required placeholder="Full name" />
          </label>
          <label className="field-label">
            Phone
            <Input name="phone" required placeholder="07…" />
          </label>
          <label className="field-label">
            Service
            <select name="service" className="field">
              <option>Wash & fold</option>
              <option>Wash & iron</option>
              <option>Dry cleaning</option>
              <option>Express wash</option>
              <option>Duvet care</option>
            </select>
          </label>
          <label className="field-label">
            Item count
            <Input name="items" type="number" min="1" defaultValue="1" required />
          </label>
          <label className="field-label">
            Amount (UGX)
            <Input name="amount" type="number" min="0" required />
          </label>
          <label className="field-label">
            Due date & time
            <Input name="due" type="datetime-local" required />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Confirm intake</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
function OrderDrawer({
  order,
  onClose,
  onAdvance,
  onTicket,
}: {
  order: CachedOrder;
  onClose: () => void;
  onAdvance: (o: CachedOrder) => void;
  onTicket: (o: CachedOrder) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-overlay">
      <aside className="ml-auto flex h-full w-full max-w-md flex-col border-l border-border bg-popover shadow-2xl">
        <header className="flex items-center justify-between border-b border-border p-5">
          <div>
            <p className="font-mono text-xs text-primary">{order.orderNumber}</p>
            <h2 className="text-xl font-semibold">{order.customerName}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <StatusPill status={order.status} />
          <div className="mt-6 grid grid-cols-2 gap-4">
            {[
              ["Service", order.service],
              ["Items", String(order.itemCount)],
              ["Amount", money(order.amount)],
              ["Due", new Date(order.dueAt).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-border p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-1 font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Progress</h3>
            <div className="mt-3 space-y-0">
              {statuses.map((status, index) => (
                <div key={status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-3 w-3 rounded-full ${index <= statuses.indexOf(order.status) ? "bg-primary" : "bg-muted"}`}
                    />
                    {index < statuses.length - 1 && <span className="h-8 w-px bg-border" />}
                  </div>
                  <span className="-mt-1 text-sm">{label(status)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <footer className="grid grid-cols-2 gap-2 border-t border-border p-5">
          <Button variant="outline" onClick={() => onTicket(order)}>
            <Download />
            Ticket PDF
          </Button>
          <Button onClick={() => onAdvance(order)} disabled={order.status === "collected"}>
            {order.status === "ready"
              ? "Collect order"
              : order.status === "collected"
                ? "Collected"
                : `Move to ${label(statuses[statuses.indexOf(order.status) + 1] ?? order.status)}`}
          </Button>
        </footer>
      </aside>
    </div>
  );
}
