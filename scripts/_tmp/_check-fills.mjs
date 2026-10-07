import { readFileSync } from 'node:fs';
const s = readFileSync('labs/iss-ayudascpia-componentes/out/componentes.svg', 'utf8');
const blocks = s.split(/<g class="cd-cmp"/).slice(1);
for (const b of blocks) {
  const id = /data-cmp-id="([^"]+)"/.exec(b)?.[1];
  const fill = /<rect[^>]*fill="([^"]+)"/.exec(b)?.[1];
  const name = /font-weight="700"[^>]*>[\s\S]*?<tspan[^>]*>([^<]+)/.exec(b)?.[1]
    || /font-weight="700"[^>]*>([^<]+)/.exec(b)?.[1];
  console.log(id, fill, name);
}
