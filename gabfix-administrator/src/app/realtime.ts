import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Live updates (Phase 0.11, extracted in 0.10): any write from any Gabfix app
 * invalidates the workspace cache, so a job created by a second browser
 * appears without a manual reload. The periodic fallback covers an SSE gap
 * (proxy timeout, sleeping tab).
 */
const EVENT_TYPES = ['job-created', 'job-updated', 'customer-created', 'expense-created', 'equipment-created', 'equipment-updated', 'inventory-created', 'inventory-updated', 'payment-created', 'asset-depreciated', 'workspace-reset'];

export function useRealtimeRefresh() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['workspace'] });
    let reconnect: number | undefined;
    const connect = () => {
      const source = new EventSource('/api/events');
      source.onmessage = invalidate;
      for (const type of EVENT_TYPES) source.addEventListener(type, invalidate);
      source.onerror = () => { source.close(); window.clearTimeout(reconnect); reconnect = window.setTimeout(connect, 4000); };
    };
    connect();
    const fallback = window.setInterval(invalidate, 30000);
    return () => { window.clearInterval(fallback); window.clearTimeout(reconnect); };
  }, [queryClient]);
}
