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

1. **Un archivo, no N**: lo que más pesa es la cantidad de peticiones. Un json con todos los SVG de la
   app llega en 35–250 ms para cualquier lote; SVG por SVG va de 1 s a 66 s en frío. → `iconify.json`
   **incrusta** los SVG (`svg`) y `<iswc-icon>` los pinta sin pedir archivos.
2. **Raíz de cada app = su web estática** (`host`, GitHub Pages): el origen más rápido por archivo, sin
   límite de 50 MB y sin bloqueo por IP. El mapa se resuelve relativo a donde se sirvió y, si esa
   carpeta no responde, bajo su `host`.
3. **jsDelivr no sirve para íconos del kit**: lento en frío y con 403 mientras el repo supere 50 MB.
   Para material del kit por SHA, **rawcdn.githack @SHA** (inmutable, MIME correcto, CORS) es la opción
   estable; raw.githubusercontent es rápido pero no es un CDN (límites de GitHub). Los pines siguen
   siendo SHA de 40 hex.
4. **La API de Iconify solo como último recurso**, y en la descarga **en lote** (`<set>.json?icons=`):
   SVG por SVG bloquea por IP (429/1015) en cuanto se piden unas decenas.

## Límites del experimento

Una sola máquina y red; Deno (no un navegador) salvo que se use `index.html`; los bordes de CDN varían
por región y hora. Repetir con otra semilla antes de cambiar una decisión.
