import Dexie, { type EntityTable } from "dexie";

export type OrderStatus = "received" | "washing" | "drying" | "ready" | "collected";
export type CachedOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  service: string;
  itemCount: number;
  amount: number;
  status: OrderStatus;
  dueAt: string;
  synced: boolean;
  createdAt: string;
};
export type OutboxItem = {
  id: string;
  entity: string;
  action: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
};
export type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
};
export type Customer = { id: string; name: string; phone: string; updatedAt: string };

class LaundryDatabase extends Dexie {
  orders_cache!: EntityTable<CachedOrder, "id">;
  customers_cache!: EntityTable<Customer, "id">;
  stock_items_cache!: EntityTable<StockItem, "id">;
  outbox!: EntityTable<OutboxItem, "id">;
  constructor() {
    super("gabfix-laundry-front-office");
    this.version(1).stores({
      orders_cache: "id, orderNumber, status, dueAt, synced, createdAt",
      customers_cache: "id, phone, updatedAt",
      stock_items_cache: "id, category, quantity",
      outbox: "id, entity, action, createdAt, attempts",
    });
  }
}

export const laundryDb = new LaundryDatabase();

export async function queueOrder(order: CachedOrder) {
  await laundryDb.transaction(
    "rw",
    laundryDb.orders_cache,
    laundryDb.customers_cache,
    laundryDb.outbox,
    async () => {
      await laundryDb.orders_cache.put(order);
      await laundryDb.customers_cache.put({
        id: `customer-${order.customerPhone}`,
        name: order.customerName,
        phone: order.customerPhone,
        updatedAt: order.createdAt,
      });
      await laundryDb.outbox.put({
        id: crypto.randomUUID(),
        entity: "laundry_order",
        action: "create",
        payload: order,
        createdAt: order.createdAt,
        attempts: 0,
      });
    },
  );
}
