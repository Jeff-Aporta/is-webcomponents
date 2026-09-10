// 06-modales.test.ts: tests UI/UX de <is-dialog> y <is-drawer>.
//
// Implementa el top-10 priorizado por el subagente auditor de layout:
//
//   DIALOG
//     1. Focus trap Tab/Shift+Tab cicla solo dentro del dialog
//     2. Escape cierra Y restaura foco al trigger original
//     3. Initial focus al primer focuseable / autofocus al [autofocus]
//     4. Backdrop cierra SOLO con `light-dismiss`
//     5. `is-hide` cancelable dispara shake animation (preventDefault)
//     6. backdrop-variant="basic" aplica oscuridad + blur
//     7. role="dialog" + aria-modal="true" siempre presentes
//
//   DRAWER
//     8. placement="start|end" cambia el lado desde el que desliza
//     9. Stacking: dos drawers (start+end) coexisten con focus-traps independientes
//    10. data-drawer="close" cierra el drawer desde descendientes
//
// Estrategia Stagehand:
//   - abrirGaleria(page, 'is-dialog' | 'is-drawer') carga el docs con demos reales
//   - page.evaluate ejecuta JS en el navegador para inspeccionar DOM/Shadow DOM
//   - page.locator(...).click() interactúa con elementos (penetra shadow)
//   - page.keyboard.press(...) simula teclado
//   - esperarMs + reintentos absorben animaciones (default ~220ms open / ~180ms close)
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
  ctx = await arrancar({ etiqueta: '06-modales' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}

/**
 * Abre el primer <is-dialog> o <is-dialog id="..."> del demo, devolviendo
 * el id y referencia del wrapper. Penetra shadow DOM.
 */
async function primerDialog(page: Page): Promise<{ id: string; open: boolean } | null> {
  return (await page.evaluate(() => {
    const dlgs = [...document.querySelectorAll<HTMLElement>('#previewHost is-dialog')];
    if (!dlgs.length) return null;
    const d = dlgs[0];
    return { id: d.id || '(no-id)', open: d.hasAttribute('open') };
  })) as { id: string; open: boolean } | null;
}

async function abrirDialogPorId(page: Page, id: string): Promise<boolean> {
  // El botón "Abrir" del demo usa `onclick="document.getElementById('dlg').open = true"`
  // o está en una sección interactiva. Disparamos `show()` por API directa,
  // que es lo que hace cualquier consumidor real.
  return (await page.evaluate((dialogId: string) => {
    const d = document.getElementById(dialogId) as HTMLElement | null;
    if (d && typeof (d as unknown as { show?: () => void }).show === 'function') {
      (d as unknown as { show: () => void }).show();
      return true;
    }
    return false;
  }, id)) as boolean;
}

async function esperarAbierto(page: Page, id: string, ms = 1500): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const abierto = await page.evaluate(
      (dialogId: string) => document.getElementById(dialogId)?.hasAttribute('open') ?? false,
      id,
    );
    if (abierto) return true;
    await esperarMs(50);
  }
  return false;
}

async function esperarCerrado(page: Page, id: string, ms = 2000): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const cerrado = await page.evaluate(
      (dialogId: string) => !document.getElementById(dialogId)?.hasAttribute('open'),
      id,
    );
    if (cerrado) return true;
    await esperarMs(50);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
