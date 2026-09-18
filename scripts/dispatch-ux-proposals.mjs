#!/usr/bin/env node
// scripts/dispatch-ux-proposals.mjs
//
// F0.3 variante: dispatch de propuestas UX/UI exhaustivas por demo.
//
// En vez de delegar a sub-agentes (que fallan al escribir, Lección 20+25),
// el CAPITÁN produce los prompts y los escribe a .audit/prompts/g<N>.md,
// luego corre sub-agentes_fork en paralelo que SOLO sobrescriben
// .audit/proposals/g<N>.md con el template lleno.
//
// Output: .audit/prompts/g<N>.md (input prompts) + sub-agentes que escriben
//         .audit/proposals/g<N>.md (output).
//
// Uso: node scripts/dispatch-ux-proposals.mjs [--wave N] [--limit N]

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GROUPS = JSON.parse(readFileSync(join(ROOT, '.audit/demo-groups.json'), 'utf8'));
const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

mkdirSync(join(ROOT, '.audit/prompts'), { recursive: true });
mkdirSync(join(ROOT, '.audit/proposals'), { recursive: true });

// Generate one prompt per demo group with deep-test-proposals template.
const writePrompts = () => {
  let count = 0;
  for (const g of GROUPS.groups) {
    if (limit > 0 && count >= limit) break;
    const out = join(ROOT, '.audit/prompts', `${g.id}.md`);
    const demos = g.demos.map(d => `  - src/components/${g.category}/${d}.preview.ts (behavior)`).join('\n');
    const json = g.demos.map(d => `  - src/components/${g.category}/${d}.json (estructura)`).join('\n');
    const prompt = `# F0.3 propuesta UX/UI exhaustiva — ${g.label}

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens \`--is-*\`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Testables del grupo (categoría: ${g.category})

### Demos a auditar (${g.demos.length})
${demos}

### JSON de cada demo (estructura + secciones)
${json}

## Misión
Para CADA demo de este grupo, escribe **al menos 12 propuestas de test UX/UI** que NO estén ya cubiertas. Los tests deben ejercitar comportamiento del usuario real (no solo del desarrollador).

## Categorías obligatorias (adapta al tipo de demo)

### 1. Interacción (5+ propuestas por demo)
- Click en cada botón visible: ¿qué hace? ¿cambia el DOM? ¿emite evento?
- Doble-click, click derecho, long-press donde aplique
- Hover: ¿cambia estilo? ¿aparece tooltip?
- Focus: ¿se ve outline? ¿se restaura al cerrar modal?
- Drag & drop si el demo lo soporta

### 2. Teclado (3+ propuestas)
- Tab navega por todos los controles focuseables (¿orden lógico?)
- Shift+Tab regresa
- Enter activa el control focused (botón → click, input → submit)
- Space activa botones/checkboxes
- Escape cierra modales/popovers
- Arrow keys para listas/menus/grids
- Atajos documentados (Alt+X, Ctrl+S, etc.)

### 3. ARIA / a11y (2+ propuestas)
- role="..." correcto en cada landmark
- aria-label o aria-labelledby en botones de icono
- aria-expanded en toggles/menus
- aria-selected en tabs/options
- aria-live polite/assertive en regiones dinámicas (toast, status)
- aria-describedby en inputs con hint/help

### 4. Estados visuales y edge cases (2+ propuestas)
- Estado disabled: opacidad, pointer-events, aria-disabled
- Estado readonly vs disabled (¿son diferentes?)
- Estado loading/skeleton
- Estado error (validación, red, timeout)
- Contenido vacío (0 items, valor vacío)
- Contenido muy largo (texto overflow, scroll interno)
- Tema dark/light toggle

## Forma de la propuesta

Para cada demo, escribe un bloque:

\`\`\`markdown
### demo: ${g.demos[0] || '<tag>'}
#### Tests existentes (resumen, brevísimo)
- ...
#### Propuestas nuevas

1. **<título>** — [categoría]
   - Setup: <cómo preparar la página>
   - Acción: <paso a paso>
   - Assertion: <resultado verificable en código>
   - Cobertura: <edge case / branch>

2. **<título>** — [categoría]
   ...

(12+ propuestas por demo)
\`\`\`

## Output
Sobrescribe el archivo \`.audit/proposals/${g.id}.md\` con la salida completa en markdown.

## Reglas duras
- **NO** modifiques archivos del proyecto (src/, dist/, scripts/, etc.).
- **NO** expliques tu razonamiento; el output es SOLO la propuesta.
- **SÍ** incluye el header "### demo: <tag>" para cada demo del grupo.
- **SÍ** escribe 12+ propuestas por demo (no menos).
- **SÍ** adapta las categorías al tipo (botones → click, forms → validación, modales → focus-trap).
`;
    writeFileSync(out, prompt);
    count++;
  }
  return count;
};

const generated = writePrompts();
console.log(`[F0.3-dispatch] ${generated} prompts generados en .audit/prompts/`);
console.log('Para ejecutar en paralelo, despacha sub-agentes con estos prompts y targets:');
for (const g of GROUPS.groups.slice(0, generated)) {
  console.log(`  ${g.id}: input=.audit/prompts/${g.id}.md  →  output=.audit/proposals/${g.id}.md  (${g.demos.length} demos)`);
}
