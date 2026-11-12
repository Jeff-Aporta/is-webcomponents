// @contexto INDICE.md · src/ai/README.md
/**
 * motores.ts — los modelos de IA para cualquier componente, sin UI: `ejecutar('ocr', imagen)` y listo. Cada motor se carga
 * una vez y solo al usarlo, con la regla de `descarga.ts`; quien llama solo espera. Los bundles de `motores/` van por URL
 * no analizable para que esbuild no los meta en nada: el componente pesa lo mismo con 1 o con 13 herramientas.
 */
import { conDescarga, medidor, pospuesta } from './descarga.js';
import { herramienta, mbDe } from './herramientas.js';
import type { Crear, Entrada, Herramienta, Motor, Opciones, Salida } from './schemas/ai.schemas.js';

const motores = new Map<string, Promise<Motor>>();
let reintentos = 0;

const conDefectos = (h: Herramienta, o: Opciones): Opciones => ({ ...Object.fromEntries((h.opciones ?? []).map((x) => [x.id, x.defecto])), ...o });

const clave = (h: Herramienta, o: Opciones): string => [h.id, ...(h.opciones ?? []).filter((x) => x.carga).map((x) => o[x.id])].join('|');

/** El motor de una herramienta (por id o entrada del catálogo); pide el modelo si hace falta y espera a que esté listo. */
export function motor(id: string | Herramienta, opciones: Opciones = {}): Promise<Motor> {
  const h = typeof id === 'string' ? herramienta(id) : id;
  const o = conDefectos(h, opciones);
  const k = clave(h, o);
  if (!motores.has(k)) {
    const cargar = (alProgreso: (p: { progress?: number }) => void): Promise<Motor> => {
      const url = new URL(`./motores/${h.id}.min.mjs${reintentos ? `?r=${reintentos}` : ''}`, import.meta.url).href;
      const medir = medidor();
      return import(url).then((m: { crear: Crear }) => m.crear(o, (p) => {
        const progress = medir(p);
        if (progress != null) alProgreso({ progress });
      }));
    };
    const carga = conDescarga({ clave: h.modelo ?? k, nombre: h.nombre, mb: mbDe(h, o), cargar });
    carga.catch((e) => {
      motores.delete(k);
      // El navegador recuerda un `import` fallido por URL: sin otra URL, un corte dejaría la herramienta rota hasta recargar.
      if (!pospuesta(e)) reintentos += 1;
    });
    motores.set(k, carga);
  }
  return motores.get(k)!;
}

/** Corre una herramienta: el modelo se pide y se espera solo. `parcial` recibe el texto mientras se genera. */
export async function ejecutar(id: string | Herramienta, entrada: Entrada, opciones: Opciones = {}, parcial: (texto: string) => void = () => {}): Promise<Salida> {
  const h = typeof id === 'string' ? herramienta(id) : id;
  const m = await motor(h, opciones);
  await new Promise((r) => setTimeout(r, 30)); // la inferencia ocupa el hilo: primero se pinta lo que el llamador acaba de avisar
  return m.ejecutar(entrada, conDefectos(h, opciones), parcial);
}