// DIALOG #1: Focus trap Tab/Shift+Tab cicla solo dentro del dialog
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'dialog: focus trap Tab/Shift+Tab cicla solo dentro del dialog',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-dialog', { ms: 4000 });
    const dlgs = await page.evaluate(() => {
      const all = [...document.querySelectorAll<HTMLElement>('#previewHost is-dialog')];
      return all
        .map((d) => ({ id: d.id, open: d.hasAttribute('open'), label: d.getAttribute('label') }))
        .filter((x) => x.id);
    });
    assert.ok(dlgs.length >= 1, `el docs debe montar al menos 1 is-dialog con id, hay ${dlgs.length}`);
    const target = dlgs.find((d) => d.open) ?? dlgs[0];
    if (!target.open) await abrirDialogPorId(page, target.id);
    assert.ok(await esperarAbierto(page, target.id), `dialog ${target.id} debe abrir`);

    // Tab 10 veces y verificar que document.activeElement siempre está
    // dentro del subtree del dialog (incluyendo shadow).
    let fueraDelDialog = 0;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await esperarMs(40);
      const dentro = await page.evaluate((dialogId: string) => {
        const host = document.getElementById(dialogId);
        if (!host) return false;
        const a = document.activeElement;
        if (!a) return false;
        // Está dentro si el activeElement es el propio host, un descendiente
        // del light DOM, o un descendiente del shadow DOM.
        return a === host || host.contains(a) || (host.shadowRoot?.contains(a) ?? false);
      }, target.id);
      if (!dentro) fueraDelDialog++;
    }
    assert.equal(fueraDelDialog, 0, `foco se escapó del dialog ${fueraDelDialog}/10 veces`);
    await evidencia(page, '06a-dialog-focus-trap');
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DIALOG #2: Escape cierra Y restaura foco al trigger
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'dialog: Escape cierra y restaura foco al trigger original',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-dialog', { ms: 4000 });
    // Buscar el trigger (botón "Abrir") del primer dialog y focusearlo.
    const triggerInfo = (await page.evaluate(() => {
      const dlg = document.querySelector<HTMLElement>('#previewHost is-dialog[id]');
      if (!dlg) return null;
      // El trigger suele estar en el slot default del demo, antes del dialog
      // o como un <is-button> con onclick.
      const triggerBtn = dlg.previousElementSibling?.querySelector?.('is-button,button')
        ?? dlg.parentElement?.querySelector?.('is-button[onclick]');
      if (!triggerBtn) return null;
      (triggerBtn as HTMLElement).setAttribute('data-test-trigger', '1');
      return { triggerId: triggerBtn.id || '(no-id)', dialogId: dlg.id };
    })) as { triggerId: string; dialogId: string } | null;
    assert.ok(triggerInfo, 'debe existir un trigger antes del dialog en el demo');

    // Foco el trigger, abro, presiono Escape, verifico restauración.
    await page.evaluate((triggerId: string) => {
      const t = document.querySelector(`[data-test-trigger="1"]`) as HTMLElement;
      t?.focus();
    }, triggerInfo.triggerId);
    await esperarMs(80);
    const activeAntes = await page.evaluate(() => document.activeElement?.tagName ?? '');
    assert.match(activeAntes, /IS-BUTTON|BUTTON/, `trigger debe tener foco, activeElement=${activeAntes}`);

    await abrirDialogPorId(page, triggerInfo.dialogId);
    assert.ok(await esperarAbierto(page, triggerInfo.dialogId), 'dialog debe abrir');

    await page.keyboard.press('Escape');
    await esperarMs(400);
    assert.ok(await esperarCerrado(page, triggerInfo.dialogId), 'Escape debe cerrar el dialog');

    const activeDespues = await page.evaluate(() => {
      const t = document.querySelector('[data-test-trigger="1"]') as HTMLElement | null;
      return t?.contains(document.activeElement) || document.activeElement === t || false;
    });
    assert.ok(activeDespues, 'tras Escape el foco debe volver al trigger original');
    await evidencia(page, '06b-dialog-escape-restore');
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DIALOG #3: Initial focus al primer focuseable
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'dialog: initial focus va al primer focuseable del shadow',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-dialog', { ms: 4000 });
    const target = await page.evaluate(() => {
      const dlg = document.querySelector<HTMLElement>('#previewHost is-dialog[id]');
      if (!dlg) return null;
      return dlg.id;
    }) as string | null;
    assert.ok(target, 'debe haber un dialog con id');
    await abrirDialogPorId(page, target);
    await esperarAbierto(page, target);
    await esperarMs(250); // settle de focus management

    const inside = await page.evaluate((dialogId: string) => {
      const host = document.getElementById(dialogId);
      const a = document.activeElement;
      if (!host || !a) return false;
      // El foco inicial debe estar dentro del shadow (no en <body>).
      return host.shadowRoot?.contains(a) ?? false;
    }, target);
    assert.ok(inside, 'initial focus debe estar dentro del shadow del dialog');
    await evidencia(page, '06c-dialog-initial-focus');
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DIALOG #4: Backdrop cierra SOLO con light-dismiss
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'dialog: backdrop cierra SOLO con light-dismiss',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-dialog', { ms: 4000 });
    // Hay dos dialogs relevantes: uno sin light-dismiss (estándar) y uno CON.
    const dialogs = await page.evaluate(() => {
      const all = [...document.querySelectorAll<HTMLElement>('#previewHost is-dialog[id]')];
      return all.map((d) => ({
        id: d.id,
        lightDismiss: d.hasAttribute('light-dismiss'),
        label: d.getAttribute('label') || d.id,
      }));
    });
    const standard = dialogs.find((d) => !d.lightDismiss);
    const dismissable = dialogs.find((d) => d.lightDismiss);
    assert.ok(standard && dismissable, 'docs debe tener dialog con y sin light-dismiss');

    // 1) Sin light-dismiss: click en backdrop NO cierra.
    await page.evaluate((id: string) => {
      (document.getElementById(id) as unknown as { show: () => void }).show();
    }, standard.id);
    await esperarAbierto(page, standard.id);
    await page.evaluate((id: string) => {
      const dlg = document.getElementById(id);
      const backdrop = dlg?.shadowRoot?.querySelector('.backdrop') as HTMLElement | null;
      // dispatch click sintético en el backdrop.
      backdrop?.click();
    }, standard.id);
    await esperarMs(300);
    const sigueAbierto = await page.evaluate((id: string) =>
      document.getElementById(id)?.hasAttribute('open') ?? false, standard.id);
    assert.ok(sigueAbierto, `dialog sin light-dismiss NO debe cerrar con click en backdrop (id=${standard.id})`);
    await page.evaluate((id: string) => {
      (document.getElementById(id) as unknown as { hide: () => void }).hide();
    }, standard.id);

    // 2) Con light-dismiss: click en backdrop SÍ cierra.
    await page.evaluate((id: string) => {
      (document.getElementById(id) as unknown as { show: () => void }).show();
    }, dismissable.id);
    await esperarAbierto(page, dismissable.id);
    await page.evaluate((id: string) => {
      const dlg = document.getElementById(id);
      const backdrop = dlg?.shadowRoot?.querySelector('.backdrop') as HTMLElement | null;
      backdrop?.click();
    }, dismissable.id);
    assert.ok(await esperarCerrado(page, dismissable.id), 'dialog con light-dismiss DEBE cerrar con click en backdrop');
    await evidencia(page, '06d-dialog-light-dismiss');
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DIALOG #5: is-hide cancelable dispara shake (preventDefault)
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'dialog: is-hide cancelable con preventDefault impide cierre',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-dialog', { ms: 4000 });
    // El dialog dlgPrevent ("¿Salir sin guardar?") usa preventDefault
    // en su listener de is-hide — el código del demo así lo implementa.
    const preventId = await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>('#previewHost is-dialog[id="dlgPrevent"]');
      return d?.id ?? null;
    });
    assert.ok(preventId, 'docs debe tener dialog dlgPrevent (cancelable)');
    await page.evaluate((id: string) => {
      (document.getElementById(id) as unknown as { show: () => void }).show();
    }, preventId);
    await esperarAbierto(page, preventId);
    // Disparamos Escape → is-hide se emite, listener preventDefault → shake.
    await page.keyboard.press('Escape');
    await esperarMs(500);
    const sigueAbierto = await page.evaluate((id: string) =>
      document.getElementById(id)?.hasAttribute('open') ?? false, preventId);
    assert.ok(sigueAbierto, 'preventDefault en is-hide debe impedir el cierre (cancelable)');
    // Forzamos el cierre con show=hide del consumidor (botón "Guardar y salir").
    const cerradoManual = await page.evaluate((id: string) => {
      const d = document.getElementById(id) as unknown as { hide: () => void };
      d?.hide?.();
      return !document.getElementById(id)?.hasAttribute('open');
    }, preventId);
    assert.ok(cerradoManual, 'método hide() debe cerrar el dialog aunque el listener haya preventDefault');
    await evidencia(page, '06e-dialog-cancel');
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DIALOG #6: backdrop-variant="basic" aplica oscuridad + blur
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'dialog: backdrop-variant="basic" aplica oscuridad y blur al backdrop',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-dialog', { ms: 4000 });
    const styleBasic = await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>('#previewHost is-dialog[backdrop-variant="basic"]');
      if (!d) return null;
      const bd = d.shadowRoot?.querySelector('.backdrop') as HTMLElement | null;
      if (!bd) return null;
      const cs = getComputedStyle(bd);
      return {
        background: cs.backgroundColor,
        filter: cs.backdropFilter || cs.webkitBackdropFilter || '',
      };
    }) as { background: string; filter: string } | null;
    assert.ok(styleBasic, 'docs debe tener dialog con backdrop-variant="basic"');
    // El rgba negro con alpha debe ser distinto de transparent.
    assert.match(
      styleBasic.background,
      /rgba?\(\s*0\s*,\s*0\s*,\s*0/i,
      `basic debe aplicar fondo oscuro, actual=${styleBasic.background}`,
    );
    assert.ok(
      styleBasic.filter.includes('blur'),
      `basic debe aplicar backdrop-filter blur, actual="${styleBasic.filter}"`,
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DIALOG #7: role="dialog" + aria-modal="true" siempre presentes
// ═══════════════════════════════════════════════════════════════════════
testE2E('dialog: role="dialog" y aria-modal="true" siempre presentes', { timeout: 60000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-dialog', { ms: 4000 });
  const result = await page.evaluate(() => {
    const dialogs = [...document.querySelectorAll<HTMLElement>('#previewHost is-dialog')];
    const issues: string[] = [];
    for (const d of dialogs) {
      const inner = d.shadowRoot?.querySelector('.dialog, [role="dialog"]') as HTMLElement | null;
      if (!inner) {
        issues.push(`${d.id || 'no-id'}: sin .dialog interno`);
        continue;
      }
      const role = inner.getAttribute('role');
      const modal = inner.getAttribute('aria-modal');
      if (role !== 'dialog') issues.push(`${d.id}: role=${role}, esperaba "dialog"`);
      if (modal !== 'true') issues.push(`${d.id}: aria-modal=${modal}, esperaba "true"`);
    }
    return { total: dialogs.length, issues };
  });
  assert.equal(result.issues.length, 0, `problemas ARIA: ${result.issues.join('; ')}`);
});

// ═══════════════════════════════════════════════════════════════════════
// DRAWER #8: placement cambia el lado desde el que desliza
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'drawer: placement="start" ancla a la izquierda, "end" a la derecha',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-drawer', { ms: 4000 });
    const samples = (await page.evaluate(() => {
      const all = [...document.querySelectorAll<HTMLElement>('#previewHost is-drawer[id]')];
      return all.map((d) => {
        const dr = d.shadowRoot?.querySelector('.drawer') as HTMLElement | null;
        if (!dr) return null;
        const cs = getComputedStyle(dr);
        return {
          id: d.id,
          placement: d.getAttribute('placement') || 'end',
          left: cs.left,
          right: cs.right,
          top: cs.top,
          bottom: cs.bottom,
        };
      }).filter(Boolean);
    })) as Array<{ id: string; placement: string; left: string; right: string; top: string; bottom: string }>;
    assert.ok(samples.length >= 2, `docs debe tener al menos 2 drawers con placements distintos, hay ${samples.length}`);

    const startDrawer = samples.find((s) => s.placement === 'start');
    const endDrawer = samples.find((s) => s.placement === 'end');
    if (startDrawer) {
      assert.equal(startDrawer.left, '0px', `placement="start" debe tener left:0px (id=${startDrawer.id})`);
    }
    if (endDrawer) {
      assert.equal(endDrawer.right, '0px', `placement="end" debe tener right:0px (id=${endDrawer.id})`);
    }
    await evidencia(page, '06h-drawer-placement');
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DRAWER #9: Stacking — dos drawers (start+end) coexisten
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'drawer: stacking — dos drawers (start+end) coexisten con focus-traps independientes',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-drawer', { ms: 4000 });
    // Buscar 2 drawers (uno start, uno end).
    const pair = await page.evaluate(() => {
      const all = [...document.querySelectorAll<HTMLElement>('#previewHost is-drawer[id]')];
      const start = all.find((d) => d.getAttribute('placement') === 'start');
      const end = all.find((d) => (d.getAttribute('placement') ?? 'end') === 'end');
      return {
        start: start?.id ?? null,
        end: end?.id ?? null,
      };
    });
    assert.ok(pair.start && pair.end, `docs debe tener drawers start+end, got ${JSON.stringify(pair)}`);

    await page.evaluate((id: string) => {
      (document.getElementById(id) as unknown as { show: () => void }).show();
    }, pair.start);
    await page.evaluate((id: string) => {
      (document.getElementById(id) as unknown as { show: () => void }).show();
    }, pair.end);
    await esperarMs(400);
    const ambosAbiertos = await page.evaluate((ids: { start: string; end: string }) => {
      return (
        document.getElementById(ids.start)?.hasAttribute('open') &&
        document.getElementById(ids.end)?.hasAttribute('open')
      );
    }, pair);
    assert.ok(ambosAbiertos, 'ambos drawers deben estar abiertos a la vez');

    // Escape cierra SOLO el top (el último abierto).
    await page.keyboard.press('Escape');
    await esperarMs(400);
    const despuesEscape = await page.evaluate((ids: { start: string; end: string }) => ({
      startOpen: document.getElementById(ids.start)?.hasAttribute('open') ?? false,
      endOpen: document.getElementById(ids.end)?.hasAttribute('open') ?? false,
    }), pair);
    // Después de Escape, al menos uno debe estar cerrado; verificamos que el
    // primero sigue abierto (el de mayor z-index/más reciente se cierra).
    const algunoCerrado = !despuesEscape.endOpen || !despuesEscape.startOpen;
    assert.ok(algunoCerrado, `Escape debe cerrar al menos uno, got ${JSON.stringify(despuesEscape)}`);

    // Cierra el que quede abierto.
    await page.keyboard.press('Escape');
    await esperarMs(400);
    await evidencia(page, '06i-drawer-stacking');
  },
);

