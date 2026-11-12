// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * loader-autoload.test.ts — el autoloader opcional del loader (capa 2).
 *
 *   (a) el núcleo pide `loader-autoload` con `import()` (nunca en estático), la capa tiene su
 *       propio archivo y el build la publica con nombre estable (`core/loader-autoload.min.mjs`);
 *   (b) `observar()` pide `ensure` de cada `iswc-*` sin definir que aparezca (al empezar y al
 *       mutarse el árbol) y `listos(raiz)` dice si los de una raíz ya están definidos.
 *
 * El repo no trae jsdom: el DOM es simulado (lo justo que usa la capa).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { CAPAS_LOADER } from '../../src/cdn/build/bundle-kit.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const CDN = join(RAIZ, 'src', 'cdn');

/** Elemento simulado: lo justo que usa la capa (`localName`, `nodeType` y descendientes). */
type ElSim = {
  nodeType: number;
  localName: string;
  hijos: ElSim[];
  querySelectorAll(sel: string): ElSim[];
};

function el(localName: string, hijos: ElSim[] = []): ElSim {
  const nodo: ElSim = {
    nodeType: 1,
    localName,
    hijos,
    querySelectorAll(sel: string): ElSim[] {
      if (sel !== '*') return [];
      const out: ElSim[] = [];
      const visitar = (n: ElSim): void => {
        for (const h of n.hijos) {
          out.push(h);
          visitar(h);
        }
      };
      visitar(nodo);
      return out;
    },
  };
  return nodo;
}

/** Observador simulado: guarda el callback para dispararlo a mano. */
class ObservadorSim {
  static ultimo: ObservadorSim | null = null;
  callback: (muts: Array<{ addedNodes: Node[] }>) => void;
  observado: unknown = null;
  desconectado = false;
  constructor(cb: (muts: Array<{ addedNodes: Node[] }>) => void) {
    this.callback = cb;
    ObservadorSim.ultimo = this;
  }
  observe(nodo: unknown, _opciones?: unknown): void {
    this.observado = nodo;
  }
  disconnect(): void {
    this.desconectado = true;
  }
}

test('loader-autoload: el nucleo pide la capa con import() y el build la publica con nombre estable', () => {
  const nucleo = readFileSync(join(CDN, 'loader.ts'), 'utf8');
  assert.match(nucleo, /import\('@jeff-aporta\/iswc-base\/cdn\/loader-autoload\.js'\)/);
  // La capa 2 nunca entra en estático: solo con import().
  assert.doesNotMatch(nucleo, /^import\s+(?!type\b)[^;]*from\s+['"][^'"]*loader-autoload/m);
  assert.ok(CAPAS_LOADER.includes('autoload'), 'CAPAS_LOADER debe incluir la capa autoload');
  const capa = readFileSync(join(CDN, 'loader-autoload.ts'), 'utf8');
  assert.match(capa, /export function observar/);
  assert.match(capa, /export function listos/);
  // La capa no importa el núcleo (sin ciclo): recibe ensure por argumento.
  assert.doesNotMatch(capa, /from\s+['"][^'"]*\/loader(\.js|\.ts)?['"]/);
  const md = readFileSync(join(CDN, 'loader.md'), 'utf8');
  assert.match(md, /L\.observar\(/);
  assert.match(md, /L\.listos\(/);
});

test('loader-autoload: observar pide ensure de los iswc-* sin definir y listos dice si estan definidos', async () => {
  const g = globalThis as Record<string, unknown>;
  const definidos = new Set<string>();
  g.customElements = { get: (tag: string) => (definidos.has(tag) ? class {} : undefined) };
  g.MutationObserver = ObservadorSim;
  try {
    const { observar, listos } = await import('../../src/cdn/loader-autoload.ts');
    const boton = el('iswc-button');
    const raiz = el('div', [boton, el('span')]);
    const pedidos: string[] = [];
    const ensure = (tag: string): Promise<boolean> => {
      pedidos.push(tag);
      definidos.add(tag);
      return Promise.resolve(true);
    };
    const comoRaiz = raiz as unknown as ParentNode;
    assert.equal(listos(comoRaiz), false, 'con un iswc-button sin definir no estan todos listos');
    const tirador = observar(comoRaiz, ensure);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(pedidos, ['iswc-button'], 'observa lo que ya estaba en el arbol');
    assert.equal(listos(comoRaiz), true, 'tras el ensure el tag queda definido');
    // Un tag que aparece despues tambien se pide.
    const nuevo = el('iswc-input');
    ObservadorSim.ultimo!.callback([{ addedNodes: [nuevo as unknown as Node] }]);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(pedidos, ['iswc-button', 'iswc-input'], 'pide el tag que se monto despues');
    tirador.parar();
    assert.equal(ObservadorSim.ultimo!.desconectado, true, 'parar() desconecta el observador');
  } finally {
    delete g.customElements;
    delete g.MutationObserver;
  }
});

export default lista();
