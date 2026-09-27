import type { Request, Response } from 'express';
import { Router } from 'express';
import { parseBody } from '../validation/common';
import { laundryIntakeCreate, laundryStatusPatch } from '../validation/laundry';
import { createLaundryOrder, updateLaundryStatus } from '../services/laundry';
import { fail } from '../lib/http';
import { publish } from '../services/realtime';

/**
 * Laundry logistics (Phase 1 data spine). Two writes: a priced intake and a
 * fulfilment-stage move. The stage move stamps ready/collected server-side —
 * the client cannot forge the timeline.
 */
export const laundryRouter = Router();

/** POST /api/laundry — intake. */
laundryRouter.post('/', async (req: Request, res: Response) => {
  try {
    const input = parseBody(laundryIntakeCreate, req.body);
    const result = await createLaundryOrder(input);
    res.status(201).json(result);
    publish({ type: 'laundry-updated', by: req.user?.name });
  } catch (error) {
    fail(res, error, 'Invalid laundry intake');
  }
});

/** PATCH /api/laundry/:id/status — fulfilment stage move. */
laundryRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const body = parseBody(laundryStatusPatch, req.body);
    const id = req.params.id;
    const orderId = Array.isArray(id) ? id[0] : id;
    const result = await updateLaundryStatus(orderId, body.status);
    res.json(result);
    publish({ type: 'laundry-updated', by: req.user?.name });
  } catch (error) {
    fail(res, error, 'Status change failed');
  }
});
