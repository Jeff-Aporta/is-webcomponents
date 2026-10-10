/**
 * bienvenida.ts — dominio de la vista `hola`, sin DOM (importable y probable sin navegador).
 * El componente solo pinta lo que esto devuelve; los datos y las reglas viven aquí.
 */
import type { Caracteristica, PasoInicio } from '../../../src/js/consts/schemas/componentes.schemas.js';

/** Las cuatro piezas del estándar que la portada presenta, en este orden. */
export function caracteristicas(): Caracteristica[] {
  return [
    { icono: 'mdi:puzzle-outline', titulo: 'Componentes', texto: 'Cada pieza: .ts + .scss + .md + .json, registrada una vez en kit-tags.' },
    { icono: 'mdi:view-dashboard-outline', titulo: 'Vistas', texto: 'Un dominio por carpeta en view/, con su página aislada y su demo.' },
    { icono: 'mdi:shield-check-outline', titulo: 'Tipos', texto: 'Zod para todo: los tipos salen de los schemas y lo externo se valida.' },
    { icono: 'mdi:test-tube', titulo: 'Pruebas', texto: 'Specs WHAT y pruebas de caja negra; el gate test:all decide.' },
  ];
}

/** Comandos para empezar, en orden de uso. */
export function pasosInicio(): PasoInicio[] {
  return [
    { comando: 'deno install', para: 'dependencias' },
    { comando: 'deno task build', para: 'dist/cdn/' },
    { comando: 'deno task serve', para: 'abrir la app' },
    { comando: 'deno task test:all', para: 'el gate' },
  ];
}

/** Texto del bloque de código del modal: un comando por línea con su comentario alineado. */
export function guionInicio(pasos: PasoInicio[] = pasosInicio()): string {
  const ancho = Math.max(...pasos.map((p) => p.comando.length));
  return pasos.map((p) => `${p.comando.padEnd(ancho)}   # ${p.para}`).join('\n');
}
