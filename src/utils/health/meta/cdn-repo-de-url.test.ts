/**
 * Guardián WHAT: el loader pide sus piezas al MISMO repo desde el que se sirve (jsDelivr, githack o
 * Pages), con su nombre actual o el anterior. Un nombre fijo que aún no existe en GitHub daba 404 en
 * todos los componentes del consumidor.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { repoDeUrl } from '../../../components/_shared/cdn-ref.ts';

Deno.test('cdn: R1 dueño/repo desde jsDelivr, githack y Pages; null fuera de ellos', () => {
  assertEquals(repoDeUrl('https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@abc123/dist/cdn/core/loader.min.js'), 'Jeff-Aporta/is-webcomponents');
  assertEquals(repoDeUrl('https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@abc123/dist/cdn/core/loader.min.js'), 'Jeff-Aporta/iswc-root');
  assertEquals(repoDeUrl('https://raw.githack.com/Jeff-Aporta/is-webcomponents/abc123/dist/cdn/core/loader.min.js'), 'Jeff-Aporta/is-webcomponents');
  assertEquals(repoDeUrl('https://jeff-aporta.github.io/is-webcomponents/dist/cdn/core/loader.min.js'), 'jeff-aporta/is-webcomponents');
  assertEquals(repoDeUrl('http://localhost:8391/dist/cdn/core/loader.min.js'), null);
});
