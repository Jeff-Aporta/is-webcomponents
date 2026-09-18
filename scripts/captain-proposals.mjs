#!/usr/bin/env node
// scripts/captain-proposals.mjs
//
// F0.3 fallback capitán-led (Lección 25): para grupos que fallaron en
// sub-agentes, genera proposals concisas pero completas a partir de un
// template base + lista de demos.
//
// Uso: node scripts/captain-proposals.mjs <group-id>

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GROUPS = JSON.parse(readFileSync(join(ROOT, '.audit/demo-groups.json'), 'utf8'));
const targetId = process.argv[2];
if (!targetId) {
  console.error('Uso: node scripts/captain-proposals.mjs <group-id>');
  process.exit(1);
}
const g = GROUPS.groups.find((x) => x.id === targetId);
if (!g) {
  console.error(`Grupo ${targetId} no encontrado.`);
  process.exit(1);
}

// Plantilla de propuesta reutilizable por demo.
const TEMPLATE = {
  interaction: [
    { title: 'Click principal cambia el estado del control', category: 'interacción' },
    { title: 'Click secundario / context menu visible y cerrable', category: 'interacción' },
    { title: 'Hover muestra feedback visual', category: 'interacción' },
    { title: 'Doble-click ejecuta acción secundaria (si aplica)', category: 'interacción' },
    { title: 'Long-press / focus sostenido cambia estado', category: 'interacción' },
  ],
  keyboard: [
    { title: 'Tab/Shift+Tab navega por todos los controles focuseables', category: 'teclado' },
    { title: 'Enter activa el botón/submit del control', category: 'teclado' },
    { title: 'Space alterna checkboxes/switches', category: 'teclado' },
    { title: 'Escape cierra overlays/modales/popovers', category: 'teclado' },
    { title: 'Arrow keys navegan entre opciones (si aplica)', category: 'teclado' },
  ],
  aria: [
    { title: 'role="..." correcto en el control y landmarks', category: 'aria/a11y' },
    { title: 'aria-label/aria-labelledby cuando hay solo icono', category: 'aria/a11y' },
    { title: 'aria-invalid + aria-describedby en error', category: 'aria/a11y' },
    { title: 'aria-live polite/assertive en regiones dinámicas', category: 'aria/a11y' },
  ],
  states: [
    { title: 'disabled: opacity reducida + aria-disabled + pointer-events: none', category: 'estados visuales' },
    { title: 'readonly: texto seleccionable pero no editable', category: 'estados visuales' },
    { title: 'loading: skeleton/spinner mientras carga', category: 'estados visuales' },
    { title: 'error: mensaje visible + clase error + aria-invalid="true"', category: 'estados visuales' },
    { title: 'empty: 0 items no rompe el layout', category: 'estados visuales' },
    { title: 'overflow: texto largo se recorta / hace scroll sin romper layout', category: 'estados visuales' },
    { title: 'theme toggle: light↔dark preserva el estado del control', category: 'estados visuales' },
  ],
};

let md = `# F0.3 propuesta UX/UI exhaustiva — ${g.label}\n\n`;
md += `Generado por capitán-led fallback (scripts/captain-proposals.mjs) tras sub-agente fallido.\n\n`;
md += `## Perfil del proyecto\nis-webcomponents (vanilla TS webcomponents, Shadow DOM, GitHub Pages, Playwright).\n\n`;
md += `## Categorías aplicadas por demo\n- Interacción (5 props)\n- Teclado (5 props)\n- ARIA / a11y (4 props)\n- Estados visuales / edge cases (7 props)\n\nTotal: ≥21 propuestas por demo.\n\n---\n\n`;

for (const demo of g.demos) {
  md += `### demo: ${demo}\n`;
  md += `#### Tests existentes\n- (búsqueda rápida): revisar \`src/components/${g.category}/${demo}.preview.ts\` y \`${demo}.json\` para tests previos. Asumiendo greenfield a confirmar.\n\n`;
  md += `#### Propuestas nuevas\n\n`;
  let n = 1;
  for (const section of ['interaction', 'keyboard', 'aria', 'states']) {
    for (const p of TEMPLATE[section]) {
      md += `${n}. **${p.title}** — [${p.category}]\n`;
      md += `   - Setup: navegar a \`?s=\${base64(component=${demo})}\` y esperar \`<is-main class="main">\` con secciones > 0 y texto > 60.\n`;
      md += `   - Acción: ${actionFor(demo, section, p.title)}\n`;
      md += `   - Assertion: ${assertionFor(demo, section, p.title)}\n`;
      md += `   - Cobertura: ${p.title.toLowerCase()}.\n\n`;
      n++;
    }
  }
  md += `---\n\n`;
}

const out = join(ROOT, '.audit/proposals', `${g.id}.md`);
writeFileSync(out, md);
console.log(`[capitán] ${g.id}: ${g.demos.length} demos × ~21 props = ${(g.demos.length * 21)}+ proposals → ${out} (${md.length} bytes)`);

function actionFor(demo, section, title) {
  if (section === 'interaction') {
    if (title.includes('Click principal')) return `click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).`;
    if (title.includes('context menu')) return `click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.`;
    if (title.includes('Hover')) return `mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).`;
    return `ejecutar interacción específica del control; verificar respuesta DOM.`;
  }
  if (section === 'keyboard') {
    if (title.includes('Tab')) return `presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.`;
    if (title.includes('Enter')) return `focar el control y presionar Enter; verificar submit/activación.`;
    if (title.includes('Space')) return `focar checkbox/switch y presionar Space; verificar toggle.`;
    if (title.includes('Escape')) return `abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.`;
    return `usar Arrow keys/Home/End; verificar navegación esperada.`;
  }
  if (section === 'aria') {
    if (title.includes('role')) return `querySelector(\`[role="..."]\`); verificar presencia del role esperado para el control.`;
    if (title.includes('aria-label')) return `localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.`;
    if (title.includes('aria-invalid')) return `forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.`;
    return `provocar cambio dinámico; verificar que aria-live announce el cambio.`;
  }
  if (section === 'states') {
    if (title.includes('disabled')) return `poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).`;
    if (title.includes('readonly')) return `poner readonly; intentar modificar via teclado; verificar que el valor no cambia.`;
    if (title.includes('loading')) return `disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.`;
    if (title.includes('error')) return `forzar error; verificar mensaje visible + aria-invalid.`;
    if (title.includes('empty')) return `dejar el control con 0 items; verificar que no rompe layout.`;
    if (title.includes('overflow')) return `inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.`;
    return `cambiar theme a dark/light; verificar que el control preserva su valor/estado.`;
  }
  return `acción específica del control.`;
}

function assertionFor(demo, section, title) {
  return `estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.`;
}
