// hermeticidad.test.ts -- WHAT: el proyecto es atómico y hermético (ver _hermeticidad.mjs).
import { definirPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { IGNORAR, RAIZ, revisarHermeticidad } from './_hermeticidad.mjs';

export default definirPruebas([
  {
    nombre: 'W-HERM-01 nada versionado referencia rutas fuera del proyecto',
    categoria: 'what',
    correr() {
      const v = revisarHermeticidad(RAIZ, IGNORAR);
      if (v.length) throw new Error(v.length + ' referencia(s) fuera del proyecto:\n' + v.slice(0, 50).join('\n'));
    },
  },
]);
