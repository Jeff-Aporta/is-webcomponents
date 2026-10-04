---
tag: iswc-card
tags:
  - iswc-card
category: layout
status: public
source: ./card.js
style: ./card.css
preview: ./card.json
---
# `<iswc-card>`

## Propósito

Contenedor flexible con slots para media, header,
body, footer y actions.
Cinco apariencias y dos orientaciones. JavaScript nativo, Shadow DOM, sin frameworks.

Este módulo registra `<iswc-card>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## Importación

```js
import './card.js';
```

## Ejemplo mínimo

```html
<iswc-card>Hola mundo</iswc-card>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `orientation` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `variant` | lectura/escritura | Declarada por clase. |
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


| Evento | Descripción |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-card');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

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
| `--iswc-space-l` | Token leído o definido por componente. |
| `--card-bg` | Token leído o definido por componente. |
| `--card-border` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-accent-bg` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-card> — Web Component (vanilla, zero dependencies).
> Define el custom element `iswc-card` automáticamente al importarse.
> Usa Shadow DOM con CSS propio, sin frameworks.
> Atributos
>   variant    accent | filled | outlined | filled-outlined | plain
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
>   --spacing     padding/gap entre secciones (default var(--iswc-space-l, 1rem))
> Layout:
>   vertical  → media → header → body → footer  (column)
>   horizontal→ media | body | actions           (row, body grows)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-card>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-card variant="accent">...</iswc-card>
<iswc-card variant="filled-outlined">...</iswc-card>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

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
- [Preview](./card.json)
