import { Router } from 'express';
import { initializeSseStream, subscribe, type RealtimeEvent } from '../services/realtime';
import { requireScope } from '../middleware/auth';

/**
 * GET /api/events — Server-Sent Events stream of workspace changes
 * (multi-app-plan §10.4: every app scope may listen).
 *
 * The connection is kept alive by the shared heartbeat in services/realtime;
 * events are one-line JSON, so the browser's EventSource re-hydrates them
 * with `JSON.parse(message.data)`.
 */
export const eventsRouter = Router();

eventsRouter.get('/', requireScope('admin', 'laundry', 'portal', 'store'), (req, res) => {
  const unsubscribe = subscribe((event: RealtimeEvent) => {
    try {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    } catch {
      // Write after the client vanished; the close handler cleans up.
      unsubscribe();
    }
  });

  initializeSseStream(res);

  // Defensive extra cleanup in case 'close' fires before the response ends.
  req.on('close', unsubscribe);
});
