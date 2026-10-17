# `server/` — perfil server (APIs Deno)

Piezas exclusivas de proyectos server. Se consumen por vendor con `"perfil": "server"` en `vendor.json`.

| Archivo | Qué es |
|---|---|
| `render-shell.ts` | `renderShell(meta, { s, resolverMeta })` genera el HTML del SPA de la API (servido en `/`) con loader pineado, tema pre-pintado, SEO/OG y hook `?s=` |

Lo neutro (pruebas con cooldown) vive en `shared/testing/` (perfil `shared`) y lo usa también el server:

- `shared/testing/pruebas.ts` — runner homogéneo de tests (cooldown, timeout, reporte JSON).
- `shared/testing/test-cooldown.ts` — cooldown proporcional a la duración.

`render-shell.ts` es autocontenido (solo `node:*` y texto): al vendorizar no arrastra imports.
