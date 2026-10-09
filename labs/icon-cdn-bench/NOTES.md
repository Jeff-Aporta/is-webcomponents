# icon-cdn-bench — ¿desde dónde cargan más rápido los íconos?

Mide cuánto tarda en llegar un **lote** de íconos SVG desde cada raíz candidata, con varias peticiones
en vuelo como lo haría una página. Dos pasadas por origen y tamaño de lote:

- **fría**: URL con `?b=<nonce>` → el borde del CDN va al origen (el primer visitante tras publicar).
  Ojo: raw.githubusercontent y rawcdn.githack **ignoran la query** para su caché; su «fría» solo es
  real la primera vez que se piden esos nombres (por eso cada corrida usa `--semilla` distinta).
- **tibia**: la misma URL limpia, segunda vez (borde caliente: el resto de visitantes).

```bash
deno run -A labs/icon-cdn-bench/run.ts                       # 25,100,300 íconos · 6 en vuelo · origin/main
deno run -A labs/icon-cdn-bench/run.ts --semilla=7 --concurrencia=24 --solo=pages,githack,raw
```

Navegador: abrir `labs/icon-cdn-bench/index.html` servido por http (misma lógica, `bench.mjs`).
Resultados: `resultados/<fecha>-c<concurrencia>.{json,md}`.

## Resultados (2026-10-09, Deno 2.9 · Windows · kit @eab3227, set mdi)

6 en vuelo (≈ HTTP/1.1), nombres nunca pedidos antes (`--semilla=7`):

| Origen | 25 fría / tibia | 100 fría / tibia | 300 fría / tibia | Errores |
| --- | ---: | ---: | ---: | --- |
| GitHub Pages (web estática) | 981 / 153 ms | 2.1 s / 682 ms | 6.3 s / 2.1 s | — |
| raw.githubusercontent @SHA | 1.1 s / 185 ms | 3.4 s / 687 ms | 8.9 s / 2.0 s | — |
| rawcdn.githack @SHA | 2.2 s / 467 ms | 8.0 s / 1.7 s | 27.3 s / 5.6 s | — |
| jsDelivr @SHA | 6.9 s / 548 ms | 16.6 s / 2.1 s | 66.1 s / 6.2 s | **403** intermitente (paquete > 50 MB) |
| API Iconify, SVG suelto | 1.1 s / 772 ms | — | — | **429** desde ~25 seguidos (bloqueo por IP) |
| API Iconify, JSON en lote (80/petición) | 185 / 115 ms | 164 / 159 ms | 210 / 209 ms | — |
| **Pages, 1 JSON con todo** (proxy 135 KB) | 254 / 37 ms | 35 / 31 ms | 38 / 35 ms | — |

Con 24 en vuelo (≈ HTTP/2), borde ya caliente: Pages 71 ms (25) · 185 ms (100) · 433 ms (300);
raw 69 / 177 / 437 ms; githack 167 / 414 / 1153 ms; jsDelivr 193 / 500 / 1389 ms (+403).

## Conclusiones (decisión)

1. **Flujo de `<iswc-icon>`: local o API, nada más.** Cada app sirve en local (su propio sitio) los íconos
   que usa y los de todo lo que consume (se bajan al construir); lo demás va a la API. Pages fue el origen
   más rápido por archivo, sin el límite de 50 MB de jsDelivr ni bloqueos por IP, y desplegada la carga
   local es un fetch al mismo sitio.
2. **No enlazar rutas de otras apps ni del kit por CDN en ejecución**: jsDelivr es lento en frío y da 403
   mientras el repo supere 50 MB; rawcdn.githack es lento en frío. Lo de otras apps se resuelve al
   construir (registro de consumos en `dl`).
3. **La API de Iconify, como último recurso en ejecución y en lote en la descarga** (`<set>.json?icons=`):
   SVG por SVG bloquea por IP (429/1015) en cuanto se piden unas decenas seguidas.
4. Medido también: un único json con todos los SVG llega en 35–250 ms para cualquier lote. Se descartó
   incrustar SVG en el mapa por simplicidad (decisión 2026-10-09): el mapa solo dice qué hay en local.

## Límites del experimento

Una sola máquina y red; Deno (no un navegador) salvo que se use `index.html`; los bordes de CDN varían
por región y hora. Repetir con otra semilla antes de cambiar una decisión.
