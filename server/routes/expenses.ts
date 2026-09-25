import { Router } from 'express';
import { createHandler } from './handlers';
import { expensesResource } from '../validation/resources';

export const expensesRouter = Router();

/** POST /api/expenses — date defaults to today (UTC) until 0.9 switches to Africa/Kampala. */
expensesRouter.post('/', createHandler(expensesResource, {
  idPrefix: 'e',
  prepare: (data) => ({ ...data, date: data.date ?? new Date().toISOString().slice(0, 10) }),
}));
