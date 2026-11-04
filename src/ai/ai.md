# IA en el navegador — `lib/ai/`

Utilidades del kit para correr modelos con `runonweb@0.1.0` sin servidor. No dependen de ninguna UI: cualquier componente las usa directo, y `<iswc-ai-tool>` es solo una cara encima.

| Módulo CDN | Exporta | Para qué |
| --- | --- | --- |
| `lib/ai/motores.min.mjs` | `ejecutar`, `motor` | Correr una herramienta: `await ejecutar('ocr', imagen)`. |
| `lib/ai/descarga.min.mjs` | `conDescarga`, `pospuesta`, `medidor`, `LIMITE_MB` | La regla de descarga, para cualquier modelo. |
| `lib/ai/vector-local.min.mjs` | `vectorLocal`, `cargarCorpus`, `ordenarPorSentido` | Buscar por significado en el navegador. |
| `lib/ai/orden.min.mjs` | `ordenarAplanado`, `ORDEN_DEFECTO`, `coseno`, `normalizar`, `lexicoTolerante`, `esExacta`, `combinar` | Ordenar: exactas primero, luego embeddings. Puro. |
| `lib/ai/aplanado.min.mjs` | `aplanar`, `abrirCorpus`, `empacar`, `desempacar`… | Vectores chicos para el navegador. Puro. |
| `lib/ai/aplanado-ajuste.min.mjs` | `ajustar` | Calcular la reducción (PCA, LDA…). Solo build. |
| `lib/ai/herramientas.min.mjs` | `HERRAMIENTAS`, `herramienta`, `mbDe`, `pesoDe`, `MODELO_LOCAL` | El catálogo. |

Nada de esto entra en `load('all')` ni en un barril. Los motores (`lib/ai/motores/<id>.min.js`) se piden por URL y solo al usarlos; comparten chunks para no repetir `transformers.js`.

## Cómo importarlos

Con el loader, para recibir la misma URL sellada que usa `<iswc-ai-tool>` y no duplicar el estado:

```js
const L = globalThis.iswcLoader;
const { ejecutar } = await import(L.assetUrl(new URL('../lib/ai/motores.min.mjs', L.selfBase).href));
```

## Correr una herramienta

```js
const { texto } = await ejecutar('ocr', archivo);
const { barras } = await ejecutar('classify', mensaje, { categorias: 'envíos, facturación' });
await ejecutar('stt', audio, { idioma: 'es' }, (parcial) => pintar(parcial));
```

Las herramientas y sus opciones están en `src/ai/herramientas.ts`. `motor(id, opciones)` da el motor cargado para quien lo reusa muchas veces.

## La regla de descarga

`conDescarga({ clave, nombre, mb, cargar })` envuelve toda carga de modelo:

- Lo ya bajado no avisa. Si el navegador expulsó el modelo, se vuelve a tratar como nuevo.
- Hasta 20 MB (`LIMITE_MB`) baja solo, con un toast promise.
- Más, un modal lo anuncia y arranca a los 5 s; a mitad de descarga no se cierra. Modales de uno en uno.
- «Ahora no» rechaza con un error que `pospuesta(err)` reconoce. No es un fallo: quien llama vuelve a su estado inicial.

## Buscar por significado

El corpus se hornea en el build y el navegador solo vectoriza la consulta. El vector completo pasa por la misma transformación que el corpus:

```js
const corpus = await cargarCorpus('/assets/ia/productos.json');
const resultados = await ordenarPorSentido(corpus, 'algo para el dolor de cabeza');
if (!resultados) pintarPorPalabra();
```

- `vectorLocal` y `ordenarPorSentido` devuelven `null` si el modelo no está: se sigue por palabra, la búsqueda nunca se rompe.
- `ordenarAplanado(corpus, consulta, vector, ajuste)` ordena, no oculta: cada resultado trae `exacta`, `relevante` y su puntaje.
- `ORDEN_DEFECTO` es el punto de partida; se pasa otro ajuste por corpus.
- `MODELO_LOCAL` es el único modelo estándar: multilingüe, en WASM. El de `runonweb/embed` por defecto es inglés.

Hornear un corpus (Deno, desde el `.ts` publicado): `ajustar` calcula la transformación con `{ metodo: 'lda', dims: 64, regularizacion: 1, cuantizacion: { tipo: 'int8' } }`, y `empacarAplanado` + `empacarVectores` dan el JSON que `cargarCorpus` abre.

## Añadir una herramienta

1. Entrada en `HERRAMIENTAS` (`src/ai/herramientas.ts`).
2. `src/ai/motores/<id>.ts` que exporte `crear: Crear`.

No hace falta tocar el componente ni el build. `tests/componentes/ai.test.ts` exige que catálogo y motores coincidan.
