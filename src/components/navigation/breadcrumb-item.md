---
tag: iswc-breadcrumb-item
tags:
  - iswc-breadcrumb-item
category: navigation
status: public
source: ./breadcrumb-item.ts
style: ./breadcrumb-item.css
preview: ./breadcrumb-item.json
---
# `<iswc-breadcrumb-item>`

## PropÃ³sito

Migas de pan accesibles con marcado <nav>,
ARIA roles y separador automÃ¡tico entre items.

Este mÃ³dulo registra `<iswc-breadcrumb-item>`.

## CuÃ¡ndo usarlo

OrientaciÃ³n, movimiento entre vistas y navegaciÃ³n jerÃ¡rquica o secuencial.

## CuÃ¡ndo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## ImportaciÃ³n

```js
import './breadcrumb-item.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-breadcrumb label="CatÃ¡logo">
<iswc-breadcrumb-item href="/">CatÃ¡logo</iswc-breadcrumb-item>
<iswc-breadcrumb-item href="/ropa">Ropa</iswc-breadcrumb-item>
<iswc-breadcrumb-item href="/ropa/mujer">Mujer</iswc-breadcrumb-item>
<iswc-breadcrumb-item href="">Camisetas</iswc-breadcrumb-item>
</iswc-breadcrumb>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `href` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `target` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `rel` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `href` | lectura/escritura | Declarada por clase. |
| `target` | lectura/escritura | Declarada por clase. |
| `rel` | lectura/escritura | Declarada por clase. |
| `icon` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `separator` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-breadcrumb-item');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `separator` | Personalizable con `::part(separator)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `end` | Personalizable con `::part(end)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--_gap` | Token leÃ­do o definido por componente. |
| `--iswc-text-muted` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-link` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-link-hover` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-breadcrumb-item> â€” un paso individual dentro de un <iswc-breadcrumb>.
> Si tiene `href` (incluido `href=""`), el item se renderiza como <a href>.
> Con `href=""` se marca como current page (aria-current="page", CSS [current]).
> Si no tiene href, se renderiza como <span> (SPAs: el desarrollador maneja eventos).
> Atributos
>   href    string  â€” opcional: el item se vuelve enlace. "" = current page.
>   target  string  â€” opcional.
>   rel     string  â€” opcional.
>   icon    string  â€” opcional: Iconify id para icono al inicio si no se usa slot start.
> Slots
>   (default)  texto del item.
>   start      icono propio al inicio (gana sobre icon).
>   end        icono propio al final.
>   separator  override del separador (chevron-right por default).
> CSS Parts: ::part(label) ::part(separator) ::part(start) ::part(end)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-breadcrumb-item>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-current`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-breadcrumb-item icon="mdi:home">Inicio</iswc-breadcrumb-item>
<iswc-breadcrumb-item>
<iswc-icon slot="start" icon="mdi:home"></iswc-icon>
Inicio
</iswc-breadcrumb-item>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./breadcrumb-item.ts)
- [CSS](./breadcrumb-item.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./breadcrumb-item.json)
