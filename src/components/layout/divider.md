---
tag: is-divider
tags:
  - is-divider
category: layout
status: public
source: ./divider.js
style: ./divider.css
preview: ../../previews/layout/is-divider.json
---
# `<is-divider>`

## Propósito

Separador horizontal o vertical. Opacidad default 20; color vía tokens del theme.

Este módulo registra `<is-divider>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## Importación

```js
import './divider.js';
```

## Ejemplo mínimo

```html
<is-divider></is-divider>
<is-divider opacity="80" color="brand"></is-divider>
<is-divider orientation="vertical" color="accent"></is-divider>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `orientation` | string/según contrato | Fuente define default/restricción. |
| `opacity` | string/según contrato | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `orientation` | lectura/escritura | Declarada por clase. |
| `opacity` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `divider` | Personalizable con `::part(divider)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--color` | Token leído o definido por componente. |
| `--opacity` | Token leído o definido por componente. |
| `--width` | Token leído o definido por componente. |
| `--spacing` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-divider> — Web Component (vanilla).
> Separador visual horizontal o vertical.
> Atributos
>   orientation  horizontal | vertical (default horizontal)
>   opacity      0–100 (default 20)
>   color        text | text-soft | text-dim | border | control | brand | accent |
>                success | warning | danger (default text)
> role=separator + aria-orientation en el host
> CSS vars: --color, --opacity, --width, --spacing

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-divider>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-orientation`, `aria-hidden`.

## Ejemplo avanzado

```html
<is-divider></is-divider>
<is-divider opacity="80" color="brand"></is-divider>
<is-divider orientation="vertical" color="accent"></is-divider>
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

- [JavaScript](./divider.js)
- [CSS](./divider.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-divider.json)
