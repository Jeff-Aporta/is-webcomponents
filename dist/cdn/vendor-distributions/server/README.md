<!-- @vendor 2026-10-13T13:38:40.106Z Jeff-Aporta/is-webcomponents@local dist/cdn/vendor-distributions/server/README.md -->
# `vendor-distributions/server/` — exclusivo de proyectos server

Perfil `server`: lo baja solo un consumidor con `"perfil": "server"` en su `vendor.json` (junto con `shared/`).

Reglas (guardián `src/utils/health/meta/vendor-perfiles.test.ts`):

- Nada de aquí importa de `client/` ni dependencias de navegador (`playwright`, `@browserbasehq/stagehand`,
  `puppeteer`, `document`/`window`…).
- Puede importar de `shared/`; `shared/` nunca importa de aquí.
- Si un módulo lo usan también los proyectos client, no es de `server/`: va en `shared/`.

Hoy está vacío: todo lo que usa ISS (pruebas, jueces, proveedores LLM, sync, vendor, obj) lo usa también ISW.
Índice general: [README.md](https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md).