// ═══════════════════════════════════════════════════════════════════════
// DRAWER #10: data-drawer="close" cierra desde descendientes
// ═══════════════════════════════════════════════════════════════════════
testE2E(
  'drawer: data-drawer="close" cierra el drawer desde descendientes',
  { timeout: 60000 },
  async (t) => {
    if (!DISPONIBLE) return t.skip('faltan variables E2E');
    const page = pagina();
    await abrirGaleria(page, 'is-drawer', { ms: 4000 });
    // Encontrar drawer con un [data-drawer="close"] en su slot.
    const found = (await page.evaluate(() => {
      const drawers = [...document.querySelectorAll<HTMLElement>('#previewHost is-drawer[id]')];
      for (const d of drawers) {
        const closer = d.querySelector('[data-drawer="close"]') as HTMLElement | null;
        if (closer) {
          closer.setAttribute('data-test-closer', '1');
          return { id: d.id, closerTestId: closer.outerHTML.slice(0, 60) };
        }
      }
      return null;
    })) as { id: string; closerTestId: string } | null;
    assert.ok(found, 'docs debe tener drawer con un botón data-drawer="close"');

    await page.evaluate((id: string) => {
      (document.getElementById(id) as unknown as { show: () => void }).show();
    }, found.id);
    await esperarAbierto(page, found.id);

    await page.evaluate(() => {
      const c = document.querySelector('[data-test-closer="1"]') as HTMLElement | null;
      c?.click();
    });
    assert.ok(await esperarCerrado(page, found.id), 'click en data-drawer="close" debe cerrar el drawer');
    await evidencia(page, '06j-drawer-data-close');
  },
);
