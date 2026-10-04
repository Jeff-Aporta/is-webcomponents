// Phase V3 helper: fix 43 CSS Parts issues across .md files.
// Reads .ts to detect declared parts and adjusts the corresponding .md
// file under the same directory: adds new rows to existing "### CSS parts"
// tables or appends the section if missing. Removes over-documented parts.
// Idempotent: re-running on a fixed file is a no-op.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const componentsRoot = join(root, 'src', 'components');

function normalize(lineending) {
  return lineending.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
function denormalize(text) {
  // CRLF to match the repo convention
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
}

function extractDeclaredParts(src) {
  const found = new Set();
  const attrRe = /part\s*=\s*"([^"]+)"|part\s*=\s*'([^']+)'/g;
  for (const m of src.matchAll(attrRe)) {
    const val = m[1] ?? m[2];
    val.split(/\s+/).filter(Boolean).forEach((p) => found.add(p));
  }
  const setRe = /setAttribute\s*\(\s*['"]part['"]\s*,\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(setRe)) {
    m[1].split(/\s+/).filter(Boolean).forEach((p) => found.add(p));
  }
  return [...found].sort();
}

function extractExportedParts(src) {
  const found = new Set();
  const attrRe = /exportparts\s*=\s*"([^"]+)"|exportparts\s*=\s*'([^']+)'/g;
  for (const m of src.matchAll(attrRe)) {
    const val = (m[1] ?? m[2]).trim();
    if (!val) continue;
    for (const entry of val.split(/[,\s]+/).filter(Boolean)) {
      const [internal, external] = entry.split(':');
      const exposed = (external ?? internal).trim();
      if (exposed) found.add(exposed);
    }
  }
  return [...found].sort();
}

