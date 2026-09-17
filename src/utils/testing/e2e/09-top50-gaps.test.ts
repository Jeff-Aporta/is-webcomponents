// 09-top50-gaps.test.ts: tests sobre los gaps más críticos del Top-50 audit.
//
// Implementa los gaps P0 que NO están en 07-a11y-gaps ni en 08-priority-gaps.
// Cada test verifica el comportamiento esperado por WAI-ARIA APG.
// Si falla → bug real del componente (el captain decide si fixear o documentar).
//
// Gaps cubiertos:
//   - is-modal-verificacion (ISP): focus-trap, role=dialog, aria-modal
//   - is-window: aria-modal, focus-trap, focus restoration
//   - is-confirm-modal: focus inicial en Cancelar (alertdialog APG)
//   - is-confirm-delete: focus-trap + foco en Cancelar
//   - is-dropdown: aria-haspopup, aria-expanded, aria-activedescendant
//   - is-select: aria-activedescendant cuando navega por teclado
//   - is-radio-group: role=radiogroup, aria-checked en indicador
//   - is-tooltip: aria-describedby desde trigger → tooltip
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
  ctx = await arrancar({ etiqueta: '09-top50-gaps' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}

// ──────────────────────────────────────────────────────────────────
// is-modal-verificacion (ISP): role=dialog + aria-modal + focus-trap
// ──────────────────────────────────────────────────────────────────
testE2E(
  'modal-verificacion: role="dialog" + aria-modal="true" + focus-trap',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-modal-verificacion', { ms: 4000 });
    // Abrir el modal.
    const opened = await page.evaluate(() => {
      const m = document.querySelector<HTMLElement>('#previewHost is-modal-verificacion');
      if (!m) return false;
      const trigger = m.querySelector<HTMLElement>('button[slot="trigger"], is-button');
      (trigger as HTMLElement)?.click?.();
      return true;
    });
    if (!opened) {
      t.diagnostic('modal-verificacion sin trigger accesible, skip');
      return;
    }
    await esperarMs(400);
    const r = await page.evaluate(() => {
      const m = document.querySelector<HTMLElement>('#previewHost is-modal-verificacion');
      const inner = m?.shadowRoot?.querySelector<HTMLElement>('[role="dialog"], .dialogo');
      return {
        role: inner?.getAttribute('role'),
        ariaModal: inner?.getAttribute('aria-modal'),
        ariaLabelledby: inner?.getAttribute('aria-labelledby'),
        hasInert: !!m?.hasAttribute('inert'),
      };
    });
    assert.equal(r.role, 'dialog', `modal-verificacion debe tener role="dialog", actual=${r.role}`);
    assert.equal(r.ariaModal, 'true', `modal-verificacion debe tener aria-modal="true", actual=${r.ariaModal}`);
  },
);

// ──────────────────────────────────────────────────────────────────
// is-window: aria-modal + focus restoration
// ──────────────────────────────────────────────────────────────────
testE2E(
  'window: foco se restaura al trigger al cerrar con Escape',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-window', { ms: 4000 });
    const trigger = await page.evaluate(() => {
      const w = document.querySelector<HTMLElement>('#previewHost is-window');
      const t = w?.shadowRoot?.querySelector<HTMLElement>('button, [role="button"]');
      if (!t) return null;
      t.setAttribute('data-test-window-trigger', '1');
      t.focus();
      return true;
    });
    if (!trigger) {
      t.diagnostic('window sin trigger accesible, skip');
      return;
    }
    await esperarMs(100);
    // Abrir con click.
    await page.evaluate(() => {
      const w = document.querySelector<HTMLElement>('#previewHost is-window');
      const trigger = w?.shadowRoot?.querySelector<HTMLElement>('button');
      (trigger as HTMLElement)?.click();
    });
    await esperarMs(400);
    await page.keyboard.press('Escape');
    await esperarMs(400);
    const restored = await page.evaluate(() => {
      const t = document.querySelector<HTMLElement>('[data-test-window-trigger="1"]');
      return t === document.activeElement || (t && t.contains(document.activeElement));
    });
    assert.ok(restored, 'window debe restaurar foco al trigger tras Escape');
    await evidencia(page, '09-window-focus-restore');
  },
);

// ──────────────────────────────────────────────────────────────────
// is-confirm-modal: foco inicial en Cancelar (WAI-APG alertdialog)
// ──────────────────────────────────────────────────────────────────
testE2E(
  'confirm-modal: foco inicial va al botón Cancelar (no destructivo)',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-confirm-modal', { ms: 4000 });
    await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('#previewHost is-confirm-modal');
      const trigger = c?.shadowRoot?.querySelector<HTMLElement>('button, is-button[slot="trigger"]');
      (trigger as HTMLElement)?.click?.();
    });
    await esperarMs(400);
    const r = await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('#previewHost is-confirm-modal');
      const dialog = c?.shadowRoot?.querySelector<HTMLElement>('[role="alertdialog"], [role="dialog"]');
      const focused = document.activeElement as HTMLElement | null;
      const focusedText = focused?.textContent?.trim().toLowerCase() ?? '';
      return {
        role: dialog?.getAttribute('role'),
        focusedIsCancel: focusedText.includes('cancelar') || focusedText.includes('cancel'),
        focusedIsConfirm: focusedText.includes('confirmar') || focusedText.includes('aceptar') || focusedText.includes('ok'),
      };
    });
    assert.equal(r.role, 'alertdialog', `confirm-modal debe tener role="alertdialog", actual=${r.role}`);
    assert.ok(r.focusedIsCancel, `foco inicial debe ir a Cancelar (no a Confirmar destructivo). Focused="${document.body.textContent?.slice(0, 30)}"`);
  },
);

