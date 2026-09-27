import type { Request, Response } from 'express';
import { Router } from 'express';
import { DOCUMENT_TYPES, renderTypedDocument, type DocumentType } from '../services/pdf/documents';
import { fail } from '../lib/http';

/**
 * Document downloads (Phase 2, plan §12): GET /api/documents/:type/:id.pdf.
 * Attachment disposition with the numbered filename, so "Save as" defaults
 * to INV-00098.pdf. Every render is mirrored into DOCUMENT_STORAGE_DIR by
 * the service so messaging can attach the same bytes later.
 */
export const documentsRouter = Router();

documentsRouter.get('/:type/:id.pdf', async (req: Request, res: Response) => {
  try {
    const type = req.params.type as DocumentType;
    if (!DOCUMENT_TYPES.includes(type)) {
      return res.status(404).json({ error: `Unknown document type ${req.params.type}` });
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const document = await renderTypedDocument(type, id.replace(/\.pdf$/i, ''));
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res
      .status(200)
      .contentType('application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.send(document.buffer);
  } catch (error) {
    fail(res, error, 'Document render failed');
  }
});
