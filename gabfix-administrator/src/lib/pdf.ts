/**
 * PDF downloads (Phase 2, plan §12): fetch the authenticated document,
 * convert to a blob and let the browser save it. The server's
 * Content-Disposition names the file (INV-00098.pdf), so the anchor uses the
 * pathname it can extract, falling back to a generic name.
 */
export async function downloadDocument(type: string, ref: string): Promise<void> {
  const response = await fetch(`/api/documents/${type}/${ref}.pdf`);
  if (!response.ok) throw new Error(`Document failed (${response.status})`);
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = match?.[1] ?? `${type}-${ref}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** No-id form for the range/register reports (aging, assets, pl). */
export async function downloadReport(type: string, params?: { from?: string; to?: string }): Promise<void> {
  const query = params?.from && params?.to ? `?from=${params.from}&to=${params.to}` : '';
  const response = await fetch(`/api/documents/${type}.pdf${query}`);
  if (!response.ok) throw new Error(`Report failed (${response.status})`);
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = match?.[1] ?? `${type}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
