import { Router } from 'express';
import { createHandler, updateHandler } from './handlers';
import { jobsResource } from '../validation/resources';
import { pool } from '../db';
import { dispatchEvent } from '../services/notifications';

export const jobsRouter = Router();

/** POST /api/jobs — server-side JOB-NNNNN numbering via document_sequences. */
jobsRouter.post('/', createHandler(jobsResource, { idPrefix: 'j', sequenceKey: 'job' }));

/** PATCH /api/jobs/:id — status, assignees, equipment usage, revenue, cost. */
jobsRouter.patch('/:id', updateHandler(jobsResource, {
  notFound: 'Job not found',
  label: 'job update',
  afterUpdate: async ({ id, body }) => {
    if (body.status === 'Completed') {
      const client = await pool.connect();
      try {
        await dispatchEvent(client, { type: 'job.completed', entityType: 'jobs', entityId: id });
      } finally {
        client.release();
      }
    }
  },
}));
