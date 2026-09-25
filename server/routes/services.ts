import { Router } from 'express';
import { createHandler } from './handlers';

export const servicesRouter = Router();

/** POST /api/services */
servicesRouter.post('/', createHandler('services', {
  idPrefix: 's',
  requiredFields: ['name'],
  label: 'service',
}));
