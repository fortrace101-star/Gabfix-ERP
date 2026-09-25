import { Router } from 'express';
import { createHandler, updateHandler } from './handlers';

export const inventoryRouter = Router();

/** POST /api/inventory — stock, unit and cost default to sensible zeros. */
inventoryRouter.post('/', createHandler('inventory_items', {
  idPrefix: 'i',
  requiredFields: ['name', 'category', 'branchId'],
  prepare: (body) => ({
    ...body,
    unit: body.unit ?? 'unit',
    quantity: body.quantity ?? 0,
    minimum: body.minimum ?? 0,
    cost: body.cost ?? 0,
  }),
  label: 'inventory item',
}));

/** PATCH /api/inventory/:id — quantity, minimum, cost, unit. */
inventoryRouter.patch('/:id', updateHandler('inventory_items', { notFound: 'Inventory item not found', label: 'inventory update' }));
