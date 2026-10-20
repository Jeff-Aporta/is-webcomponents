// assets/dl.js — íconos del kit: SOLO configuración de rutas. La lógica vive en
// src/vendor-distributions/client/tools/download-iconify.ts (las apps corren su bundle online @main).
// Baja a assets/iconify/<set>/<nombre>.svg los íconos del kit (sin mapa); las páginas del kit servidas en
// su mismo origen los piden ahí (icon-loader) antes que a la API.
import { descargarIconos } from '../src/vendor-distributions/client/tools/download-iconify.ts';

await descargarIconos({
  raiz: new URL('..', import.meta.url),
  // labs: los diagramas del lab (y sus íconos) se sirven en local, sin depender de la API.
  roots: ['src/components', 'src/core', 'labs'],
  // Apps del VPS (erp-sqlite-front, usrs-front, admn-vps, android-wc): sirven sus íconos desde esta
  // carpeta en jsDelivr (`<html data-icons>`, sin 429 de la API) y el barrido del kit no los ve.
  extra: [
    'mdi:account-circle', 'mdi:account-group', 'mdi:account-multiple', 'mdi:android', 'mdi:chat',
    'mdi:cogs', 'mdi:database-search', 'mdi:lan-connect', 'mdi:routes', 'mdi:table-large',
    'mdi:update', 'mdi:view-dashboard-outline',
  ],
});
