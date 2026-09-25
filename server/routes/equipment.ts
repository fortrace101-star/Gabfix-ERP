import { Router } from 'express';
import { createHandler, updateHandler } from './handlers';

/** New assets assume a 90-day maintenance window. */
const DEFAULT_MAINTENANCE_DAYS = 90;

export const equipmentRouter = Router();

/** POST /api/equipment */
equipmentRouter.post('/', createHandler('equipment', {
  idPrefix: 'a',
  requiredFields: ['name', 'serialNumber', 'value', 'branchId'],
  prepare: (body) => ({
    ...body,
    bookValue: body.bookValue ?? body.value,
    condition: body.condition ?? 'Good',
    nextMaintenance: body.nextMaintenance ?? new Date(Date.now() + DEFAULT_MAINTENANCE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    usage: body.usage ?? 0,
  }),
  label: 'equipment',
}));

/** PATCH /api/equipment/:id — book value, condition, usage, next maintenance. */
equipmentRouter.patch('/:id', updateHandler('equipment', { notFound: 'Equipment not found', label: 'equipment update' }));
