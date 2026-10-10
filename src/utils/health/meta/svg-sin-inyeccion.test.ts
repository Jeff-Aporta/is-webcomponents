/**
 * Guardián WHAT: los SVG que exporta el kit llegan intactos aunque los sirva Live Server.
 * live-server inyecta su script de recarga antes del primer `</svg>` (también en un .svg servido como
 * imagen) y rompe el XML («Comment not terminated»): la imagen sale rota en el visor de docs.
 *   S1 ningún `</svg>` sin espacio en lo exportado; S2 el resultado sigue siendo XML equivalente.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sinInyeccion } from '../../../cdn/tools/render-diagram.ts';

Deno.test('svg: S1 el exportador no deja un </svg> que live-server pueda usar para inyectar', () => {
  const out = sinInyeccion('<svg xmlns="http://www.w3.org/2000/svg"><g><svg><rect/></svg></g></svg>');
  assert(!out.includes('</svg>'), out);
  assertEquals((out.match(/<\/svg >/g) ?? []).length, 2);
});

Deno.test('svg: S2 la salida sigue siendo el mismo documento (solo cambia el espacio del cierre)', () => {
  const src = '<svg><text>a</text></svg>';
  assertEquals(sinInyeccion(src).replace(/<\/svg >/g, '</svg>'), src);
});
