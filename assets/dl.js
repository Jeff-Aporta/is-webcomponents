// assets/dl.js — íconos del kit: SOLO configuración de rutas. La lógica vive en
// src/cdn/tools/download-iconify.ts (las apps la importan por URL fijada al SHA del kit).
// Genera assets/iconify.json (con `tags`: qué íconos pinta cada iswc-*, para que las apps
// que usan un tag se lleven sus íconos) y assets/iconify/<set>/<nombre>.svg.
import { descargarIconos } from '../src/cdn/tools/download-iconify.ts';

await descargarIconos({
  raiz: new URL('..', import.meta.url),
  roots: ['src/components', 'src/core'],
  tagDeArchivo: 'iswc-{stem}',
  mapas: [],
});
