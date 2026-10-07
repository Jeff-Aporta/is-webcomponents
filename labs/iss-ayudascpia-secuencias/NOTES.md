# Lab · iss-ayudascpia-secuencias

**Inicio:** 2026-10-07
**Proyecto destino:** `PatyIA/_experimental/ISS-AyudasCPIA` (editables en
`docs-experimental/diagramas/`, publicados en `docs/<módulo>/999-Adjuntos/010-Diagramas/`)
**Kit:** `<iswc-sequence-diagram diagram-style="insoft">`

## Objetivo

Los cinco diagramas de secuencia del ISS con el mismo estilo InSoft que el DER,
componentes y clases: Poppins, participantes `#C1BFFF` con borde negro, cajas
de sistema `primary`/`group`, **aristas coloreadas por subproceso** (grupos con
color por nombre) y **regiones horizontales** (`fragments`) para marcar lo que
ocurre junto, en stream o repetido.

| Payload | Doc del ISS | Grupos | Regiones |
| --- | --- | --- | --- |
| `seguridad-autorizacion` | General · Seguridad | http, jwt, seg, db | rol vigente · valor de la acción |
| `seguridad-jwt` | General · Seguridad | http, ds, jwt, err | validación en DataSnap |
| `seguridad-portal-login` | General · Seguridad | http, ds, jwt, err | existencia del contacto y empresas |
| `conversacion-turno` | Conversaciones · Turno | sse, ctl, db, llm | registro · **async** stream × N · cierre |
| `conversacion-tiquete` | Conversaciones · Tiquete | http, ctl, db, err | alta del tiquete |

Los mensajes se verificaron contra el código del ISS (`src/functions/index.ts`,
`identity.controller.ts`, `conversationChat.controller.ts`,
`conversationTicket.controller.ts`, `000 basePatyIA.controller.ts`): nombres de
métodos, tablas, secuencias y códigos de respuesta son los reales. En
`seguridad-autorizacion` el paso 7 dice lo que hoy hace `rolPrincipal`: sin rol
vigente → `USR`; SEG caído → 503.

## Formato

Cada `payloads/<slug>.json` tiene **exactamente** el formato del editable del
ISS (`slug`, `module`, `tag`, `script`, `attrs`, `payload`): se copia tal cual a
`docs-experimental/diagramas/` y el ISS lo regenera con `npm run docs:diagramas`
+ `npm run docs:publicar`.

## Cómo regenerar

```bash
cd Personal/apps/is-webcomponents
deno task build                                                  # si cambió el kit
deno run -A --no-check labs/iss-ayudascpia-secuencias/render.mjs # todos → out/*.svg + *.png
deno run -A --no-check labs/iss-ayudascpia-secuencias/render.mjs conversacion-turno
```

## Ajustes de kit hechos en este lab (2026-10-07)

1. `themes/insoft-seq.json` — tema `sequence` del estilo `insoft` (se carga con
   los otros tres por `diagram-style`). Trae `lines` (colores saturados por
   nombre para trazos) además de las paletas de área.
2. `sequence-spec.ts` — `groups[].color`, `fragments[]` (regiones por ids de
   mensaje, anidación por contención, aire propio por región) y `alt` que
   nunca monta la región anterior.
3. `sequence-diagram.ts` — resuelve el tema del estilo, tipografía y pintura
   del tema, pinta regiones con pestaña UML, colorea aristas por grupo y
   admite `edgeStyle: "curved"`.
4. `diagram-vocab.ts` — vocabulario común (familias de arista, estructuras,
   `policy`) y `_shared/diagram-curve.ts` (capa curva sobre ruta ortogonal).
5. Guardianes: `src/utils/health/diagrams/sequence-vocab.test.ts`.

## Salidas

`out/<slug>.svg` y `out/<slug>.png` (revisión visual).
