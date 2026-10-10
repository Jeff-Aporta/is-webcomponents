# 06 — Pines y vendor del kit

## Pin fijo

- Un único SHA de 40 hex **ya publicado** del kit en TODA la app: `src/js/iswc.ts` (canónico), los HTML
  (raíz, vistas, demos, galería) y `deno.json`.
- Formas válidas: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@<sha40>/…` (runtime) y
  `https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/…` (fuentes `.ts` para Deno).
- Prohibido: `@main`, `@master`, `@latest`, SHA corto, `*.github.io`, ramas en raw/githack.
- El kit nunca escribe en la app: **la app se actualiza a sí misma**.

## Protocolo (`src/vendor/iswc-root/tools/ISPinUpdate.mjs`, vendorizado)

```bash
deno task pin                                 # inventario: exit 1 si hay >1 SHA, refs mutables o nombre viejo del repo
deno task pin --nuevo=<sha40|ultimo> [--viejo=<sha40>] [--dry-run]
deno task vendor:iswc                         # tools al MISMO SHA del pin
deno task build && deno task test:all
```

- `--nuevo` verifica en jsDelivr que `dist/cdn/core/loader.min.js` exista en ese SHA (si no: exit 3, nada se toca).
- Reconoce y reescribe el nombre anterior del repo (`is-webcomponents@…` → `iswc-root@…`, en `@sha` y en raw).
- Códigos: 0 ok · 1 heterogéneo/mutable/legado · 2 uso inválido · 3 pin no publicado.

## Vendor (`src/vendor/iswc-root/`)

| Carpeta | Archivos |
| --- | --- |
| `tools/` | `pruebas(.schemas).ts`, `ISPruebasHijo.ts`, `test-cooldown(.schemas).ts`, `ISTestQueue.ts`, `sync-entregable(.schemas).ts`, `ISPinUpdate.mjs` |
| `build/` | `index.ts`, `content-hash.ts`, `asset-url(.schemas).ts`, `stamp-hashes.ts`, `bundle-min(.schemas).ts`, `asset-store.ts` |

- Cabecera `// @vendor iswc-root@<sha>[+local] dist/cdn/<ruta>` y «No editar». Se cambian en el kit y se
  re-vendorizan. `vendor:iswc` lee el SHA de `src/js/iswc.ts` (vendor = pin siempre); `--local` copia del
  checkout local del kit para probar cambios antes de publicarlos.
- Fuente remota: raw por SHA (sin el límite de 50 MB de jsDelivr), jsDelivr de respaldo.