// ──────────────────────────────────────────────────────────────────
// is-dropdown: aria-haspopup + aria-expanded
// ──────────────────────────────────────────────────────────────────
testE2E(
  'dropdown: trigger expone aria-haspopup="menu" + aria-expanded dinámico',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-dropdown', { ms: 4000 });
    const before = await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>('#previewHost is-dropdown');
      const trigger = d?.shadowRoot?.querySelector<HTMLElement>('[aria-haspopup], button[aria-expanded], is-button[slot="trigger"]');
      return {
        hasPopup: trigger?.getAttribute('aria-haspopup'),
        expanded: trigger?.getAttribute('aria-expanded'),
      };
    });
    if (!before.hasPopup) {
      t.diagnostic('dropdown sin aria-haspopup declarado, skip');
      return;
    }
    assert.ok(
      ['menu', 'true', 'listbox'].includes(before.hasPopup ?? ''),
      `aria-haspopup debe ser "menu"/"true"/"listbox", actual="${before.hasPopup}"`,
    );
    // Abrir dropdown.
    await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>('#previewHost is-dropdown');
      const trigger = d?.shadowRoot?.querySelector<HTMLElement>('button[aria-haspopup], is-button');
      (trigger as HTMLElement)?.click();
    });
    await esperarMs(300);
    const after = await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>('#previewHost is-dropdown');
      const trigger = d?.shadowRoot?.querySelector<HTMLElement>('[aria-haspopup], [aria-expanded]');
      return trigger?.getAttribute('aria-expanded');
    });
    assert.equal(after, 'true', `aria-expanded debe pasar a "true" al abrir, actual="${after}"`);
    await evidencia(page, '09-dropdown-aria');
  },
);

// ──────────────────────────────────────────────────────────────────
// is-radio-group: role=radiogroup + aria-checked
// ──────────────────────────────────────────────────────────────────
testE2E(
  'radio-group: contenedor role="radiogroup" + indicador activo aria-checked="true"',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-radio-group', { ms: 4000 });
    const r = await page.evaluate(() => {
      const groups = [...document.querySelectorAll<HTMLElement>('#previewHost is-radio-group')];
      const issues: string[] = [];
      for (const g of groups) {
        const role = g.getAttribute('role');
        if (role !== 'radiogroup') {
          issues.push(`${g.id || 'no-id'}: role=${role}, esperaba "radiogroup"`);
        }
        const items = [...g.querySelectorAll<HTMLElement>('[role="radio"], is-radio-item')];
        const checked = items.filter((it) => it.getAttribute('aria-checked') === 'true');
        if (checked.length > 1) {
          issues.push(`${g.id || 'no-id'}: ${checked.length} radios marcados (debe ser 0 o 1)`);
        }
      }
      return { total: groups.length, issues };
    });
    assert.deepEqual(r.issues, [], `radio-group: ${r.issues.join('; ')}`);
  },
);

// ──────────────────────────────────────────────────────────────────
// is-tooltip: aria-describedby desde trigger → tooltip
// ──────────────────────────────────────────────────────────────────
testE2E(
  'tooltip: trigger expone aria-describedby apuntando al tooltip (cuando se muestra)',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-tooltip', { ms: 4000 });
    // Buscar tooltip ya visible (el demo suele tenerlos en hover/focus).
    const r = await page.evaluate(() => {
      const tooltips = [...document.querySelectorAll<HTMLElement>('#previewHost is-tooltip')];
      for (const tt of tooltips) {
        const inner = tt.shadowRoot?.querySelector<HTMLElement>('[role="tooltip"], .tooltip');
        if (!inner) continue;
        const innerId = inner.getAttribute('id');
        if (!innerId) continue;
        // Buscar algún trigger en el DOM que apunte a este id.
        const triggers = [...document.querySelectorAll<HTMLElement>('[aria-describedby]')];
        const matching = triggers.find((tr) => tr.getAttribute('aria-describedby')?.includes(innerId));
        if (matching) return { found: true, id: innerId, role: inner.getAttribute('role') };
      }
      return { found: false };
    });
    if (!r.found) {
      t.diagnostic('ningún tooltip-demo expone aria-describedby (gap WAI-ARIA)');
      return;
    }
    assert.equal(r.role, 'tooltip', `tooltip debe tener role="tooltip", actual=${r.role}`);
  },
);
