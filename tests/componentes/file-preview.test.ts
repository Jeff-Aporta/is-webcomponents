// Guardian familia file-preview (S-FP1 / S-FP3)
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));
const shared = join(root, 'src/components/files/_shared').replace(/\\/g, '/');

const { resolveFileSource } = await import(`file:///${shared}/file-source.ts`);
const { resolveDispatch, resolveFileKind, extOf } = await import(`file:///${shared}/mime-map.ts`);
const { parseCsv, toCsv } = await import(`file:///${shared}/csv-parse.ts`);

const failures = [];
let checks = 0;
function eq(a, e, msg) {
  checks++;
  const A = JSON.stringify(a);
  const E = JSON.stringify(e);
  if (A !== E) failures.push(`${msg}: got ${A} expected ${E}`);
}

eq(resolveFileSource(null, null).kind, 'empty', 'empty');
eq(resolveFileSource('/a.txt', null).kind, 'src', 'src');
eq(resolveFileSource('/a.txt', 'hola').kind, 'content', 'content wins');
eq(resolveFileSource('/a.txt', 'hola').content, 'hola', 'content value');

eq(extOf('https://x/y/z.CSV?q=1'), 'csv', 'ext csv');
eq(resolveFileKind({ name: 'a.csv' }), 'csv', 'kind csv');
eq(resolveFileKind({ type: 'application/pdf' }), 'pdf', 'kind pdf mime');
eq(resolveFileKind({ src: '/docs/manual.PDF' }), 'pdf', 'kind pdf ext');

const csvView = resolveDispatch({ name: 't.csv', mode: 'view' });
eq(csvView.tag, 'iswc-csv-view', 'dispatch csv view');
eq(csvView.unsupported, false, "csv view ok");

const pdfEdit = resolveDispatch({ type: 'application/pdf', mode: 'edit' });
eq(pdfEdit.unsupported, true, "pdf edit unsupported");
eq(pdfEdit.tag, null, "pdf edit null tag");

const docx = resolveDispatch({ name: 'x.docx', mode: 'view' });
eq(docx.tag, 'iswc-docx-view', 'docx view');

const rows = parseCsv('a,"b,c"\n1,2');
eq(rows[0], ['a', 'b,c'], 'csv quoted');
eq(parseCsv(toCsv(rows)), rows, "csv roundtrip");

if (failures.length) {
  console.error('FAIL', failures.length, '/', checks);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log(`OK file-preview ${checks} checks`);
