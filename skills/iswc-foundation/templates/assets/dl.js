// assets/dl.js — íconos de la app: SOLO configuración de rutas (`deno task icons`, corre dentro de `build`).
// La herramienta vive en el kit, fijada al MISMO SHA del pin (`deno task pin` la sube con el resto).
// Barre `roots`, suma los íconos de los `iswc-*` que la app usa (mapa del kit) y escribe
// assets/iconify.json (con `host` de deno.json → iswc.host) + assets/iconify/<set>/<nombre>.svg.
import { descargarIconos } from 'https://raw.githubusercontent.com/__REPO__/__SHA__/src/cdn/tools/download-iconify.ts';

await descargarIconos({
  raiz: new URL('..', import.meta.url),
  roots: ['index.html', 'src', 'view'],
});
