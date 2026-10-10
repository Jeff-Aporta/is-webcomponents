# 06 — Pines y vendor del kit

## Pin fijo

- Un único SHA de 40 hex **ya publicado** del kit en TODA la app: `src/js/iswc.ts` (canónico), los HTML
  (raíz, vistas, demos, galería) y `deno.json`.
- Formas válidas: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@<sha40>/…` (runtime) y
  `https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/<sha40>/…` (fuentes `.ts` para Deno).
- Prohibido: `@main`, `@master`, `@latest`, SHA corto, `*.github.io`, ramas en raw/githack.
- El kit nunca escribe en la app: **la app se actualiza a sí misma**.

## Protocolo (`src/vendor/iswc-root/tools/pin-update.mjs`, vendorizado)

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
| `tools/` | `pruebas(.schemas).ts`, `pruebas-hijo.ts`, `test-cooldown(.schemas).ts`, `test-queue.ts`, `sync-entregable(.schemas).ts`, `pin-update.mjs` |
| `build/` | `index.ts`, `content-hash.ts`, `asset-url(.schemas).ts`, `stamp-hashes.ts`, `bundle-min(.schemas).ts`, `asset-store.ts` |

- Cabecera `// @vendor iswc-root@<sha>[+local] dist/cdn/<ruta>` y «No editar». Se cambian en el kit y se
  re-vendorizan. `vendor:iswc` lee el SHA de `src/js/iswc.ts` (vendor = pin siempre); `--local` copia del
  checkout local del kit para probar cambios antes de publicarlos.
- Fuente remota: raw por SHA (sin el límite de 50 MB de jsDelivr), jsDelivr de respaldo.

## Descarga de vendor: `tools/vendor.ts` (pin por fecha ISO)

Todo lo que un proyecto trae del kit por vendor strategy lo baja `dist/cdn/tools/vendor.ts`, con Deno, a partir de un JSON del proyecto (ver `vendor.schemas.ts`):

```json
{
  "repo": "Jeff-Aporta/is-webcomponents",
  "local": "C:/ContaPyme/Personal/apps/is-webcomponents",
  "archivos": [
    { "desde": "dist/cdn/lib/obj.ts", "hacia": "src/sources/000 Base/ISU/obj.ts", "doc": "dist/cdn/lib/obj.md" }
  ]
}
```

- **Carpeta `ISU/`**: lo vendorizado conserva su nombre normal y vive en una carpeta `ISU/` del proyecto, así no choca con los archivos propios.
- **Pin por fecha ISO**: por archivo compiten el checkout local del kit (fecha del último commit que lo tocó, o «ahora» si tiene cambios sin commitear) y el HEAD remoto; gana el más reciente y solo se escribe si es más nuevo que la copia (`// @vendor <ISO>`). Nunca hay regresiones.
- **Cabecera**: `// @vendor <ISO> <repo>@<sha|local> <desde>` y `// @doc <documentación>`.
- **Dónde se corre**: el comando vive solo en el `package.json` del mirror `_experimental` (el del entregable no lo define), y el sync al entregable siempre descarga antes de copiar.
