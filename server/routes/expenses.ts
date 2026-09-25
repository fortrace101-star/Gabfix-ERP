import { Router } from 'express';
import { createHandler } from './handlers';

export const expensesRouter = Router();

/** POST /api/expenses — date defaults to today (UTC) until 0.9 switches to Africa/Kampala. */
expensesRouter.post('/', createHandler('expenses', {
  idPrefix: 'e',
  requiredFields: ['category', 'description', 'amount', 'branchId'],
  prepare: (body) => ({ ...body, date: body.date ?? new Date().toISOString().slice(0, 10) }),
  label: 'expense',
}));
