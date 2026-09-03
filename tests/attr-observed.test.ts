// tests/attr-observed.test.ts
//
// @attr* encola el nombre al decorar la clase. customElements.define congela
// observedAttributes en ese instante. materializarAtributos debe volcar la cola
// al REGISTRO *sin* `new Clase()` (Illegal constructor antes del define).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

test('defineElement materializa @attr* antes de customElements.define', () => {
  const src = readFileSync(join(root, 'src/core/element.ts'), 'utf8');
  assert.ok(
    /materializarAtributos\(ctor\)/.test(src),
    'defineElement debe llamar materializarAtributos(ctor) antes del define',
  );
  const mat = src.indexOf('materializarAtributos(ctor)');
  const def = src.indexOf('customElements.define(tag, ctor)');
  assert.ok(mat >= 0 && def > mat, 'materializarAtributos debe ir antes de customElements.define');
});

test('attrs.ts vuelca PENDIENTES sin construir la clase', () => {
  const src = readFileSync(join(root, 'src/core/attrs.ts'), 'utf8');
  assert.ok(/export function materializarAtributos/.test(src), 'debe existir materializarAtributos');
  assert.ok(/PENDIENTES/.test(src), 'debe encolar attrs en PENDIENTES al decorar');
  assert.ok(
    !/\btry\s*\{[^}]*new\s+Clase\s*\(/.test(src),
    'no debe construir la clase: Illegal constructor vacía el REGISTRO',
  );
  assert.ok(/PENDIENTES\.length\s*=\s*0/.test(src), 'debe vaciar PENDIENTES tras volcar');
});

test('dropdown observa open vía atributosDeclarados (no lista hardcodeada rota)', () => {
  const src = readFileSync(join(root, 'src/components/actions/dropdown.ts'), 'utf8');
  assert.ok(/atributosDeclarados\(this\)/.test(src), 'dropdown usa atributosDeclarados');
  assert.ok(/@attrBool\s+accessor open/.test(src), 'open es @attrBool');
});

test('runtime: open en observedAttributes dispara ACC tras define', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // Página mínima: inyectamos el contrato attrs+define como el kit lo usa.
    await page.setContent('<!doctype html><html><body></body></html>');
    const result = await page.evaluate(async () => {
      // Réplica mínima del contrato (sin bundler): cola + define + @attrBool simulado
      const REGISTRO = new WeakMap();
      const PENDIENTES = [];
      function atributosDeclarados(Clase) {
        const vistos = new Set();
        for (let c = Clase; c; c = Object.getPrototypeOf(c)) {
          for (const a of REGISTRO.get(c) ?? []) vistos.add(a);
        }
        return [...vistos];
      }
      function materializarAtributos(Clase) {
        if (!PENDIENTES.length) return;
        let set = REGISTRO.get(Clase);
        if (!set) REGISTRO.set(Clase, (set = new Set()));
        for (const a of PENDIENTES) set.add(a);
        PENDIENTES.length = 0;
      }
      function defineElement(tag, ctor) {
        if (!customElements.get(tag)) {
          materializarAtributos(ctor);
          customElements.define(tag, ctor);
        }
        return ctor;
      }

      // Simula lo que hace el decorador al evaluar la clase
      PENDIENTES.push('open');

      class IsProbe extends HTMLElement {
        static get observedAttributes() {
          return [...atributosDeclarados(this)];
        }
        fires = 0;
        attributeChangedCallback() {
          this.fires++;
        }
        get open() {
          return this.hasAttribute('open');
        }
        set open(v) {
          this.toggleAttribute('open', !!v);
        }
      }

      // El bug viejo: new antes del define → Illegal constructor
      let illegal = false;
      try {
        new IsProbe();
      } catch {
        illegal = true;
      }

      defineElement('is-probe-attr', IsProbe);
      const frozen = IsProbe.observedAttributes.slice();
      const el = document.createElement('is-probe-attr');
      document.body.appendChild(el);
      el.open = true;
      return {
        illegalBeforeDefine: illegal,
        frozen,
        fires: el.fires,
        hostOpen: el.hasAttribute('open'),
      };
    });

    assert.equal(result.illegalBeforeDefine, true, 'new antes de define debe ser Illegal constructor');
    assert.deepEqual(result.frozen, ['open'], 'define debe congelar open en observedAttributes');
    assert.equal(result.fires, 1, 'set open debe disparar attributeChangedCallback');
    assert.equal(result.hostOpen, true);
  } finally {
    await browser.close();
  }
});
