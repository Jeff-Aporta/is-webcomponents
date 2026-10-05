/**
 * 1) Títulos CE → entidades &lt;…&gt;
 * 2) titleHtml:false si el título no trae markup seguro (span/code/…)
 * Sin JSON.stringify del archivo entero (diff mínimo).
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'src/components',
  'src/previews',
  'dist/previews',
  'c:/ContaPyme/PatyIA/_experimental/ISW-TestPatyIA/view',
  'c:/ContaPyme/PatyIA/_experimental/ISW-TestPatyIA/src/js/components/paty',
];

const SAFE = /<\/?(?:code|span|strong|em|b|i|small|br|kbd|samp)\b/i;

function escapeCeInTitleValue(title) {
  return title.replace(/<\/?([a-zA-Z][\w]*-[\w.-]*)\b[^>]*>/g, (m) => {
    if (m.includes('&lt;') || m.includes('&gt;')) return m;
    return m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
}

function patchText(raw) {
  let hits = { title: 0, htmlFlag: 0, heading: 0, nota: 0 };
  let s = raw.replace(/("title"\s*:\s*")((?:\\.|[^"\\])*)(")/g, (_, a, body, b) => {
    // Desescapar secuencias JSON para trabajar el valor
    const value = JSON.parse(`"${body}"`);
    const next = escapeCeInTitleValue(value);
    if (next !== value) hits.title++;
    return a + JSON.stringify(next).slice(1, -1) + b;
  });

  // titleHtml true → false cuando el title hermano (misma indentación / objeto) no tiene markup seguro.
  // Heurística: en la ventana ±200 chars alrededor de titleHtml, mirar el title más cercano.
  s = s.replace(/("titleHtml"\s*:\s*)true\b/g, (m, a, offset, full) => {
    const from = Math.max(0, offset - 240);
    const to = Math.min(full.length, offset + 80);
    const window = full.slice(from, to);
    const tm = /"title"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(window);
    if (!tm) return m;
    let title;
    try {
      title = JSON.parse(`"${tm[1]}"`);
    } catch {
      return m;
    }
    if (SAFE.test(title)) return m;
    hits.htmlFlag++;
    return `${a}false`;
  });

  s = s.replace(/(\bheading\s*=\s*")([^"]*)(")/gi, (_, a, body, b) => {
    if (!/[<>]/.test(body) || /&lt;|&gt;/.test(body)) return _;
    // heading es atributo: escapar < >
    const n = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (n === body) return _;
    hits.heading++;
    return a + n + b;
  });

  s = s.replace(
    /<(p|span)(\s+[^>]*\b(?:nota|demo-label|cap)\b[^>]*)>([^<]*)<\/\1>/gi,
    (m, tag, attrs, body) => {
      if (!/[<>]/.test(body) || /&lt;|&gt;/.test(body)) return m;
      const n = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (n === body) return m;
      hits.nota++;
      return `<${tag}${attrs}>${n}</${tag}>`;
    },
  );

  return { s, hits };
}

let files = 0;
const totals = { title: 0, htmlFlag: 0, heading: 0, nota: 0 };

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      walk(p);
      continue;
    }
    if (!ent.name.endsWith('.json')) continue;
    const raw = fs.readFileSync(p, 'utf8');
    const { s, hits } = patchText(raw);
    if (s === raw) continue;
    fs.writeFileSync(p, s, 'utf8');
    files++;
    for (const k of Object.keys(totals)) totals[k] += hits[k];
  }
}

for (const r of roots) walk(r);
console.log(JSON.stringify({ files, ...totals }, null, 2));
