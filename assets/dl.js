// assets/dl.js — íconos del kit: SOLO configuración de rutas. La lógica vive en
// src/cdn/tools/download-iconify.ts (las apps la importan por URL fijada al SHA del kit).
// Genera assets/iconify.json (los íconos que el kit sirve en local; las apps que lo consumen
// se los descargan todos al construir) y assets/iconify/<set>/<nombre>.svg.
import { descargarIconos } from '../src/cdn/tools/download-iconify.ts';

await descargarIconos({
  raiz: new URL('..', import.meta.url),
  // labs: los diagramas del lab (y sus íconos) se sirven en local, sin depender de la API.
  roots: ['src/components', 'src/core', 'labs'],
  mapas: [],
});
