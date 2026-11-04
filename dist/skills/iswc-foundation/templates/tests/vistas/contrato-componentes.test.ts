// contrato-componentes.test.ts — guardián de la arquitectura común: todo componente registrado trae sus cuatro archivos
// y su demo. Se apoya en `kit-tags.ts`: un componente nuevo entra solo a la auditoría.
//
//   W-COMP-08  cada tag registrado tiene .ts, .scss, .md y .json con su mismo nombre en la misma carpeta
//   W-COMP-08  cada .md lleva front matter (name, description) y los H2 de la ficha; la Anatomía nunca se excluye
//   W-COMP-08  cada .json es iswc-preview/v1 del mismo tag y está en la galería; si el .md declara API, trae controles
import { definirPruebas } from '../../src/vendor/iswc-base/tools/pruebas.ts';
import { APP_TAGS, PREFIJO, VIEW_TAGS } from '../../src/js/kit-tags.ts';

const raiz = new URL('../../', import.meta.url);
const SECCIONES = ['Anatomía', 'Atributos observados', 'Props', 'Eventos', 'Slots', 'Ejemplos'];

const componentes: { tag: string; base: URL }[] = [
  ...APP_TAGS.map((tag) => ({ tag, base: new URL(`src/js/components/${PREFIJO}/${tag}`, raiz) })),
  ...Object.entries(VIEW_TAGS).flatMap(([vista, tags]) => tags.map((tag) => ({ tag, base: new URL(`view/${vista}/components/${tag}`, raiz) }))),
];

const leer = (base: URL, ext: string): Promise<string | null> => Deno.readTextFile(new URL(`${base.href}.${ext}`)).catch(() => null);

export default definirPruebas([
  {
    nombre: 'contrato W-COMP-08 cada componente tiene ts, scss, md y json',
    categoria: 'what',
    async correr({ expect }) {
      for (const { tag, base } of componentes) {
        for (const ext of ['ts', 'scss', 'md', 'json']) expect(`${tag}.${ext}`, (await leer(base, ext)) !== null, 'no existe');
      }
    },
  },
  {
    nombre: 'contrato W-COMP-08 cada ficha md sigue la plantilla',
    categoria: 'what',
    async correr({ expect }) {
      for (const { tag, base } of componentes) {
        const md = await leer(base, 'md');
        if (md === null) continue;
        expect(`${tag} front matter`, new RegExp(`^---\\r?\\nname: ${tag}\\r?\\ndescription: .+`).test(md), 'falta name o description');
        const faltan = SECCIONES.filter((s) => !new RegExp(`^## ${s}\\s*$`, 'm').test(md));
        expect(`${tag} secciones`, faltan.length === 0, faltan.join(', '));
        expect(`${tag} anatomía`, !md.includes('exclude: Anatomía'), 'la Anatomía no se excluye');
      }
    },
  },
  {
    nombre: 'contrato W-COMP-08 cada demo tiene playground y entra en la galería',
    categoria: 'what',
    async correr({ expect }) {
      const manifest = JSON.parse(await Deno.readTextFile(new URL('view/demo/manifest.json', raiz))) as { tag: string }[];
      const enGaleria = new Set(manifest.map((m) => m.tag));
      for (const { tag, base } of componentes) {
        const texto = await leer(base, 'json');
        if (texto === null) continue;
        const def = JSON.parse(texto) as { $schema?: string; tag?: string; sections?: { blocks?: { kind?: string; controls?: unknown[] }[] }[] };
        expect(`${tag} esquema`, def.$schema === 'iswc-preview/v1' && def.tag === tag, 'no es iswc-preview/v1 de este tag');
        const bloques = (def.sections ?? []).flatMap((s) => s.blocks ?? []);
        const md = (await leer(base, 'md')) ?? '';
        const sinApi = md.includes('exclude: Atributos observados') && md.includes('exclude: Props');
        expect(`${tag} playground`, sinApi || bloques.some((b) => b.kind === 'demo' && b.controls?.length), 'sin bloque demo con controles');
        expect(`${tag} galería`, enGaleria.has(tag), 'falta en view/demo/manifest.json');
      }
    },
  },
]);
