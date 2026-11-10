# src/previews — las fichas de la galeria

Como se monta cada componente en la galeria: el catalogo (que ficha existe, de donde sale), el
registro (la tabla tag -> ficha) y el armazon (`_shell.html`).

- `catalog.ts` — el catalogo: por cada componente, de donde sale su JS, su CSS, su JSON y su ficha.
- `registry.ts` — el registro que la galeria consulta en runtime.
- `_shell.html` — el iframe donde vive el preview.

## Reglas

- El catalogo apunta a `dist/` (lo publicado), nunca a `src/`.
- Una ficha por componente: `dist/previews/<cat>/<nombre>.json`.
- Lo que el registro resuelve sale del `.json` del componente, no de una lista aparte.
