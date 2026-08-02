---
tag: is-card
tags:
  - is-card
category: layout
status: public
source: ./card.js
style: ./card.css
preview: ../../previews/layout/is-card.html
---
# `<is-card>`

## Propósito

Contenedor flexible con slots para media, header,
body, footer y actions.
Cinco apariencias y dos orientaciones. JavaScript nativo, Shadow DOM, sin frameworks.

Este módulo registra `<is-card>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size variants; escalar mediante font-size contextual y em.

## Importación

```js
import './card.js';
```

## Ejemplo mínimo

```html
<is-card>Hola mundo</is-card>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `appearance` | string/según contrato | Fuente define default/restricción. |
| `orientation` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `appearance` | lectura/escritura | Declarada por clase. |
| `orientation` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `media` | Contenido proyectado. |
| `header` | Contenido proyectado. |
| `header-actions` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `footer` | Contenido proyectado. |
| `footer-actions` | Contenido proyectado. |
| `actions` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `media` | Personalizable con `::part(media)`. |
| `header` | Personalizable con `::part(header)`. |
| `body` | Personalizable con `::part(body)`. |
| `footer` | Personalizable con `::part(footer)`. |
| `actions` | Personalizable con `::part(actions)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--spacing` | Token leído o definido por componente. |
| `--is-space-l` | Token leído o definido por componente. |
| `--card-bg` | Token leído o definido por componente. |
| `--card-border` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-card> — Web Component (vanilla, zero dependencies).
> Define el custom element `is-card` automáticamente al importarse.
> Usa Shadow DOM con CSS propio, sin frameworks.
> Atributos
>   appearance    accent | filled | outlined | filled-outlined | plain
>                 (default 'outlined', reflected)
>   orientation   horizontal | vertical
>                 (default 'vertical', reflected)
> Slots
>   (default)        cuerpo principal (body, requerido)
>   media            sección de medios (vertical: top; horizontal: start)
>   header           encabezado (vertical only)
>   footer           pie (vertical only)
>   actions          acciones (horizontal: end)
>   header-actions   acciones dentro del header (vertical only)
>   footer-actions   acciones dentro del footer (vertical only)
> CSS Parts:  ::part(media) ::part(header) ::part(body) ::part(footer) ::part(actions)
> CSS custom properties
>   --spacing     padding/gap entre secciones (default var(--is-space-l, 1rem))
> Layout:
>   vertical  → media → header → body → footer  (column)
>   horizontal→ media | body | actions           (row, body grows)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-card>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-card appearance="accent">...</is-card>
<is-card appearance="filled-outlined">...</is-card>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./card.js)
- [CSS](./card.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-card.html)
