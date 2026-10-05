---
tag: iswc-breadcrumb
tags:
  - iswc-breadcrumb
category: navigation
status: public
source: ./breadcrumb.ts
style: ./breadcrumb.css
preview: ./breadcrumb.json
---
# `<iswc-breadcrumb>`

## PropÃ³sito

Migas de pan accesibles con marcado <nav>,
ARIA roles y separador automÃ¡tico entre items.

Este mÃ³dulo registra `<iswc-breadcrumb>`.

## CuÃ¡ndo usarlo

OrientaciÃ³n, movimiento entre vistas y navegaciÃ³n jerÃ¡rquica o secuencial.

## CuÃ¡ndo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## ImportaciÃ³n

```js
import './breadcrumb.js';
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
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `label` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-breadcrumb');
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
| `breadcrumb` | Personalizable con `::part(breadcrumb)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-text-muted` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-breadcrumb> â€” contenedor de una ruta de migas de pan.
> Recibe N `<iswc-breadcrumb-item>` en el slot default y los muestra
> separados por el slot `separator`.
> Atributos
>   label    string  â€” aria-label del nav (anunciado por screen readers).
> Slots
>   (default)  breadcrumb-items.
>   separator  icono o texto entre items (default: chevron-right).
> CSS Parts: ::part(breadcrumb)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-breadcrumb>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

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

- [JavaScript](./breadcrumb.ts)
- [CSS](./breadcrumb.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./breadcrumb.json)
