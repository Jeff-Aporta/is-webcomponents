# Spec — herramientas online y pines

> Herramientas que las apps consumen del kit sin copiarlas (`render-lote`, `pin-update`) y el protocolo de pines
> que gobierna lo que sí se vendoriza. No duplica [constitution.md](../constitution.md) ni la skill
> [`06-pines-y-vendor.md`](../../skills/iswc-foundation/references/06-pines-y-vendor.md) (el CÓMO para consumidores).

## Contexto

Las apps (ISS, ISW y las que crea `create-iswc-app`) renderizan sus diagramas de documentación y mantienen sus pines
del kit corriendo herramientas del kit **online** (bundles de `dist/cdn/…` desde `raw@main`). Dos cosas tienen que
valer siempre: el render funciona sin un checkout local del kit, y el inventario de pines solo alerta por refs que de
verdad cargan algo mutable.

## WHAT

### S-H1 Inventario de pines: un SHA, nada mutable

- Toda referencia al kit en la app usa **un único SHA de 40 hex** (forma `@<sha>` o raw por SHA). Dos SHA distintos
  o una ref mutable (rama, `@latest`, SHA corto, GitHub Pages del kit) dejan el inventario en rojo y se listan
  con archivo y línea.
- El sitio propio de la app (`iswc.host`) no es un pin del kit.
- Los scripts online del kit citados desde `raw@main` con `--reload` son la forma canónica: no alertan.

### S-H2 Render de diagramas sin checkout del kit

- `render-lote` corre sin `--kit`/`ISWC_KIT`: sirve una carpeta temporal y todo `dist/cdn/…` que no esté en disco lo
  trae del raw del kit **al SHA del pin** (o de `main` si no hay pin válido de 40 hex).
- Lo traído se sirve con el MIME de su extensión (raw responde `text/plain`; un módulo JS debe llegar como
  `text/javascript` para que el navegador lo importe).
- Un 404 del remoto es un 404 local, sin reintentos; un fallo pasajero (5xx, red) se reintenta.
- Solo `dist/cdn/…` se pide al remoto; nada fuera de la raíz servida se expone (rutas que escapan → 404).
- Con ref inmutable (SHA) lo traído queda en disco y sirve aunque el remoto caiga; con ref de rama no se persiste.

### S-H3 La cabecera `@vendor` no es una ref

- La cabecera que el vendor escribe en lo vendorizado (`<ISO> <repo>@main <desde>`, portable) dice de dónde se
  actualiza el archivo y no carga nada: **no alerta en ninguno de los estilos que el vendor escribe** (ts/js/mjs,
  md con o sin front matter, html, css, json).
- La exención es de la **cabecera**, no de cualquier línea que mencione `@vendor`: una ref mutable del kit en el
  cuerpo (aunque lleve un comentario `@vendor` al final de la línea) sigue alertando.

### S-H4 Sync al entregable: el checkpoint del mirror es obligatorio

- Un sync real en verde (`correrSync`, `shared/tools/sync-entregable.ts`) deja commit del mirror si hubo cambios y,
  con `push: true`, push (sin forzar); sin cambios igual intenta el push y, al día, no falla.
- Si el commit o el push fallan, el sync **falla** con la causa y avisa que el entregable YA quedó copiado.
- El entregable nunca recibe commits ni push automáticos.

Guardián: [`tests/gobernanza/sync-entregable.test.ts`](../../tests/gobernanza/sync-entregable.test.ts) (S7, S8).

## HOW

**HOW débil.** `static-server.ts` (`startStaticServer(root, remoto)`) hace el respaldo remoto con caché en memoria y,
si la base termina en un SHA, en `<root>/.iswc-remoto/`; `render-lote.ts` calcula la base con `baseRemota(pin)`.
`pin-update.mjs` reconoce la cabecera con `CABECERA_VENDOR` (inicio de línea) y los scripts online con `ONLINE`.

**HOW fuerte** (contratos que consumen ISS/ISW; cambiarlos exige ADR):

| Pieza | Contrato |
|---|---|
| CLI online | `deno run -A --reload=https://raw.githubusercontent.com/<repo>/ https://raw.githubusercontent.com/<repo>/main/dist/cdn/vendor-distributions/client/tools/render-lote.mjs --carpeta=… --svg=… [--pin=<sha40>] [--kit=…]` |
| Cabecera | `// @vendor <ISO> <repo>@main <desde>` (y `<!-- -->`, `/* */`, `"$vendor"` según el estilo) |
| Salida del inventario | código 0 verde / 1 rojo; cada ref mutable como `archivo:línea: texto` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Inventario P1-P9 (SHA único, mutables, cabeceras por estilo, exención solo de cabecera) | verde | [`tests/gobernanza/pin-update.test.ts`](../../tests/gobernanza/pin-update.test.ts) |
| Servidor con respaldo remoto R1-R8 | verde | [`tests/gobernanza/static-server-remoto.test.ts`](../../tests/gobernanza/static-server-remoto.test.ts) |
| Lote con caché por hash y render real (L1-L3) | verde | [`tests/diagramas/render-lote.test.ts`](../../tests/diagramas/render-lote.test.ts) |

## Lluvia de casos (2026-10-13)

| Caso propuesto | Estado | Motivo / guardián |
|---|---|---|
| Cabecera `@vendor` en css (`/* … */`) no alerta | Implementado | P8 — **encontró un bug**: el inventario no la reconocía; corregido |
| Cabecera `$vendor` en json no alerta | Implementado | P8 — **mismo bug** en json; corregido |
| Cabecera en ts, mjs, md, md con front matter y html, con y sin `@doc` al pin | Implementado | P8 (ida y vuelta con `conCabecera` del vendor) |
| Import `@main` con `// @vendor` al final de la línea → rojo | Implementado | P9 |
| raw por rama dentro de un objeto con clave `$vendor` (no cabecera) → rojo | Implementado | P9 |
| GitHub Pages del kit en una línea que menciona `@vendor` → rojo | Implementado | P9 |
| `dist/cdn` ausente en disco se sirve del remoto con MIME por extensión (js, css) | Implementado | R2 |
| 404 remoto sin reintentos; 5xx pasajeros se reintentan | Implementado | R3, R5 |
| Fuera de `dist/cdn/` no consulta el remoto | Implementado | R4 |
| Rutas que escapan de la raíz (`..%5c`, `%2e%2e/`) → 404 | Implementado | R6 |
| SHA persiste en disco y sirve con el remoto caído; rama no persiste | Implementado | R7 |
| `baseRemota`: SHA 40 → ese SHA; corto, vacío, ausente o con basura → `main` | Implementado | R8 |
| Render real sin checkout contra raw publicado (red) | Descartado | depende de red y de que el SHA esté publicado: flaky en el gate; lo cubren R1-R8 (servidor) + L3 (render real con el bundle local) |
| Dos pedidos simultáneos del mismo archivo → un solo pedido remoto | Descartado | optimización, no contrato observable para el consumidor |
| `docs:diagramas` de ISS/ISW con 0 fallos | Descartado aquí | vive en el gate de cada app (fuera de este repo) |
| Cabecera `@vendor` con `@<sha>` (legado) cuenta para la homogeneidad del pin | Descartado | el vendor ya escribe solo la forma portable `@main`; las legadas migran al re-vendorizar |
