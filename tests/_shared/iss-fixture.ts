// iss-fixture.ts — los casos que leen el fixture del ISS-AyudasCPIA (componentes.json, der.json,
// fuentes/codigo.json…) dependen de un proyecto que vive fuera del VPS (D:\Dev). Si no está a
// mano, el caso se SALTA con motivo en vez de dar rojo: no es un defecto del kit.
//
//   const test = conFixtureIss(coleccionPruebas({ categoria: 'what' }).test);
//
// La ruta es la que traen las refs relativas de `labs/iss-ayudascpia-*/payloads/*.json`
// (`../../../../../../PatyIA/_experimental/ISS-AyudasCPIA`).
// category: "how"
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CuerpoT, OpcionesT } from '../../src/vendor-distributions/shared/schemas.ts';

const POR_DEFECTO = new URL('../../labs/iss-ayudascpia-flujos/payloads/../../../../../../PatyIA/_experimental/ISS-AyudasCPIA/', import.meta.url);

/** Raíz del ISS-AyudasCPIA que usan los payloads de labs. */
export const ISS_RAIZ: string = fileURLToPath(POR_DEFECTO);

/** `true` si el fixture del ISS se puede leer en esta máquina. */
export const ISS_DISPONIBLE: boolean = existsSync(ISS_RAIZ + '/docs-experimental/diagramas/componentes.json');

export const MOTIVO_SIN_ISS = `ambiente: fixture ISS-AyudasCPIA (vive en D:\\Dev, fuera del VPS) no está en ${ISS_RAIZ}`;

type Registrar = (nombre: string, a?: OpcionesT | CuerpoT, b?: CuerpoT) => void;

/**
 * Envuelve el registrador: si el fixture no está y el caso falla por leerlo (el error nombra
 * `ISS-AyudasCPIA`), el caso se salta con `MOTIVO_SIN_ISS`. Cualquier otro fallo sigue rojo.
 */
export function conFixtureIss(test: Registrar): Registrar {
  return (nombre, a, b) => {
    const cuerpo = typeof a === 'function' ? a : b;
    const opciones = typeof a === 'function' ? undefined : a;
    if (!cuerpo) return test(nombre, a, b);
    const envuelto: CuerpoT = async (t) => {
      try {
        await cuerpo(t);
      } catch (e) {
        if (!ISS_DISPONIBLE && /ISS-AyudasCPIA/.test(e instanceof Error ? e.message : String(e))) return t.skip(MOTIVO_SIN_ISS);
        throw e;
      }
    };
    if (opciones) test(nombre, opciones, envuelto);
    else test(nombre, envuelto);
  };
}
