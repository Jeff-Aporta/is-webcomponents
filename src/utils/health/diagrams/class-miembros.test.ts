/**
 * Guardián WHAT de los miembros de clase como lista (class-spec).
 *   M1 la visibilidad (`+ - # ~`) es la viñeta: no aparece dentro de los renglones de texto.
 *   M2 el tipo va siempre en renglón(es) propio(s), después de la firma.
 *   M3 nada se sale de la caja: todo renglón cabe en el ancho útil (lo largo salta de línea, sin cortar texto).
 *   M4 la sección tiene alto para todos sus renglones.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeClassLayout, partirMiembro, resolveClassSpec } from '../../../components/diagrams/class-spec.ts';

const LARGO = 'cargar(contexto: Array<Record<string, unknown>>, opciones: { reintentos: number; tiempo: number }): Promise<Array<Record<string, TResultadoDeCargaMuyLargo>>>';
const spec = resolveClassSpec({
  classes: [{ id: 'a', name: 'Controlador', attributes: ['- repo: RepositorioDeAyudas', '+ id: string «PK»'], methods: ['+ listar(): TAyuda[]', `# ${LARGO}`] }],
  relations: [],
});

Deno.test('miembros: M1-M4 lista con viñeta, tipo en segundo renglón y nada fuera de la caja', () => {
  const n = computeClassLayout(spec).nodes[0]!;
  const util = n.w - 14 - 16;
  for (const sec of n.sections.filter((s) => s.type !== 'header')) {
    const ms = sec.members!;
    assertEquals(ms.length, sec.rows.length);
    let alto = 0;
    for (const m of ms) {
      assert(/^[+\-#~]$/.test(m.vis), `viñeta ${m.vis}`);
      assert(m.firma.length >= 1 && !/^[+\-#~]\s/.test(m.firma[0]!), `M1 ${m.firma[0]}`);
      for (const l of m.firma) assert(l.length * 6.4 <= util + 1, `M3 firma ${l}`);
      for (const l of m.tipo) assert(l.length * 5.8 <= util + 1, `M3 tipo ${l}`);
      alto += m.firma.length * 16 + m.tipo.length * 13;
    }
    assert(sec.h >= alto, `M4 ${sec.h} < ${alto}`);
  }
  const largo = n.sections.find((s) => s.type === 'methods')!.members![1]!;
  assertEquals(largo.firma.join(' ').replace(/\s+/g, ''), LARGO.slice(0, LARGO.lastIndexOf('):') + 1).replace(/\s+/g, ''), 'M3 la firma no pierde texto');
  assert(largo.tipo.join('').startsWith('Promise<'), 'M2 tipo aparte');
});

Deno.test('miembros: M2 partirMiembro separa el tipo tras la firma (y conserva las marcas «»)', () => {
  assertEquals(partirMiembro('+ f(a: number): string'), { vis: '+', firma: 'f(a: number)', tipo: 'string' });
  assertEquals(partirMiembro('+ id: string «PK»'), { vis: '+', firma: 'id', tipo: 'string «PK»' });
  assertEquals(partirMiembro('nombre'), { vis: '', firma: 'nombre', tipo: '' });
});

Deno.test('miembros: M5 con layout.maxMembers se muestran N y un renglón «K más»; dentro de otro diagrama el tope es 5 o el de su config', async () => {
  const metodos = Array.from({ length: 15 }, (_, i) => `+ m${i}(): void`);
  const base = { classes: [{ id: 'a', name: 'A', methods: metodos }], relations: [] };
  const sin = computeClassLayout(resolveClassSpec(base)).nodes[0]!.sections.find((s) => s.type === 'methods')!;
  assertEquals(sin.members!.length, 15, 'sin tope se muestran todos');
  const con = computeClassLayout(resolveClassSpec({ ...base, layout: { maxMembers: 6 } })).nodes[0]!.sections.find((s) => s.type === 'methods')!;
  assertEquals(con.members!.length, 7);
  assertEquals(con.members!.slice(0, 6).map((m) => m.firma[0]), metodos.slice(0, 6).map((r) => r.slice(2, r.indexOf(':'))));
  assertEquals(con.members![6]!.mas, 9);
  assertEquals(con.members![6]!.firma, ['9 más']);
  assert(con.h < sin.h, 'la caja se acorta');
  const { embedDiagramOf } = await import('../../../components/_shared/diagram-embed.ts');
  const tope = (spec: unknown) => (embedDiagramOf(spec as never)!.payload as { classDiagram: { layout: { maxMembers: number } } }).classDiagram.layout.maxMembers;
  assertEquals(tope({ kind: 'class', class: { name: 'A', methods: metodos } }), 5, 'por defecto 5 y el sexto renglón es «N más»');
  // La config del diagrama anfitrión fija el tope de sus clases.
  const { flowchartSpecFromPayload } = await import('../../../components/diagrams/flowchart-spec.ts');
  const f = flowchartSpecFromPayload({ config: { classMaxMembers: 3 }, nodes: [{ id: 'c', kind: 'class', class: { name: 'A', methods: metodos } }, { id: 'x', label: 'x' }], edges: [] })!;
  assertEquals(tope(f.nodes[0]!.embed), 3);
});
