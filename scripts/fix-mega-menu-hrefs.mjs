// scripts/fix-mega-menu-hrefs.mjs
// Reemplaza los href="/..." del demo de mega-menu.json por href="#"
// para evitar 404 al gate tour:interactions (click → fetch → 404).
// Conserva el significado vía data-nav (atributo del componente).
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/components/navigation/mega-menu.json';
const src = readFileSync(path, 'utf8');
const fixed = src
  .replace(/href=\\"\/sillas\\"/g, 'href=\\"#\\" data-nav=\\"/sillas\\"')
  .replace(/href=\\"\/mesas\\"/g, 'href=\\"#\\" data-nav=\\"/mesas\\"')
  .replace(/href=\\"\/escritorios\\"/g, 'href=\\"#\\" data-nav=\\"/escritorios\\"')
  .replace(/href=\\"\/estanterias\\"/g, 'href=\\"#\\" data-nav=\\"/estanterias\\"')
  .replace(/href=\\"\/lamparas\\"/g, 'href=\\"#\\" data-nav=\\"/lamparas\\"')
  .replace(/href=\\"\/techo\\"/g, 'href=\\"#\\" data-nav=\\"/techo\\"')
  .replace(/href=\\"\/exterior\\"/g, 'href=\\"#\\" data-nav=\\"/exterior\\"')
  .replace(/href=\\"\/tiras\\"/g, 'href=\\"#\\" data-nav=\\"/tiras\\"')
  .replace(/href=\\"\/mesones\\"/g, 'href=\\"#\\" data-nav=\\"/mesones\\"')
  .replace(/href=\\"\/griferia\\"/g, 'href=\\"#\\" data-nav=\\"/griferia\\"')
  .replace(/href=\\"\/electrodomesticos\\"/g, 'href=\\"#\\" data-nav=\\"/electrodomesticos\\"')
  .replace(/href=\\"\/promo\\"/g, 'href=\\"#\\" data-nav=\\"/promo\\"')
  .replace(/href=\\"\/chat\\"/g, 'href=\\"#\\" data-nav=\\"/chat\\"')
  .replace(/href=\\"\/covid\\"/g, 'href=\\"#\\" data-nav=\\"/covid\\"')
  .replace(/href=\\"\/ticket\\"/g, 'href=\\"#\\" data-nav=\\"/ticket\\"')
  .replace(/href=\\"\/docs\\"/g, 'href=\\"#\\" data-nav=\\"/docs\\"')
  .replace(/href=\\"\/blog\\"/g, 'href=\\"#\\" data-nav=\\"/blog\\"')
  .replace(/href=\\"\/soporte\\"/g, 'href=\\"#\\" data-nav=\\"/soporte\\"');
writeFileSync(path, fixed);
const changes = (src.match(/href=\\"\//g) || []).length;
console.log(`OK: ${changes} hrefs reemplazados en ${path}`);
