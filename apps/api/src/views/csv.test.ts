import { describe, expect, it } from 'vitest';
import { buildCsv, escapeCsvCell } from './csv.js';

describe('csv', () => {
  it('quotes cells with commas, quotes, and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');
  });

  it('neutralises spreadsheet formulas in strings but not numbers', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvCell(-5)).toBe('-5');
  });

  it('renders null as empty and joins rows with CRLF', () => {
    expect(buildCsv(['a', 'b'], [[1, null]])).toBe('a,b\r\n1,\r\n');
  });
});
