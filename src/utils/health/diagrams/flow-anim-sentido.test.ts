/**
 * Guardián WHAT del sentido estándar de la animación de flujo en todos los diagramas.
 *   S1 clases: herencia y realización fluyen al revés del trazo (padre → hijo); el resto, con él.
 *   S2 DER: del lado N al lado 1; en 1:1, del lado opcional (0..1) al obligatorio.
 *   S3 `reverse` por arista invierte el sentido estándar (clases, DER, componentes, secuencia).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeClassLayout, resolveClassSpec, sentidoFlujoClase } from '../../../components/diagrams/class-spec.ts';
import { computeErLayout, resolveErSpec, sentidoFlujoEr } from '../../../components/diagrams/er-spec.ts';
import { computeComponentLayout, resolveComponentSpec } from '../../../components/diagrams/component-spec.ts';
import { computeSequenceLayout, resolveSequenceSpec } from '../../../components/diagrams/sequence-spec.ts';

Deno.test('flujo: S1 clases — herencia y realización al revés; S3 reverse lo invierte', () => {
  assertEquals(['inheritance', 'realization', 'association', 'dependency', 'composition'].map(sentidoFlujoClase), [true, true, false, false, false]);
  const L = computeClassLayout(resolveClassSpec({
    classes: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
    relations: [{ id: 'h', from: 'b', to: 'a', kind: 'inheritance' }, { id: 'u', from: 'a', to: 'c', kind: 'dependency', reverse: true }],
  }));
  const rev = new Map(L.edges.map((e) => [e.id, !!e.reverse]));
  assertEquals(rev.get('h'), false, 'el layout guarda solo el reverse del usuario');
  assertEquals(rev.get('u'), true);
});

Deno.test('flujo: S2 DER — de N a 1, y en 1:1 del opcional al obligatorio; S3 reverse lo invierte', () => {
  assertEquals(sentidoFlujoEr('one', 'many'), true, '1→N se anima al revés (de N a 1)');
  assertEquals(sentidoFlujoEr('zeroOrMany', 'one'), false, 'N→1 con el trazo');
  assertEquals(sentidoFlujoEr('one', 'zeroOrOne'), true, '1:1 del opcional al obligatorio');
  assertEquals(sentidoFlujoEr('zeroOrOne', 'one'), false);
  assertEquals(sentidoFlujoEr('many', 'many'), false);
  const L = computeErLayout(resolveErSpec({
    entities: [{ id: 'p', name: 'padre', attributes: [] }, { id: 'h', name: 'hijo', attributes: [] }],
    relations: [{ id: 'r1', from: 'p', to: 'h', fromCard: 'one', toCard: 'many' }, { id: 'r2', from: 'p', to: 'h', fromCard: 'one', toCard: 'many', reverse: true }],
  }));
  const rev = new Map(L.relations.map((r) => [r.id, !!r.reverse]));
  assertEquals(rev.get('r1'), true);
  assertEquals(rev.get('r2'), false, 'reverse invierte el estándar');
});

Deno.test('flujo: S3 componentes y secuencia llevan el reverse de su arista', () => {
  const C = computeComponentLayout(resolveComponentSpec({
    components: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    links: [{ id: 'l', from: 'a', to: 'b', reverse: true }],
  }));
  assertEquals(C.edges.find((e) => e.id === 'l')?.reverse, true);
  const S = computeSequenceLayout(resolveSequenceSpec({
    actors: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    messages: [{ id: 'm', from: 'a', to: 'b', label: 'x', reverse: true }, { id: 'n', from: 'b', to: 'a', label: 'y' }],
  }));
  assertEquals(S.messages.map((m) => !!m.reverse), [true, false]);
});
