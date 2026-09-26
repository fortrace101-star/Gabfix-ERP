/** CSV export helpers (Phase 0.10 client split) — used by every Export action. */

export const toCsv = (rows: (string | number)[][]) =>
  rows.map(row => row.map(cell => {
    const value = String(cell ?? '');
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(',')).join('\r\n');

/** Download rows as a CSV file — used by every Export action in the workspace. */
export const exportCsv = (filename: string, rows: (string | number)[][]) => {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/** Same download with a .csv extension appended (view-level convention). */
export const downloadCsv = (filename: string, rows: (string | number)[][]) => exportCsv(`${filename}.csv`, rows);
