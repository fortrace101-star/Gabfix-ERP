import { useEffect, useState } from "react";
import { laundryApi } from "@/lib/api";
import type { CachedOrder } from "@/lib/offline-db";

/**
 * Live-data layer (plan A6): fetches GET /api/data and maps the server's
 * laundry rows onto the dashboard's CachedOrder shape. Local (Dexie) orders
 * keep priority in the dashboard's merge; server rows fill the rest.
 */

type LaundryRow = {
  id: string;
  number: string;
  customerId: string | null;
  status: string;
  total: number;
  paid: number;
  items: number;
  received: string;
  promisedAt: string | null;
  readyAt: string | null;
  collectedAt: string | null;
};

export function useLaundryWorkspace() {
  const [orders, setOrders] = useState<CachedOrder[]>([]);

  useEffect(() => {
    let alive = true;
    laundryApi
      .get<{ laundry: LaundryRow[]; customers: Array<{ id: string; name: string; phone: string }> }>("/data")
      .then((ws) => {
        if (!alive) return;
        const customer = (id: string | null) =>
          ws.customers.find((c) => c.id === id) ?? null;
        const mapped: CachedOrder[] = ws.laundry.map((row) => {
          const cust = customer(row.customerId);
          return {
          id: row.id,
          orderNumber: row.number,
          customerName: cust?.name ?? "Walk-in",
          customerPhone: cust?.phone ?? "",
          service: "Laundry",
          itemCount: row.items,
          amount: row.total,
          status: row.status as CachedOrder["status"],
          dueAt: row.promisedAt ?? row.readyAt ?? "",
          synced: true,
          createdAt: row.received,
          };
        });
        setOrders(mapped);
      })
      .catch(() => {
        if (alive) setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return orders;
}
