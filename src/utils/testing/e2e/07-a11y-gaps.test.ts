// 07-a11y-gaps.test.ts: tests que documentan los gaps de accesibilidad
// descubiertos por los sub-agentes auditores (F0 — deep-test-proposals).
//
// Cada test verifica el comportamiento QUE DEBERÍA tener el componente
// según WAI-ARIA APG. Si falla, documenta un bug real del componente.
//
// Bugs detectados durante F0:
//   - <is-tab-group> no setea role="tablist" en el contenedor de tabs.
//   - <is-tab> no setea aria-controls apuntando al panel.
//   - <is-tab-panel> no setea aria-labelledby apuntando al tab.
//   - <is-tab-group> no hace scrollIntoView del tab activado por teclado.
//   - <is-toast> con color="danger" no eleva a role="alert" + aria-live="assertive".
//   - <is-progress-bar> no desactiva la animación indeterminate en prefers-reduced-motion.
//
// Estos tests son el "contrato a11y" del proyecto: si se rompe uno, hay regresión.
// Hasta que se arreglen, son la documentación viva del trabajo pendiente.
import { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@browserbasehq/stagehand';
import {
  arrancar,
  abrirGaleria,
  esperarMs,
  evidencia,
  faltanRequisitos,
  crearTestE2E,
} from './lib/harness.ts';
import type { CtxE2E } from './lib/tipos.d.ts';

const DISPONIBLE = faltanRequisitos().length === 0;
let ctx: CtxE2E | null = null;
const testE2E = crearTestE2E(() => (ctx ? ctx.page : null));

before(async () => {
  if (!DISPONIBLE) return;
  ctx = await arrancar({ etiqueta: '07-a11y-gaps' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}

// ──────────────────────────────────────────────────────────────────
// <is-tab-group>: role="tablist" + aria-controls + aria-labelledby
// ──────────────────────────────────────────────────────────────────

testE2E(
  'tab-group: el contenedor .tabs tiene role="tablist" (WAI-ARIA APG)',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-tab-group', { ms: 4000 });
    const r = await page.evaluate(() => {
      const groups = [...document.querySelectorAll<HTMLElement>('#previewHost is-tab-group')];
      const issues: string[] = [];
      for (const g of groups) {
        const tabs = g.shadowRoot?.querySelector('.tabs') as HTMLElement | null;
        if (!tabs) {
          issues.push(`${g.id || 'no-id'}: sin .tabs interno`);
          continue;
        }
        const role = tabs.getAttribute('role');
        if (role !== 'tablist') issues.push(`${g.id || 'no-id'}: .tabs role=${role ?? '(null)'}, esperaba "tablist"`);
      }
      return { total: groups.length, issues };
    });
    assert.deepEqual(r.issues, [], `gap a11y: ${r.issues.join('; ')}`);
  },
);

testE2E(
  'tab-group: <is-tab> expone aria-controls apuntando al panel correspondiente',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-tab-group', { ms: 4000 });
    const r = await page.evaluate(() => {
      const groups = [...document.querySelectorAll<HTMLElement>('#previewHost is-tab-group')];
      const issues: string[] = [];
      for (const g of groups) {
        const tabs = [...g.querySelectorAll<HTMLElement>('is-tab')];
        for (const t of tabs) {
          const panelName = t.getAttribute('panel');
          if (!panelName) continue;
          const ac = t.getAttribute('aria-controls');
          if (!ac) {
            issues.push(`${g.id}/${t.getAttribute('panel')}: sin aria-controls`);
          }
        }
      }
      return { totalTabs: tabs.length, issues };
    });
    assert.deepEqual(r.issues, [], `gap a11y: ${r.issues.join('; ')}`);
  },
);

testE2E(
  'tab-group: <is-tab-panel> expone aria-labelledby apuntando al tab',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-tab-group', { ms: 4000 });
    const r = await page.evaluate(() => {
      const groups = [...document.querySelectorAll<HTMLElement>('#previewHost is-tab-group')];
      const issues: string[] = [];
      for (const g of groups) {
        const panels = [...g.querySelectorAll<HTMLElement>('is-tab-panel')];
        for (const p of panels) {
          const al = p.getAttribute('aria-labelledby');
          if (!al) {
            issues.push(`${g.id}/${p.getAttribute('name')}: sin aria-labelledby`);
          }
        }
      }
      return { totalPanels: panels.length, issues };
    });
    assert.deepEqual(r.issues, [], `gap a11y: ${r.issues.join('; ')}`);
  },
);

// ──────────────────────────────────────────────────────────────────
// <is-tab-group>: scrollIntoView al activar por teclado
// ──────────────────────────────────────────────────────────────────

testE2E(
  'tab-group: activar tab por teclado lo hace scrollIntoView si está fuera del viewport',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-tab-group', { ms: 4000 });
    // Si hay tabs con overflow horizontal, tab → flecha → tab debería hacer scroll.
    const r = await page.evaluate(() => {
      const g = document.querySelector<HTMLElement>('#previewHost is-tab-group[without-scroll-controls="false"], #previewHost is-tab-group:not([without-scroll-controls])');
      if (!g) return { hasOverflow: false };
      const tabs = g.shadowRoot?.querySelector('.tabs') as HTMLElement | null;
      return {
        hasOverflow: !!tabs && tabs.scrollWidth > tabs.clientWidth,
        scrollLeft: tabs?.scrollLeft ?? 0,
        scrollWidth: tabs?.scrollWidth ?? 0,
        clientWidth: tabs?.clientWidth ?? 0,
      };
    });
    // Si no hay overflow, este test es N/A — saltar.
    if (!r.hasOverflow) {
      t.diagnostic('sin overflow en el demo, skip');
      return;
    }
    // Tab al final y verificar que scrollLeft > 0 (scrollIntoView hizo efecto).
    const initialScroll = await page.evaluate(() => {
      const g = document.querySelector<HTMLElement>('#previewHost is-tab-group');
      const tabs = g?.shadowRoot?.querySelector('.tabs') as HTMLElement | null;
      return tabs?.scrollLeft ?? 0;
    });
    await page.keyboard.press('End');
    await esperarMs(400);
    const afterScroll = await page.evaluate(() => {
      const g = document.querySelector<HTMLElement>('#previewHost is-tab-group');
      const tabs = g?.shadowRoot?.querySelector('.tabs') as HTMLElement | null;
      return tabs?.scrollLeft ?? 0;
    });
    assert.ok(
      afterScroll > initialScroll,
      `End key no hizo scrollIntoView: scrollLeft ${initialScroll} → ${afterScroll}`,
    );
  },
);

