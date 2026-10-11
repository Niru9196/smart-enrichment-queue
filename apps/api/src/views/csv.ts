import type { Response } from 'express';

export type CsvCell = string | number | boolean | null | undefined;

// Cells starting with these can be executed as formulas by spreadsheet apps.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';

  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(columns: string[], rows: CsvCell[][]): string {
  return [columns, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n') + '\r\n';
}

/** Sends `csv` as a dated, non-cached download named `<baseName>-YYYY-MM-DD.csv`. */
export function sendCsvAttachment(res: Response, baseName: string, csv: string): void {
  const dateStamp = new Date().toISOString().slice(0, 10);
  res
    .type('text/csv; charset=utf-8')
    .attachment(`${baseName}-${dateStamp}.csv`)
    .setHeader('Cache-Control', 'no-store')
    .send(csv);
}
