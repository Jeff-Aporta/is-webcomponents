# src/cdn/build — las herramientas de construccion

Lo que usa el build para convertir el repo en lo que se publica: el conversor de apps, el
generador de bundles, el resolutor de alias y el sellador de assets.

## Piezas

- `construir-app.ts` — el conversor: de una app (HTML + JS) a una app que se sirve sola, con su
  registrador, sus hojas y su `build-stamp.json`.
- `bundle-kit.ts`, `bundle-min.ts` — los bundles del kit y el minificado.
- `alias.ts` — el alias `@jeff-aporta/iswc-base/` y el `iswc:css`.
- `css-virtual.ts` — el plugin de esbuild que resuelve `iswc:css`.
- `asset-url.ts` — las URLs de assets (con `?v=` si el origen es mutable).
- `stamp-hashes.ts` — el sello de hashes (`asset-hashes.json`).
- `graph.ts` — el grafo de dependencias entre componentes.
- `json.ts` — como se escribe un JSON (minificado en `dist/`, legible en `src/`).

## Reglas

- Cada modulo tiene su `*.schemas.ts`: el contrato, validado con zod.
- Nada de rutas absolutas: todo se resuelve desde la raiz del repo.
- El conversor no inventa: si la app declara una dependencia, se cumple; si no, no se agrega.
- Los JSON que se publican salen minificados (ver `json.ts`).

## Guardianes

- `tests/gobernanza/construir-app.test.ts` — el conversor cumple su contrato.
- `tests/gobernanza/alias-imports.test.ts` — el alias y el import map son los del kit.
- `tests/gobernanza/json-minificado.test.ts` — lo publicado, minificado.
