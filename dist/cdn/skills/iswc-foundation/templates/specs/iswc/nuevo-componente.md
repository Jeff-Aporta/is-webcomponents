---
name: nuevo-componente
description: Crear un componente __PREFIJO__-* en una app iswc. Úsala cada vez que nace una pieza visible nueva o se migra una existente al estándar.
---
<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/specs/iswc/nuevo-componente.md -->

# Nuevo componente `__PREFIJO__-<x>`

Referencia viva: `<__PREFIJO__-hola>` (`view/hola/components/`). Copia su forma.

## 1. Antes de escribir

0. **Todo es componente**: cualquier estructura de UI (figura, fila de metadatos, pie, paginador, caja vacía) es un componente; nunca HTML suelto en vistas, renders ni `index.html`.
1. ¿El kit ya lo resuelve? Busca la intención en [`kit/catalog.md`](kit/catalog.md) y [`kit/reference.md`](kit/reference.md) (intención → componente). Botones, campos, diálogos, tablas, toasts, iconos, formatos: **siempre `iswc-*`**. Un `__PREFIJO__-*` traduce datos de la app a esos controles.
2. ¿Dónde vive? Si lo usa una sola vista → `view/<vista>/components/`; si lo usan varias → `src/js/components/__PREFIJO__/`. Una vista no importa componentes de otra.
3. Escribe su WHAT en la spec fundación (`specs/foundation/20-…` o la del dominio) con IDs `[W-CAT-NN]`.

## 2. Los cuatro archivos hermanos (mismo nombre base, misma carpeta)

Los exige `tests/vistas/contrato-componentes.test.ts`: un tag de `kit-tags.ts` sin alguno de ellos deja el gate en rojo.

| Archivo | Contenido |
| --- | --- |
| `__PREFIJO__-<x>.ts` | Lógica de pintado y eventos. Nada de CSS dentro. Lógica de dominio en `utils/` |
| `__PREFIJO__-<x>.scss` | Estilos: `@use "tokens" as t; @use "mixins" as m;`, colores solo `--iswc-*`, anidado, `prefers-reduced-motion` si anima |
| `__PREFIJO__-<x>.md` | Ficha: front matter `name`/`description` y H2 exactos `Anatomía`, `Atributos observados`, `Props`, `Eventos`, `Slots`, `Ejemplos` (excluir con `<!-- exclude: X -->`; Anatomía nunca) |
| `__PREFIJO__-<x>.json` | Playground `iswc-preview/v1` (ver [`demo-componente.md`](demo-componente.md)) |

## 3. El `.ts`

Forma canónica del molde del kit (`IswcElement`): estáticos `tag`/`css`/`observed`/`deps`, el CSS por `iswc:css` y
`define(Clase)`.

```ts
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../../src/js/base/componente.js';
import type { __CLASE__XProps } from '../../../src/js/consts/schemas/componentes.schemas.js';

class __CLASE__X extends Componente<__CLASE__XProps> {
  static tag = '__PREFIJO__-x';
  static css = css;
  static observed = ['color'];
  static deps = ['iswc-button'];

  protected override inicial(): __CLASE__XProps {
    return { /* defaults */ };
  }

  protected override pintar(root: ShadowRoot, props: __CLASE__XProps): void {
    root.append(html`<iswc-button oniswc-click=${() => this.emit('__PREFIJO__-x-accion', { /* detail */ })}>…</iswc-button>`);
  }
}

define(__CLASE__X);
```

- `static tag` es exactamente el nombre del archivo; `define(Clase)` lo lee de ahí (idempotente).
- `import css from 'iswc:css'`: el build incrusta el `.css` compilado de su `.scss` hermano y el molde lo adopta (una
  hoja por clase). En Deno (`deno task check`) resuelve a `''` (`deno.json` → `src/utils/iswc-css-vacio.ts`).
- `static observed`: atributos observados (`onAttributeChanged(nombre, viejo, nuevo)`); nada de
  `static get observedAttributes`. `static deps`: tags del kit que pinta; el molde los pide al loader al conectar.
- Eventos `__PREFIJO__-<dominio>-<acción>` con `this.emit(nombre, detail)` (bubbles + composed), `detail` mínimo.
- Repintado parcial: `protected override parcial(props, previos)` devuelve `true` si ya aplicó el cambio.
- Sin `props`: `class X extends IswcElement` (`import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs'`)
  con `static template` y `onConnected()`. Referencia: `<__PREFIJO__-hola-mundo>`.
- Los estáticos van sin `override` (el molde llega como JS publicado y TypeScript no los ve declarados); los
  métodos (`onConnected`, `pintar`, `inicial`, `parcial`) sí lo llevan.
- Nunca `adoptCss`, `<link>` a la hoja hermana ni `fetch` del CSS: eso era la base anterior al molde.

## 4. Props con Zod

1. Schema en `src/js/consts/schemas/componentes.schemas.ts`: `export const __CLASE__XPropsSchema = z.object({...})` y su `type … = z.infer<…>`.
2. Registro en `src/js/base/props-registro.ts`: `registrarClaves('__PREFIJO__-x', __CLASE__XPropsSchema)`.
3. Datos de fuera (API, URL, almacenamiento): `safeParse`, nunca `as`.

## 5. Registro (una vez)

- `src/js/kit-tags.ts`: en `APP_TAGS` (transversal) o en `VIEW_TAGS.<vista>`. Si usa un `iswc-*` nuevo, añádelo a `KIT_TAGS`.
- Barril: `import './__PREFIJO__-x.js';` en el `all.ts` de su carpeta (hijos antes que el shell).
- Si se ve en el primer pintado y es del kit, va también en `SHELL_CRITICO` (su cierre se precarga desde el HTML).
- Galería: su línea en `view/demo/manifest.json`, con demo y playground (`controls`); el guardián de demos falla si falta.
- ¿Es general (sin dominio de la app)? Marca en su `.json`: `"reuso": { "candidato": "iswc-base", "motivo": "…", "propuesta": "iswc-…" }`.

## 6. Cierre

Pruebas WHAT de su comportamiento (`tests/componentes/` o `tests/vistas/`, formato común) y
`deno task test:all` en verde. Actualiza la spec (`W2H.md`).
