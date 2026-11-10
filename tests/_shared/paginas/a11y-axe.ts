// @contexto INDICE.md · tests/_shared/README.md
// a11y-axe.ts — monta componentes de cada familia de HOW-7 y les pasa axe-core (WCAG 2 A/AA) dentro de su shadow.
// Lo corre tests/navegador/a11y-axe.test.ts en Edge headless: cada caso devuelve `true` o los ids de las reglas que
// fallan, separados por coma (la prueba los compara con su lista de pendientes).
import axe from 'axe-core';
import '@jeff-aporta/iswc-base/components/actions/button.js';
import '@jeff-aporta/iswc-base/components/forms/input.js';
import '@jeff-aporta/iswc-base/components/forms/select.js';
import '@jeff-aporta/iswc-base/components/forms/option.js';
import '@jeff-aporta/iswc-base/components/layout/dialog.js';
import '@jeff-aporta/iswc-base/components/navigation/tab-group.js';
import '@jeff-aporta/iswc-base/components/navigation/tree.js';

const MUESTRAS: Record<string, string> = {
  boton: '<iswc-button>Guardar</iswc-button>',
  campo: '<iswc-input label="Nombre" hint="Como figura en tu documento" required></iswc-input>',
  lista: '<iswc-select label="País"><iswc-option value="co">Colombia</iswc-option><iswc-option value="pe">Perú</iswc-option></iswc-select>',
  dialogo: '<iswc-dialog label="Confirmar" open><p>¿Seguro?</p></iswc-dialog>',
  pestanas: '<iswc-tab-group><iswc-tab slot="nav" panel="a">Uno</iswc-tab><iswc-tab slot="nav" panel="b">Dos</iswc-tab><iswc-tab-panel name="a">A</iswc-tab-panel><iswc-tab-panel name="b">B</iswc-tab-panel></iswc-tab-group>',
  arbol: '<iswc-tree><iswc-tree-item expanded>Raíz<iswc-tree-item>Hoja</iswc-tree-item></iswc-tree-item></iswc-tree>',
};

const casos: Record<string, () => Promise<true | string>> = {};
for (const [nombre, marcado] of Object.entries(MUESTRAS)) {
  casos[nombre] = async () => {
    const caja = document.createElement('main');
    caja.innerHTML = marcado;
    document.body.append(caja);
    await new Promise((r) => setTimeout(r, 50));
    const res = await axe.run(caja, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'] });
    caja.remove();
    const ids = res.violations.map((v) => v.id).sort();
    return ids.length ? ids.join(',') : true;
  };
}
(globalThis as Record<string, unknown>).__casos = casos;
