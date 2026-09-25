import type { Request, Response } from 'express';
import { insertRecord, updateRecord } from '../repositories/records';
import { fail, required } from '../lib/http';

/** Everything a create handler needs to know about one resource. */
export type CreateOptions = {
  /** Primary-key prefix, e.g. `c` for customers. */
  idPrefix: string;
  requiredFields: string[];
  /** Fills in server-side defaults for fields the client omitted. */
  prepare?: (body: Record<string, unknown>) => Record<string, unknown>;
  /** Used in the fallback error message, e.g. "customer" -> "Invalid customer". */
  label: string;
};

/** POST handler that inserts a single row and answers 201 with its id. */
export function createHandler(table: string, options: CreateOptions) {
  return async (req: Request, res: Response) => {
    try {
      const body = options.prepare ? options.prepare(req.body ?? {}) : (req.body ?? {});
      required(body, options.requiredFields);
      const id = await insertRecord(table, body, `${options.idPrefix}${Date.now()}`);
      res.status(201).json({ id });
    } catch (error) {
      fail(res, error, `Invalid ${options.label}`);
    }
  };
}

/** PATCH handler that updates a single row by id and answers 404 when unknown. */
export function updateHandler(table: string, options: { notFound: string; label: string }) {
  return async (req: Request, res: Response) => {
    try {
      // Express 5 types a route param as string | string[]; ids are never arrays.
      const updated = await updateRecord(table, String(req.params.id), req.body ?? {});
      if (!updated) return res.status(404).json({ error: options.notFound });
      res.json({ ok: true });
    } catch (error) {
      fail(res, error, `Invalid ${options.label}`);
    }
  };
}
