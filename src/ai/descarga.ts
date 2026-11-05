/**
 * descarga.ts — regla única para bajar un modelo de IA, sea cual sea el componente que lo use. Hasta 20 MB baja solo, con
 * un toast promise; más pesado, un modal la anuncia y arranca sola a los 5 s, con opción de posponer. Lo ya bajado no vuelve a avisar.
 */
import { crearNodo } from '@jeff-aporta/iswc-base/core/dom.js';
import { readIswc, writeIswc } from '@jeff-aporta/iswc-base/core/iswc-storage.js';
import type { DialogoDescarga, Pedido, ToastEstatico } from './schemas/ai.schemas.js';

export const LIMITE_MB = 20;

const ESPERA_S = 5;
const CACHE_TRANSFORMERS = 'transformers-cache';
const POSPUESTA = 'descarga pospuesta';

let cola: Promise<unknown> = Promise.resolve();

const clave = (id: string): string => `ai:${id}`;

/** ¿El usuario dijo «Ahora no»? No es un error: quien llama vuelve a su estado inicial. */
export const pospuesta = (err: unknown): boolean => err instanceof Error && err.message === POSPUESTA;

/** Une varios archivos (y modelos) en un porcentaje que no retrocede. Lo menor de 1 MB no pinta: saltaría a 100 con un JSON. */
export function medidor(): (p: { status?: string; file?: string; loaded?: number; total?: number }) => number | null {
  const partes = new Map<string, number[]>();
  let tope = 0;
  return (p) => {
    if (p.loaded != null && p.total) partes.set(`${p.status}:${p.file}`, [p.loaded, p.total]);
    const [hecho, total] = [...partes.values()].reduce((s, v) => [s[0]! + v[0]!, s[1]! + v[1]!], [0, 0]);
    if (total! < 1e6) return null;
    tope = Math.max(tope, hecho! / total! * 100);
    return tope;
  };
}

/** Los tags del modal se piden al abrirlo: quien solo usa un motor no paga el diálogo. */
const tagsDelModal = (): Promise<unknown> => Promise.all([import('@jeff-aporta/iswc-base/components/layout/dialog.js'), import('@jeff-aporta/iswc-base/components/feedback/progress-bar.js'), import('@jeff-aporta/iswc-base/components/actions/button.js')]);

const boton = (texto: string, variante: 'outlined' | 'filled'): HTMLElement => crearNodo('iswc-button', { slot: 'footer', variant: variante, color: variante === 'filled' ? 'brand' : 'neutral' }, texto);

/** Modal que anuncia la descarga y la inicia solo: resuelve al completarse y rechaza si el usuario la pospone. */
async function conModal<T>({ nombre, mb, cargar }: Pedido<T>): Promise<T> {
  await tagsDelModal();
  return new Promise((resolver, rechazar) => {
    const nota = crearNodo('p', {}, `Esta herramienta descarga ${mb} MB una sola vez y empieza en ${ESPERA_S} segundos. Para usarla hay que esperar a que termine. Luego funciona sin conexión y nada sale de tu equipo.`);
    const barra = crearNodo('iswc-progress-bar', { label: 'Progreso de la descarga', indeterminate: true, hidden: true });
    const ahora = boton('Ahora no', 'outlined');
    const bajar = boton(`Descargar ahora (${ESPERA_S})`, 'filled');
    const d = crearNodo('iswc-dialog', { label: `Descargar ${nombre}`, 'backdrop-variant': 'basic' }, nota, barra, ahora, bajar) as DialogoDescarga;
    let bajando = false;
    let quedan = ESPERA_S;
    let reloj: ReturnType<typeof setInterval> | undefined;
    const cerrar = (): void => {
      clearInterval(reloj);
      d.open = false;
      d.remove();
    };
    ahora.addEventListener('iswc-click', () => {
      cerrar();
      rechazar(new Error(POSPUESTA));
    });
    // A mitad de descarga no se cierra: hay que esperar a que termine.
    d.addEventListener('iswc-hide', (e) => {
      if (bajando) e.preventDefault();
    });
    d.addEventListener('iswc-after-hide', () => {
      if (!d.isConnected) return;
      clearInterval(reloj);
      d.remove();
      rechazar(new Error(POSPUESTA));
    });
    const iniciar = (): void => {
      if (bajando) return;
      clearInterval(reloj);
      bajando = true;
      ahora.hidden = true;
      bajar.hidden = true;
      barra.hidden = false;
      nota.textContent = `Descargando ${nombre} (${mb} MB). Espera a que termine para usar esta herramienta.`;
      cargar((p) => {
        if (p.progress == null) return;
        barra.removeAttribute('indeterminate');
        barra.setAttribute('value', String(Math.round(p.progress)));
      }).then((m) => {
        bajando = false;
        cerrar();
        resolver(m);
      }, (e) => {
        bajando = false;
        cerrar();
        rechazar(e);
      });
    };
    bajar.addEventListener('iswc-click', iniciar);
    reloj = setInterval(() => {
      quedan--;
      bajar.textContent = `Descargar ahora (${quedan})`;
      if (quedan <= 0) iniciar();
    }, 1000);
    document.body.append(d);
    d.open = true;
  });
}

/** La marca sola no basta: con la cuota llena el navegador expulsa modelos y se bajarían otra vez sin avisar. */
async function sigueBajado(id: string): Promise<boolean> {
  if (readIswc(clave(id)) !== '1') return false;
  if (!id.includes('/')) return true;
  try {
    const cache = await caches.open(CACHE_TRANSFORMERS);
    return (await cache.keys()).some((r) => r.url.includes(id) && r.url.includes('.onnx'));
  } catch {
    return true;
  }
}

/** Un modal a la vez: lo pedido durante una descarga espera su turno. */
function enCola<T>(p: Pedido<T>): Promise<T> {
  const turno = cola.then(() => conModal(p));
  cola = turno.catch(() => {});
  return turno;
}

/** Sin toaster no se pierde la descarga: solo falta el aviso. */
async function conToast<T>(p: Pedido<T>): Promise<T> {
  const carga = p.cargar(() => {});
  try {
    await import('@jeff-aporta/iswc-base/components/feedback/toast.js');
    const toast = customElements.get('iswc-toast') as unknown as ToastEstatico | undefined;
    void toast?.promise?.(carga, { loading: `Descargando ${p.nombre}…`, success: `${p.nombre} listo`, error: `No se pudo descargar ${p.nombre}` }).catch(() => {});
  } catch { /* sin DOM: solo falta el aviso */ }
  return carga;
}

/** Carga un modelo aplicando la regla; una carga rechazada puede volver a pedirse. */
export async function conDescarga<T>(p: Pedido<T>): Promise<T> {
  let carga: Promise<T>;
  if (await sigueBajado(p.clave)) carga = p.cargar(() => {});
  else if (p.mb > LIMITE_MB) carga = enCola(p);
  else carga = conToast(p);
  const m = await carga;
  writeIswc(clave(p.clave), '1');
  void globalThis.navigator?.storage?.persist?.();
  return m;
}
