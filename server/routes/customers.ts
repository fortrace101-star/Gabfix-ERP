import { Router } from 'express';
import { createHandler } from './handlers';

export const customersRouter = Router();

/** POST /api/customers */
customersRouter.post('/', createHandler('customers', {
  idPrefix: 'c',
  requiredFields: ['name', 'phone'],
  label: 'customer',
}));
