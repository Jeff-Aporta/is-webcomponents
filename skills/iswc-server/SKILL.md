---
name: iswc-server
description: >-
  Estándar transversal para proyectos SERVER que consumen el kit (ISS): vendor y pines, pruebas con
  cooldown, jueces, sync al entregable, Zod y la guía de herramientas de test. Nada de componentes,
  estilos, íconos ni build de front. Usar al alinear o mantener una API/backend que trae piezas del kit
  por vendor (perfil `server`).
---
<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-server/SKILL.md -->

# iswc-server — el kit para un proyecto server (perfil `server`)

Un server (ISS-AyudasCPIA es el ejemplo) **no es una app iswc**: no crea componentes, no tiene estilos, íconos ni
build de front. Del kit toma solo lo neutro (`vendor-distributions/shared/`): el sistema común de pruebas con
cooldown, los jueces (semántica local, JEV, LLM), el sync al entregable, los contratos Zod y el vendor por barrido.
Esta skill no duplica texto: enlaza a las referencias de `iswc-foundation` que aplican a un server, y nada más.
`iswc-foundation` completa e `is-cdn-install` son para apps de web components (perfil `client`); un server no las
vendoriza.

## Referencias que aplican (en `references/`, vendorizadas desde `skills/iswc-foundation/references/`)

| Tema | Referencia |
| --- | --- |
| Zod y tipos (W54: contratos en `schemas.ts`, `safeParse` para datos externos) | [05-zod-y-tipos.md](references/05-zod-y-tipos.md) |
| Vendor por barrido (`vendor.ts` online desde `@main`), pines por SHA, protocolo de pines, `vendor.json` como bootstrap | [06-pines-y-vendor.md](references/06-pines-y-vendor.md) |
| Pruebas: `pruebas.ts` (una por una, cooldown x1440, reintento, `--hijo`), gate | [07-pruebas-y-gate.md](references/07-pruebas-y-gate.md) |
| Sync `_experimental` → `_entregable` (`sync-entregable.ts`: gate, bloqueados, checkpoint) | [08-sync-entregable.md](references/08-sync-entregable.md) |
| Jueces opcionales: semántica local determinista (`semantica.ts`), JEV y LLM (`jueces.ts`), cooldown de llaves | [12-jueces.md](references/12-jueces.md) |
| Herramientas de test: qué usar y cuándo (guía única para agentes) | [14-herramientas-de-test.md](references/14-herramientas-de-test.md) |

## Qué vendoriza un server

- `shared/testing/`: `pruebas.ts`, `test-cooldown.ts`, `jueces.ts`, `semantica.ts`, `proveedores-llm.ts` → su carpeta de
  tests (ISS: `tests/.audit/ISU/`), con el `shared/schemas.ts` único (podado a esas secciones).
- `shared/tools/sync-entregable.ts` (lo importa el sync con tsx) y `shared/lib/obj.ts` + `schemas.ts` (sección `obj`) si
  el código lo usa.
- Skills: `skills/iswc-server` (esta) y, si renderiza docs con diagramas del kit, `skills/iswc-diagramas-enriquecidos`.
- Online, nunca vendorizados: `vendor.ts`, `pin-update.mjs` (y `render-lote.ts` para docs), desde `@main` con `--reload`.

`vendor.json` de un server: `"perfil": "server"` (bloquea `client/` y cualquier dependencia de navegador), `raices` =
sus carpetas `ISU/` y `skills/`, y las altas de arriba (las referencias se dan de alta archivo por archivo hacia
`skills/iswc-server/references/<mismo nombre>.md`; su cabecera `@vendor` conserva el origen en `iswc-foundation/references`).
