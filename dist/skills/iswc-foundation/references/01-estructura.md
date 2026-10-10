# 01 — Estructura de una app iswc

```
<app>/
├── index.html                    ← shell de la app (<p-app>); arranque estándar (ver 03)
├── deno.json · deno.lock         ← imports fijados + tareas (sin package.json)
├── tsconfig.json                 ← solo editor; el typecheck es `deno task check`
├── AGENTS.md · CLAUDE.md · README.md
├── src/
│   ├── js/
│   │   ├── iswc.ts               ← pin canónico del kit (URL del loader con @sha40)
│   │   ├── kit-tags.ts           ← REGISTRO ÚNICO de tags (KIT_TAGS, APP_TAGS, VIEW_TAGS) + rutas
│   │   ├── boot.ts               ← script plano: tema/paleta antes del primer pintado
│   │   ├── base/                 ← componente.ts (CSS, html, define, fábrica), zod.ts, props-registro.ts
│   │   ├── consts/schemas/       ← *.schemas.ts: Zod y TODOS los tipos (z.infer)
│   │   ├── core/                 ← estado, red, sesión, URL (?s=): sin DOM, compartido
│   │   ├── dominio/              ← reglas de negocio compartidas: sin DOM
│   │   └── components/<p>/       ← componentes transversales (los usan varias vistas) + all.ts
│   ├── styles/                   ← _tokens.scss, _mixins.scss, app.scss (solo light DOM)
│   ├── utils/build.ts            ← build (ver 02)
│   └── vendor/iswc-root/         ← tools del kit al SHA del pin (tools/, build/). NO se edita
├── view/
│   ├── <vista>/                  ← index.html, README.md, demo/, components/, utils/ (ver nueva-vista)
│   └── demo/                     ← galería: index.html, manifest.json, components/<p>-galeria.ts
├── scripts/
│   ├── build/                    ← build-scss.mjs
│   ├── gate/                     ← run-test-all, gate-cooldown, test-health, sync-*, e2e/{run,servidor,harness}
│   ├── vendor/                   ← vendor-iswc-tools.mjs
│   └── calidad/ · diagnostico/ · migraciones/   ← (opcionales) scripts de mantenimiento
├── tests/<area>/*.test.ts        ← pruebas (plataforma, componentes, vistas, e2e…)
├── specs/                        ← README, FOUNDATION, W2H, especificar-what, foundation/, iswc/
└── dist/cdn/                     ← artefactos del build; se versionan (es lo que sirve el hosting)
```

## Reglas de ubicación

| Pieza | Va en | Nunca en |
| --- | --- | --- |
| Lógica con DOM (pintar, emitir) | componente `.ts` | `core/`, `dominio/`, `utils/` |
| Lógica sin DOM de una vista | `view/<v>/utils/` | el componente |
| Lógica sin DOM compartida | `src/js/core/` o `src/js/dominio/` | una vista |
| Tipos y schemas | `src/js/consts/schemas/*.schemas.ts` | junto a la lógica (`type` sueltos) |
| Componente de una vista | `view/<v>/components/` | otra vista |
| Componente de varias vistas | `src/js/components/<p>/` | una vista |
| Estilos de componente | `.scss` hermano | el `.ts` (`<style>`, constantes CSS) |
| Estilos de página | `src/styles/app.scss` | — |
| Código del kit | `src/vendor/iswc-root/` (vendorizado) | editado a mano |

El prefijo `<p>` es el de la app (`paty`, `docs`, `mia`…): minúsculas, sin guiones, igual en todos sus tags.