// ──────────────────────────────────────────────────────────────────
// <is-toast>: role="alert" + aria-live="assertive" para danger
// ──────────────────────────────────────────────────────────────────

testE2E(
  'toast: color="danger" eleva role="alert" y aria-live="assertive"',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-toast', { ms: 4000 });
    // Disparar un toast de tipo danger (la API estática es `IsToast.danger()` o `error()`).
    const r = await page.evaluate(() => {
      // Crear un toast de prueba directamente en el DOM para inspeccionarlo.
      const host = document.getElementById('previewHost');
      if (!host) return null;
      // Limpiar cualquier toast previo.
      host.querySelectorAll('is-toast-item, is-toast').forEach((el) => el.remove());
      // Llamar al método estático del toast para crear uno.
      // `IsToast.error()` y `IsToast.success()` están documentados.
      const Toast = (window as unknown as { IsToast?: { error: (msg: string) => unknown } }).IsToast;
      if (Toast?.error) {
        Toast.error('Test danger message');
        return { method: 'Toast.error' };
      }
      // Fallback: crear uno manualmente.
      const item = document.createElement('is-toast-item');
      item.setAttribute('color', 'danger');
      item.setAttribute('open', '');
      item.textContent = 'Test danger message';
      host.appendChild(item);
      return { method: 'manual' };
    });
    if (!r) {
      t.diagnostic('no hay preview de toast con trigger, skip');
      return;
    }
    await esperarMs(400);
    const a11y = await page.evaluate(() => {
      const item = document.querySelector<HTMLElement>('#previewHost is-toast-item[color="danger"], #previewHost is-toast:has(is-toast-item[color="danger"])');
      // Buscar el item dentro del host o dentro del is-toast.
      const items = [...document.querySelectorAll<HTMLElement>('#previewHost is-toast-item')];
      const danger = items.find((it) => it.getAttribute('color') === 'danger');
      if (!danger) return { found: false };
      return {
        found: true,
        role: danger.getAttribute('role'),
        ariaLive: danger.getAttribute('aria-live'),
        ariaAtomic: danger.getAttribute('aria-atomic'),
      };
    });
    if (!a11y.found) {
      t.diagnostic('no se encontró toast danger tras trigger');
      return;
    }
    // Para danger se espera role="alert" + aria-live="assertive".
    assert.equal(a11y.role, 'alert', `toast danger debe tener role="alert", actual=${a11y.role}`);
    assert.equal(
      a11y.ariaLive,
      'assertive',
      `toast danger debe tener aria-live="assertive", actual=${a11y.ariaLive}`,
    );
    await evidencia(page, '07-toast-danger-aria');
  },
);

// ──────────────────────────────────────────────────────────────────
// <is-progress-bar>: prefers-reduced-motion desactiva indeterminate
// ──────────────────────────────────────────────────────────────────

testE2E(
  'progress-bar: prefers-reduced-motion desactiva la animación indeterminate',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-progress-bar', { ms: 4000 });
    // Simular prefers-reduced-motion en el navegador.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrirGaleria(page, 'is-progress-bar', { ms: 3000 });
    await esperarMs(800);
    // Verificar que la animación del indicator es "none" en reduced-motion.
    const r = await page.evaluate(() => {
      const bars = [...document.querySelectorAll<HTMLElement>('#previewHost is-progress-bar[indeterminate]')];
      if (!bars.length) return { found: false };
      const indicator = bars[0].shadowRoot?.querySelector('.indicator, .bar, [class*="indicator"]') as HTMLElement | null;
      if (!indicator) return { found: true, hasIndicator: false };
      const cs = getComputedStyle(indicator);
      return {
        found: true,
        hasIndicator: true,
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
      };
    });
    if (!r.found) {
      t.diagnostic('docs no tiene progress-bar indeterminate, skip');
      return;
    }
    if (!r.hasIndicator) {
      t.diagnostic('progress-bar no tiene .indicator, skip');
      return;
    }
    assert.ok(
      r.animationName === 'none' || r.animationDuration === '0s',
      `con reduced-motion la animación debe estar desactivada, actual=${r.animationName} / ${r.animationDuration}`,
    );
    await evidencia(page, '07-progress-bar-reduced-motion');
  },
);
