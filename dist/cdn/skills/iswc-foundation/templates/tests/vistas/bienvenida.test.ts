// bienvenida.test.ts — dominio de la vista `hola` (sin navegador), sobre lo PUBLICADO en dist/cdn.
//
//   W-CAT-02   la portada presenta 4 piezas del estándar, cada una con icono, título y texto
//   W-CAT-03   el modal lista los comandos para empezar en orden, con su propósito alineado
import { definirPruebas } from '../../src/vendor/iswc-root/tools/ISPruebas.ts';

const { caracteristicas, pasosInicio, guionInicio } = await import('../../dist/cdn/view/hola/utils/bienvenida.js');

export default definirPruebas([
  {
    nombre: 'bienvenida W-CAT-02 cuatro piezas con icono, título y texto',
    categoria: 'what',
    correr({ eq, expect }) {
      const lista = caracteristicas();
      eq('títulos', lista.map((c: { titulo: string }) => c.titulo), ['Componentes', 'Vistas', 'Tipos', 'Pruebas']);
      expect('todas completas', lista.every((c: { icono: string; texto: string }) => c.icono.includes(':') && c.texto.length > 0));
    },
  },
  {
    nombre: 'bienvenida W-CAT-03 comandos para empezar en orden y alineados',
    categoria: 'what',
    correr({ eq, expect }) {
      eq('orden', pasosInicio().map((p: { comando: string }) => p.comando), ['deno install', 'deno task build', 'deno task serve', 'deno task test:all']);
      const lineas = guionInicio().split('\n');
      expect('un comando por línea', lineas.length === 4);
      expect('comentarios alineados', new Set(lineas.map((l: string) => l.indexOf('#'))).size === 1);
    },
  },
]);