function parseMdCssParts(md) {
  const lines = normalize(md).split('\n');
  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{1,6}\s*(?:css\s+parts|partes\s+css)\s*$/i);
    if (m) { headingIdx = i; break; }
  }
  if (headingIdx === -1) return null;

  // Check if there's a table directly following
  for (let i = headingIdx + 1; i < Math.min(lines.length, headingIdx + 60); i++) {
    const header = lines[i];
    const sep = lines[i + 1] ?? '';
    if (
      header.trim().startsWith('|') &&
      /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(sep)
    ) {
      const rows = [];
      for (let j = i + 2; j < lines.length; j++) {
        const row = lines[j];
        if (!row.trim().startsWith('|')) break;
        const cells = row.split('|').map((c) => c.trim()).filter((c) => c !== '');
        if (cells.length < 2) continue;
        const description = cells.slice(1).join(' | ');
        const firstRaw = cells[0].replace(/^`+|`+$/g, '');
        const candidates = firstRaw.split(/\s*\/\s*/);
        for (const cand of candidates) {
          const trimmed = cand.trim();
          const partMatch = trimmed.match(/^::part\(["']?([\w-]+)["']?\)$/) || trimmed.match(/^([\w-]+)$/);
          if (!partMatch) continue;
          rows.push({ part: partMatch[1], description });
        }
      }
      return { headingIdx, tableStart: i, rows };
    }
  }
  // Section heading present but no table → empty section
  return { headingIdx, tableStart: -1, rows: [] };
}

function appendRowsToTable(md, rowsToAdd, filePath) {
  const norm = normalize(md);
  const lines = norm.split('\n');
  const parsed = parseMdCssParts(norm);
  if (!parsed) return { md, added: 0, removed: 0 };

  // If there's no existing table, insert one just after the heading
  if (parsed.tableStart === -1) {
    const table = mdTable(rowsToAdd);
    const insertAt = parsed.headingIdx + 1;
    const before = lines.slice(0, insertAt);
    const after = lines.slice(insertAt);
    // Remove any stray text after heading until the next ## heading (consume blank lines too)
    const cleanedAfter = [];
    let skipStrays = true;
    for (const l of after) {
      if (skipStrays && /^#{1,6}\s/.test(l)) skipStrays = false;
      if (skipStrays) continue;
      cleanedAfter.push(l);
    }
    const updated = [...before, '', table, '', ...cleanedAfter].join('\n');
    return { md: denormalize(updated), added: rowsToAdd.length, removed: 0, filePath };
  }

  // Add rows at the end of the existing table (just before the next non-table line)
  const tableStart = parsed.tableStart;
  let tableEnd = parsed.tableStart + 2; // skip header + sep
  for (let j = tableStart + 2; j < lines.length; j++) {
    if (!lines[j].trim().startsWith('|')) break;
    tableEnd = j + 1;
  }

  const newRows = rowsToAdd.map((r) => `| \`${r.part}\` | ${r.description} |`);
  const before = lines.slice(0, tableEnd);
  const after = lines.slice(tableEnd);
  const updated = [...before, ...newRows, ...after].join('\n');

  return { md: denormalize(updated), added: newRows.length, removed: 0, filePath };
}

function removeRowsFromTable(md, partsToRemove, filePath) {
  const norm = normalize(md);
  const lines = norm.split('\n');
  const parsed = parseMdCssParts(norm);
  if (!parsed || parsed.tableStart === -1) return { md, added: 0, removed: 0, filePath };

  const tableStart = parsed.tableStart;
  let tableEnd = parsed.tableStart + 2;
  for (let j = tableStart + 2; j < lines.length; j++) {
    if (!lines[j].trim().startsWith('|')) break;
    tableEnd = j + 1;
  }

  const removeSet = new Set(partsToRemove);
  const updated = [];
  let removed = 0;
  for (let j = 0; j < lines.length; j++) {
    if (j >= tableStart + 2 && j < tableEnd) {
      const row = lines[j];
      if (!row.trim().startsWith('|')) { updated.push(row); continue; }
      const cells = row.split('|').map((c) => c.trim()).filter((c) => c !== '');
      if (cells.length < 2) { updated.push(row); continue; }
      const firstRaw = cells[0].replace(/^`+|`+$/g, '');
      const candidates = firstRaw.split(/\s*\/\s*/);
      const remove = candidates.some((c) => {
        const t = c.trim();
        const m = t.match(/^::part\(["']?([\w-]+)["']?\)$/) || t.match(/^([\w-]+)$/);
        return m && removeSet.has(m[1]);
      });
      if (remove) {
        removed++;
        continue;
      }
      updated.push(row);
    } else {
      updated.push(lines[j]);
    }
  }
  return { md: denormalize(updated.join('\n')), added: 0, removed, filePath };
}

function appendSection(md, sectionName, tableMarkdown, filePath) {
  const norm = normalize(md);
  const lines = norm.split('\n');

  // Find a good insertion point: after "### Métodos y propiedades públicas" or before "### Custom states"
  const candidates = [
    /^### Custom states\b/i,
    /^### CSS custom properties\b/i,
    /^## Comportamiento\b/i,
    /^## Dependencias\b/i,
    /^## Accesibilidad\b/i,
    /^## Ejemplo avanzado\b/i,
    /^## Errores comunes\b/i,
    /^## Reglas para LLM\b/i,
    /^## Fuentes\b/i,
  ];
  let insertIdx = -1;
  for (const re of candidates) {
    const idx = lines.findIndex((l) => re.test(l));
    if (idx >= 0) { insertIdx = idx; break; }
  }
  if (insertIdx < 0) {
    insertIdx = lines.length;
  }

  const sectionLines = ['', `### CSS parts`, '', tableMarkdown, ''];
  const before = lines.slice(0, insertIdx);
  const after = lines.slice(insertIdx);
  const updated = [...before, ...sectionLines, ...after].join('\n');
  return { md: denormalize(updated), added: 1, removed: 0, filePath };
}

function mdTable(parts) {
  const header = '| Part | Uso |';
  const sep = '| --- | --- |';
  const rows = parts.map((p) => `| \`${p.part}\` | ${p.description} |`);
  return [header, sep, ...rows].join('\n');
}

// Custom descriptions for parts that benefit from richer explanations
const DESCRIPTIONS = {
  'sr-status': 'Region `aria-live` para anuncios a lectores de pantalla (oculta visualmente).',
  'feedback': 'Panel flotante que muestra el resultado del copy (success/error).',
  'feedback-body': 'Cuerpo del panel `feedback` (mensaje + icono).',
  'detail-panel': 'Panel desplegable de detalle por fila.',
  'header-cell': 'Cada celda de la fila de encabezados.',
  'option': 'Cada opción del listado.',
  'day': 'Cada celda de día en la grilla.',
  'week-number': 'Columna de número de semana.',
  'month': 'Cada celda de mes en la grilla anual.',
  'year': 'Cada celda de año en la grilla multi-anual.',
  'file': 'Cada fila de la lista de archivos.',
  'remove-button': 'Botón para quitar un archivo de la lista.',
  'check': 'Icono check que marca la opción seleccionada.',
  'group': '`<optgroup>` del listado.',
  'group-label': 'Etiqueta del `<optgroup>`.',
  'option-description': 'Texto secundario bajo la etiqueta de la opción.',
  'option-start': 'Slot/icono a la izquierda de la opción.',
  'tag': 'Cada chip del modo multi-selección.',
  'tag-more': 'Chip `+N` que indica cuántas opciones más hay.',
  'mark': 'Pastilla con el color de la paleta activa.',
  'number': 'Cada dígito numérico mostrado en el reloj.',
  'mark-label': 'Etiqueta de la marca bajo el thumb.',
  'dialog-filename': 'Subtítulo del diálogo con el nombre del archivo.',
  'footer': 'Pie del diálogo.',
  'footer-discard': 'Botón «Descartar» del pie.',
  'footer-download': 'Botón «Descargar» del pie.',
  'footer-meta': 'Metadatos del archivo en el pie (tamaño, fecha, etc.).',
  'footer-save': 'Botón «Guardar» del pie.',
  'vars': 'Sección de variables detectadas en el markdown.',
  'vars-label': 'Título de la sección de variables.',
  'vars-list': 'Lista de variables detectadas.',
  'popup__arrow': 'Flecha del popover.',
  'popup__hover-bridge': 'Puente invisible que mantiene el hover entre trigger y popup.',
  'popup__popup': 'Panel flotante interno del popover.',
  'base__arrow': 'Flecha del tooltip.',
  'base__popup': 'Panel flotante interno del tooltip.',
  'pk-backdrop': 'Backdrop del modal de clave primaria.',
  'pk-modal': 'Modal que pide el PK antes de una acción.',
  'resizer': 'Asidero de redimensionado de la ventana.',
  'keys': 'Fila con los atajos de teclado mostrados.',
  'playlist-duration': 'Duración de cada vídeo en la lista.',
  'playlist-item': 'Cada fila individual del listado.',
  'playlist-thumbnail': 'Miniatura de cada vídeo.',
  'playlist-title': 'Título de cada vídeo.',
  'aside': 'Barra lateral complementaria (TOC).',
  'main': 'Área principal del contenido.',
  'page': 'Página completa (aside + main).',
  'toc-drawer': 'Drawer que contiene el TOC en móvil.',
  'toc-toggle': 'Botón para abrir/cerrar el TOC.',
  'hint': 'Texto de ayuda o instrucción.',
  'preview': 'Previsualización capturada.',
  'download': 'Botón/enlace de descarga.',
  'status': '`<output>` con el estado del componente.',
  'bar': 'Barra de nivel/vu-meter.',
  'transcript': 'Texto transcrito del audio.',
  'image': 'El `<img>` interno.',
  'body': 'Cuerpo del componente.',
  'config': 'Panel de configuración.',
  'controls': 'Fila de controles.',
  'head': 'Cabecera.',
  'lede': 'Párrafo introductorio bajo el título.',
  'stage': 'Escenario donde se renderiza el contenido.',
  'stage-wrap': 'Contenedor del escenario.',
  'title': 'Título del playground.',
  'value': 'El `<output>` con el valor formateado.',
  'base': 'Personalizable con `::part(base)`.',
  'canvas': 'Personalizable con `::part(canvas)`.',
  'root': 'Personalizable con `::part(root)`.',
  'button': 'Personalizable con `::part(button)`.',
  'editor': 'Personalizable con `::part(editor)`.',
};

function descriptionFor(part) {
  return DESCRIPTIONS[part] ?? `Personalizable con \`::part(${part})\`.`;
}

// Main: walk every .ts and compare to its .md.
import { readdirSync, statSync } from 'node:fs';

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.ts')) out.push(p);
  }
  return out;
}

const allTs = walk(componentsRoot);
const summary = { touched: 0, added: 0, removed: 0, files: [] };

for (const tsPath of allTs) {
  const base = basename(tsPath, '.ts');
  const mdPath = join(dirname(tsPath), `${base}.md`);
  let hasMd = true;
  try { statSync(mdPath); } catch { hasMd = false; }
  if (!hasMd) continue;

  const src = readFileSync(tsPath, 'utf8');
  const declared = extractDeclaredParts(src);
  const exported = extractExportedParts(src);
  const exposed = [...new Set([...declared, ...exported])].sort();
  if (exposed.length === 0) continue;

  let md = readFileSync(mdPath, 'utf8');
  const parsed = parseMdCssParts(md);
  const documented = parsed ? parsed.rows.map((r) => r.part) : [];

  const exposedSet = new Set(exposed);
  const documentedSet = new Set(documented);

  const missing = exposed.filter((p) => !documentedSet.has(p));
  const undocumented = documented.filter((p) => !exposedSet.has(p));

  if (missing.length === 0 && undocumented.length === 0) continue;

  let result = null;

  // If section exists, mutate in place (remove over-doc, then add missing)
  if (parsed) {
    if (undocumented.length > 0) {
      result = removeRowsFromTable(md, undocumented, relative(root, mdPath));
      md = result.md;
    }
    if (missing.length > 0) {
      const newRows = missing.map((part) => ({ part, description: descriptionFor(part) }));
      result = appendRowsToTable(md, newRows, relative(root, mdPath));
      md = result.md;
    }
  } else {
    // No section → add it with all declared parts.
    const allRows = exposed.map((part) => ({ part, description: descriptionFor(part) }));
    result = appendSection(md, 'CSS parts', mdTable(allRows), relative(root, mdPath));
    md = result.md;
  }

  writeFileSync(mdPath, md, 'utf8');
  summary.touched++;
  summary.added += missing.length;
  summary.removed += undocumented.length;
  summary.files.push({
    file: relative(root, mdPath),
    added: missing,
    removed: undocumented,
    hadSection: !!parsed,
  });
}

console.log(JSON.stringify(summary, null, 2));