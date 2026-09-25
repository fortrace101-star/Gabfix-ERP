import { Router } from 'express';
import { createHandler, updateHandler } from './handlers';

export const jobsRouter = Router();

/** POST /api/jobs */
jobsRouter.post('/', createHandler('jobs', {
  idPrefix: 'j',
  requiredFields: ['number', 'customerId', 'branchId', 'serviceId', 'date', 'revenue'],
  label: 'job',
}));

/** PATCH /api/jobs/:id — status, assignees, equipment usage, revenue, cost. */
jobsRouter.patch('/:id', updateHandler('jobs', { notFound: 'Job not found', label: 'job update' }));
