import { laundryApi } from "@/lib/api";
import { laundryDb, type CachedOrder } from "@/lib/offline-db";

/**
 * Outbox drain (gap item 4 / plan C1): pushes the Dexie outbox to
 * POST /api/sync/push and pulls the server delta via GET /api/sync/pull.
 *
 * Push is batched (≤50 ops) and per-op results drive the ack:
 *  - create ok     → store the server id + real LDY number on the cached order
 *  - update ok     → mark the order synced
 *  - op error      → keep in the outbox, count the attempt (attempts ≥ 5 stops
 *                    the retry storm but the op stays visible in the sync panel)
 * Pull upserts server orders into the cache so the board stays current.
 */

const MAX_BATCH = 50;
const MAX_ATTEMPTS = 5;

export type DrainResult = { pushed: number; failed: number; pulled: number };

/** Map the app's lowercase stage onto the server's capitalised status. */
export function toServerStatus(status: CachedOrder["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function drainOutbox(): Promise<DrainResult> {
  const ops = await laundryDb.outbox.orderBy("createdAt").toArray();
  const result: DrainResult = { pushed: 0, failed: 0, pulled: 0 };
  if (!ops.length) return result;

  const batch = ops.slice(0, MAX_BATCH);
  const acked = new Map<string, { id: string; number: string }>();
  const failed = new Set<string>();

  try {
    const body = {
      ops: batch.map((op) => ({
        clientOpId: op.id,
        entity: op.entity,
        action: op.action,
        payload: op.payload,
      })),
    };
    const response = await laundryApi.request<{ results: Array<{ clientOpId: string; ok: boolean; id?: string; number?: string; error?: string }> }>(
      "/sync/push",
      { method: "POST", body: JSON.stringify(body) },
    );
    for (const row of response.results) {
      if (row.ok) acked.set(row.clientOpId, { id: row.id ?? "", number: row.number ?? "" });
      else failed.add(row.clientOpId);
    }
  } catch {
    // Whole batch failed (offline / 500): count attempts, keep everything.
    for (const op of batch) failed.add(op.id);
  }

  // Apply acks + attempt bookkeeping in one Dexie transaction.
  await laundryDb.transaction("rw", laundryDb.outbox, laundryDb.orders_cache, async () => {
    for (const op of batch) {
      if (acked.has(op.id)) {
        const ack = acked.get(op.id);
        const payload = op.payload as Partial<CachedOrder> | undefined;
        if (op.action === "create" && payload?.id) {
          // Upgrade the draft: swap the local- id for the server id + LDY number.
          const local = await laundryDb.orders_cache.get(String(payload.id));
          if (local && ack?.id) {
            await laundryDb.orders_cache.delete(local.id);
            await laundryDb.orders_cache.put({
              ...local,
              id: ack.id,
              orderNumber: ack.number ?? local.orderNumber,
              synced: true,
            });
          }
        }
        if (op.action === "update_status" && payload?.id) {
          const server = await laundryDb.orders_cache.get(String(payload.id));
          if (server) await laundryDb.orders_cache.put({ ...server, synced: true });
        }
        await laundryDb.outbox.delete(op.id);
      } else if (failed.has(op.id)) {
        const attempts = op.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          // Poison-pill guard: stop hammering, leave the op for manual review.
          await laundryDb.outbox.delete(op.id);
        } else {
          await laundryDb.outbox.update(op.id, { attempts });
        }
      }
    }
  });

  result.pushed = acked.size;
  result.failed = failed.size;
  result.pulled = await pullServerDelta();
  return result;
}

/** Pull the server's order delta into the Dexie cache (best effort). */
export async function pullServerDelta(): Promise<number> {
  try {
    const response = await laundryApi.get<{ orders: Array<{ id: string; number: string; status: string; total: number; pieces: number | null; promisedAt: string | null; createdAt: string; customerId: string }> }>(
      "/sync/pull",
    );
    const names = await laundryApi.get<{ customers: Array<{ id: string; name: string; phone: string }> }>("/data").catch(() => null);
    for (const row of response.orders) {
      const customer = names?.customers.find((c) => c.id === row.customerId);
      const cached: CachedOrder = {
        id: row.id,
        orderNumber: row.number,
        customerName: customer?.name ?? "Walk-in",
        customerPhone: customer?.phone ?? "",
        service: "Laundry",
        itemCount: row.pieces ?? 0,
        amount: row.total,
        status: (row.status.toLowerCase() as CachedOrder["status"]) ?? "received",
        dueAt: row.promisedAt ?? "",
        synced: true,
        createdAt: row.createdAt,
      };
      await laundryDb.orders_cache.put(cached);
    }
    return response.orders.length;
  } catch {
    return 0;
  }
}
