// csv.ts — CSV/TSV con comillas de RFC 4180; detecta el separador al importar.

/** Separador más probable de un texto. */
export function detectDelimiter(text: string): string {
  const head = text.slice(0, 4096).split(/\r?\n/).slice(0, 8);
  let best = ',';
  let score = -1;
  for (const d of [',', ';', '\t', '|']) {
    const counts = head.filter(Boolean).map((l) => parseDelimited(l, d)[0]?.length ?? 1);
    const stable = counts.length > 0 && counts.every((n) => n === counts[0]) ? counts[0] : 0;
    if (stable > 1 && stable > score) {
      best = d;
      score = stable;
    }
  }
  return best;
}

/** Parte un texto en filas y campos. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') { field += ch; continue; }
      if (text[i + 1] === '"') { field += '"'; i++; continue; }
      quoted = false;
      continue;
    }
    if (ch === '"' && field === '') { quoted = true; continue; }
    if (ch === delimiter) { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Serializa filas. */
export function toDelimited(rows: string[][], delimiter = ','): string {
  const quote = (s: string): string => (s.includes(delimiter) || /["\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return rows.map((r) => r.map(quote).join(delimiter)).join('\r\n');
}
