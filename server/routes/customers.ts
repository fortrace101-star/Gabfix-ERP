import { Router } from 'express';
import { createHandler } from './handlers';
import { customersResource } from '../validation/resources';

export const customersRouter = Router();

/** POST /api/customers */
customersRouter.post('/', createHandler(customersResource, { idPrefix: 'c' }));
