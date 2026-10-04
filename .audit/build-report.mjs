// Build the final audit Markdown report from parts-raw.json.
import { readFileSync } from 'node:fs';

const raw = readFileSync('.audit/parts-raw.json', 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(raw);

const total = data.length;
const noSection = data.filter((c) => !c.hasCssPartsSection);
const withSection = data.filter((c) => c.hasCssPartsSection);
const totalMissing = data.reduce((sum, c) => sum + c.missing.length, 0);
const totalUndocumented = data.reduce((sum, c) => sum + c.undocumented.length, 0);
const totalIssues = data.filter((c) => c.missing.length || c.undocumented.length || !c.hasCssPartsSection).length;

const lines = [];
const today = new Date().toISOString().slice(0, 10);

function push() {
  for (let i = 0; i < arguments.length; i++) lines.push(arguments[i]);
}

push('# Audit CSS Parts — is-webcomponents', '');
push('- **Generated:** ' + today);
push('- **Scope:** every `.ts` component in `src/components/**` that exposes at least one `::part()` and has a sibling `<comp>.md`.');
push('- **Detection:** `part="…"` literals, `setAttribute("part", "…")`, and `exportparts="internal:external"` aliases. CSS Parts sections in the `.md` files are parsed from the Markdown table immediately under the `### CSS parts` heading.');
push('');

// ---- Summary ----
push('## Resumen', '');
push('| Métrica | Total |');
push('| --- | --- |');
push('| Componentes auditados (con parts y `.md`) | **' + total + '** |');
push('| Componentes con sección "CSS parts" en `.md` | **' + withSection.length + '** |');
push('| Componentes SIN sección "CSS parts" en `.md` | **' + noSection.length + '** |');
push('| Componentes con issues (faltan docs o sobran docs) | **' + totalIssues + '** |');
push('| Parts declarados pero no documentados (missing) | **' + totalMissing + '** |');
push('| Parts documentados pero no declarados (undocumented) | **' + totalUndocumented + '** |');
push('');

// ---- Per-component table ----
push('## Tabla por componente', '');
push('Columnas:');
push('- **Component** → tag `<iswc-…>`.');
push('- **File** → ruta del `.ts` fuente.');
push('- **Declared** → parts propios (`part="…"`) + nombres expuestos vía `exportparts`.');
push('- **Documented** → parts listados en la tabla CSS parts del `.md`.');
push('- **Issues** → flags: ⚠️ `missing`, 🚫 `undocumented`, ❌ `no-section`.');
push('');
push('| Component | File | Declared | Documented | Issues |');
push('| --- | --- | --- | --- | --- |');
for (const c of data) {
  const issues = [];
  if (!c.hasCssPartsSection) issues.push('❌ no-section');
  if (c.missing.length) issues.push('⚠️ missing: ' + c.missing.map((p) => '`' + p + '`').join(', '));
  if (c.undocumented.length) issues.push('🚫 undocumented: ' + c.undocumented.map((p) => '`' + p + '`').join(', '));
  const declaredCell = c.exposed.length ? c.exposed.map((p) => '`' + p + '`').join(' ') : '—';
  const documentedCell = c.documented.length ? c.documented.map((p) => '`' + p + '`').join(' ') : '—';
  const fileLink = '`' + c.file + '`';
  const issuesCell = issues.length ? issues.join('<br>') : '—';
  push('| `<iswc-' + c.component.replace(/^iswc-/, '') + '>` | ' + fileLink + ' | ' + declaredCell + ' | ' + documentedCell + ' | ' + issuesCell + ' |');
}
push('');

// ---- Components WITHOUT CSS Parts section ----
push('## ❌ Componentes SIN sección "CSS parts" en `.md`', '');
push('Estos componentes exponen parts pero su `.md` no documenta la API. Tienen que añadir la sección:', '');
push('| Component | Parts expuestos |');
push('| --- | --- |');
for (const c of noSection) {
  const parts = c.exposed.map((p) => '`' + p + '`').join(' ');
  push('| `<iswc-' + c.component.replace(/^iswc-/, '') + '>` | ' + parts + ' |');
}
push('');

// ---- Components with parts missing from .md ----
push('## ⚠️ Parts declarados pero NO documentados', '');
push('Aparecen en `part="…"` / `exportparts="…"` del `.ts` pero el `.md` no los lista. Posibles causas: sección CSS Parts inexistente o incompleta, o partes internas que se filtran al exterior sin querer.', '');
push('| Component | Parts faltantes en `.md` |');
push('| --- | --- |');
const withMissing = data.filter((c) => c.missing.length);
for (const c of withMissing) {
  const parts = c.missing.map((p) => '`' + p + '`').join(' ');
  push('| `<iswc-' + c.component.replace(/^iswc-/, '') + '>` | ' + parts + ' |');
}
push('');

// ---- Components with parts documented but not exposed ----
push('## 🚫 Parts documentados pero NO declarados', '');
push('El `.md` los promete pero el `.ts` no los expone. Son deuda: o se eliminan de la doc o se implementan.', '');
push('| Component | Parts no expuestos |');
push('| --- | --- |');
const withUndoc = data.filter((c) => c.undocumented.length);
for (const c of withUndoc) {
  const parts = c.undocumented.map((p) => '`' + p + '`').join(' ');
  push('| `<iswc-' + c.component.replace(/^iswc-/, '') + '>` | ' + parts + ' |');
}
push('');

// ---- Per-component Part + Descripción tables (per brief spec) ----
push('## Tablas por componente: `Part | Descripción`', '');
push('Para cada componente auditado, la tabla siguiente lista los parts declarados en `.ts`, su presencia/ausencia en `.md`, y la descripción (cuando existe) del `.md`.', '');
push('Leyenda de la columna "Estado": ✅ documentado · ⚠️ declarado pero no documentado · 🚫 documentado pero no declarado · ❓ `.md` sin sección CSS parts.', '');

for (const c of data) {
  push('### `<iswc-' + c.component.replace(/^iswc-/, '') + '>`', '');
  push('Archivo: `' + c.file + '`');
  push('');
  push('| Part | Descripción | Estado |');
  push('| --- | --- | --- |');
  const all = new Set([...c.exposed, ...c.documented]);
  const sorted = [...all].sort();
  for (const part of sorted) {
    const exposed = c.exposed.includes(part);
    const documented = c.documented.includes(part);
    let status;
    let desc = '—';
    if (!c.hasCssPartsSection) {
      status = '⚠️ declarado · ❓ `.md` sin sección';
    } else if (exposed && documented) {
      status = '✅';
      desc = c.documentedDescriptions[part] || '—';
    } else if (exposed && !documented) {
      status = '⚠️ declarado pero no documentado';
    } else if (!exposed && documented) {
      status = '🚫 documentado pero no declarado';
      desc = c.documentedDescriptions[part] || '—';
    }
    push('| `' + part + '` | ' + desc + ' | ' + status + ' |');
  }
  push('');
}

// ---- Note on sr-status ----
const srStatusMissing = data.filter((c) => c.missing.includes('sr-status'));
if (srStatusMissing.length) {
  push('## ℹ️ Nota sobre `sr-status`', '');
  push('Varios componentes exponen un `sr-status` (región `aria-live` para anuncios a lectores de pantalla) pero no lo documentan:', '');
  for (const c of srStatusMissing) {
    push('- `<iswc-' + c.component.replace(/^iswc-/, '') + '>`');
  }
  push('');
  push('Recomendación: documentar como `::part(sr-status)` consistente con el resto del repo.', '');
}

process.stdout.write(lines.join('\n'), 'utf8');