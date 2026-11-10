# src/pages — las paginas de la galeria

Las paginas que no son la home: los iconos, los temas y el ecosistema. Cada una es un `.ts` (su
comportamiento) y un `.json` (sus datos).

- `home.ts` / `home.json` — la portada.
- `icons.ts` / `icons.json` — el catalogo de iconos.
- `theming.ts` / `theming.json` — los temas y las paletas.
- `ecosystem.ts` / `ecosystem.json` — el mapa del kit: que componente usa cual.
- `phase7.json` — datos de una fase del plan (sin comportamiento propio).

## Reglas

- El `.ts` y el `.json` van juntos: el `.ts` lee el `.json`.
- Las paginas se sirven desde `dist/pages/` (bundleadas y minificadas).
- El `.json` se publica minificado; la fuente se queda legible.
