import type { Request, Response } from 'express';
import { insertRecord, updateRecord } from '../repositories/records';
import { fail } from '../lib/http';
import { parseBody } from '../validation/common';
import type { Resource } from '../validation/resources';

/** Everything a create handler needs beyond the resource schema. */
export type CreateOptions = {
  /** Primary-key prefix, e.g. `c` for customers. */
  idPrefix: string;
  /** Server-side defaults applied after validation (`date`, `usage`, ...). */
  prepare?: (data: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * POST handler: validates the body against the resource schema (unknown fields
 * become 422), inserts one row and answers 201 with its id.
 */
export function createHandler(resource: Resource, options: CreateOptions) {
  return async (req: Request, res: Response) => {
    try {
      const parsed = parseBody(resource.create, req.body) as Record<string, unknown>;
      const data = options.prepare ? options.prepare(parsed) : parsed;
      const id = await insertRecord(resource, data, `${options.idPrefix}${Date.now()}`);
      res.status(201).json({ id });
    } catch (error) {
      fail(res, error, `Invalid ${resource.label}`);
    }
  };
}

/** PATCH handler: validates the patch, updates one row, 404s for an unknown id. */
export function updateHandler(resource: Resource, options: { notFound: string; label: string }) {
  return async (req: Request, res: Response) => {
    try {
      if (!resource.patch) throw new Error(`No update schema for ${resource.table}`);
      const parsed = parseBody(resource.patch, req.body) as Record<string, unknown>;
      // Express 5 types a route param as string | string[]; ids are never arrays.
      const updated = await updateRecord(resource, String(req.params.id), parsed);
      if (!updated) return res.status(404).json({ error: options.notFound });
      res.json({ ok: true });
    } catch (error) {
      fail(res, error, `Invalid ${options.label}`);
    }
  };
}
