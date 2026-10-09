// assets/dl.js — íconos de la app: SOLO configuración de rutas (`deno task icons`, corre dentro de `build`).
// La herramienta vive en el kit, fijada al MISMO SHA del pin (`deno task pin` la sube con el resto).
// Baja a assets/iconify/<set>/<nombre>.svg los íconos que usa la app y TODOS los de lo que consume
// (el kit por defecto; otras apps iswc se suman en `mapas`, por SHA), y escribe assets/iconify.json
// (con `host` de deno.json → iswc.host). En ejecución: si el ícono está en el mapa → local; si no → API.
import { descargarIconos } from 'https://raw.githubusercontent.com/__REPO__/__SHA__/src/cdn/tools/download-iconify.ts';

await descargarIconos({
  raiz: new URL('..', import.meta.url),
  roots: ['index.html', 'src', 'view'],
  // extra: ['mdi:ejemplo'],  // ids armados en ejecución que el barrido no ve
  // mapas: [                 // registro de consumos: kit + apps iswc que esta app usa
  //   'https://raw.githubusercontent.com/__REPO__/__SHA__/assets/iconify.json',
  //   'https://raw.githubusercontent.com/<owner>/<otra-app>/<sha40>/assets/iconify.json',
  // ],
});
