import { Router } from 'express';
import { createHandler, updateHandler } from './handlers';
import { jobsResource } from '../validation/resources';

export const jobsRouter = Router();

/** POST /api/jobs */
jobsRouter.post('/', createHandler(jobsResource, { idPrefix: 'j' }));

/** PATCH /api/jobs/:id — status, assignees, equipment usage, revenue, cost. */
jobsRouter.patch('/:id', updateHandler(jobsResource, { notFound: 'Job not found', label: 'job update' }));
