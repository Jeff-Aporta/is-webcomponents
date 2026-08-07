/**
 * Añade equivHtml a demos piloto (button-group toolbar/api, fab, button).
 * node scripts/patch-equiv-actions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function patchFile(rel, bySection, { fillRest } = {}) {
  const path = join(root, rel);
  const def = JSON.parse(readFileSync(path, 'utf8'));
  let n = 0;
  for (const section of def.sections) {
    const patch = bySection[section.id];
    for (const block of section.blocks) {
      if (block.kind !== 'demo') continue;
      if (patch) {
        Object.assign(block, patch);
        n += 1;
      } else if (fillRest && !block.equivHtml) {
        Object.assign(block, fillRest(section));
        n += 1;
      }
    }
  }
  writeFileSync(path, `${JSON.stringify(def, null, 2)}\n`, 'utf8');
  console.log(`OK ${rel}: ${n} demos`);
}

patchFile('src/previews/actions/is-button-group.json', {
  toolbar: {
    equivNote: 'Toolbar de iconos: role=toolbar + botones con aria-label.',
    equivHtml: `<div role="toolbar" aria-label="Historial">
  <button type="button" aria-label="Deshacer">Undo</button>
  <button type="button" aria-label="Rehacer">Redo</button>
</div>`,
  },
  api: {
    equivHtml: `<div role="radiogroup" aria-label="Demo">
  <button type="button" role="radio" aria-checked="false">A</button>
  <button type="button" role="radio" aria-checked="true">B</button>
  <button type="button" role="radio" aria-checked="false">C</button>
</div>`,
  },
});

patchFile('src/previews/actions/is-fab.json', {
  intro: {
    equivNote: 'FAB ≈ botón circular; el kit aporta elevación, posiciones y pulse.',
    equivHtml: '<button type="button" aria-label="Crear">+</button>',
  },
  sizes: {
    equivHtml: `<!-- font-size del host escala el FAB -->
<button type="button" aria-label="Crear" style="font-size:0.85rem">+</button>
<button type="button" aria-label="Crear" style="font-size:1rem">+</button>
<button type="button" aria-label="Crear" style="font-size:1.25rem">+</button>`,
  },
  variants: {
    equivHtml: `<button type="button" aria-label="Crear">+</button>
<button type="button" aria-label="Crear">+</button><!-- outlined vía CSS propio -->`,
  },
  extended: {
    equivNote: 'extended = icono + etiqueta visible.',
    equivHtml: `<button type="button">
  <span aria-hidden="true">+</span>
  Crear
</button>`,
  },
  positions: {
    equivHtml: `<button type="button" aria-label="Crear"
  style="position:fixed; inset:auto 1.5rem 1.5rem auto">+</button>`,
  },
  pulse: {
    equivHtml: `<button type="button" aria-label="Crear" class="pulse">+</button>
<!-- .pulse sería CSS propio; el kit usa el atributo pulse -->`,
  },
});

const buttonFlow = `<is-flowchart open-on-click>
  <script type="application/json">
  {
    "flowchart": {
      "title": "Que pinta is-button",
      "direction": "TB",
      "nodes": [
        { "id": "q", "label": "tiene href?", "shape": "diamond" },
        { "id": "a", "label": "elemento a (enlace)", "shape": "stadium" },
        { "id": "q2", "label": "type submit/reset?", "shape": "diamond" },
        { "id": "b", "label": "button submit|reset", "shape": "stadium" },
        { "id": "c", "label": "button type=button", "shape": "stadium" }
      ],
      "edges": [
        { "from": "q", "to": "a", "label": "si" },
        { "from": "q", "to": "q2", "label": "no" },
        { "from": "q2", "to": "b", "label": "si" },
        { "from": "q2", "to": "c", "label": "no" }
      ]
    }
  }
  </script>
</is-flowchart>`;

patchFile(
  'src/previews/actions/is-button.json',
  {
    intro: {
      equivNote:
        'Segun attrs, el host se comporta como button o como enlace. El diagrama resume las ramas.',
      equivHtml: '<button type="button">Accion</button>',
      equivFlow: buttonFlow,
    },
    variants: {
      equivHtml: `<button type="button">Filled</button>
<button type="button">Outlined</button>
<button type="button">Plain</button>
<button type="button">Soft</button>
<!-- variant es skin del kit -->`,
    },
    colors: {
      equivHtml: `<button type="button">Brand</button>
<button type="button">Neutral</button>
<button type="button">Success</button>
<button type="button">Warning</button>
<button type="button">Danger</button>`,
    },
    href: {
      equivNote: 'Con href, is-button usa un ancla en el shadow (no un button).',
      equivHtml: '<a href="https://example.com">Ir al sitio</a>',
    },
    disabled: {
      equivHtml: '<button type="button" disabled>No disponible</button>',
    },
    loading: {
      equivHtml: `<button type="button" aria-busy="true" disabled>
  Guardando…
</button>`,
    },
    icons: {
      equivHtml: `<button type="button">
  <span aria-hidden="true">★</span>
  Destacar
</button>`,
    },
  },
  {
    fillRest: () => ({
      equivNote:
        'Equivalente nativo generico de is-button: button type=button (o a si hay href).',
      equivHtml: '<button type="button">…</button>',
    }),
  },
);
