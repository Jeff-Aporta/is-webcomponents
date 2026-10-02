---
tag: iswc-theme-toggle
tags:
  - iswc-theme-toggle
category: feedback
status: public
source: ./theme-toggle.js
style: ./theme-toggle.css
preview: ./theme-toggle.json
---
# `<iswc-theme-toggle>`

## Propósito

Alterna el tema del contenedor.
`scope="root"` escribe en `<html>`.
`scope="closest"` (default) usa el contenedor más cercano
([container-theme] / .container-theme
/ .theme-dark|.theme-light / [data-theme];
si no hay, <html>).
Compone iswc-check-icon-button (noche ↔ sol).
Emite iswc-theme-change con detail.theme y
detail.container.

Este módulo registra `<iswc-theme-toggle>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './theme-toggle.js';
```

## Ejemplo mínimo

```html
<div class="container-theme theme-dark" data-theme="dark">
<iswc-theme-toggle dark></iswc-theme-toggle>
…
</div>
<div class="container-theme theme-light" data-theme="light">
<iswc-theme-toggle></iswc-theme-toggle>
</div>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `dark` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `dark` | lectura/escritura | Declarada por clase. |
| `themeContainer` | solo lectura | Declarada por clase. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-theme-change` | sí | sí | sí | no |

`detail`: `{ theme: 'light' \| 'dark', dark: boolean, container: Element }`.
Al ser `composed` + `bubbles`, también se puede escuchar en `document`.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-control-text` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-theme-toggle> — Web Component (vanilla).
> Compone <iswc-check-icon-button> (noche ↔ sol). Al activarse:
>   1. Busca el contenedor de tema más cercano:
>        [container-theme] | .container-theme | .theme-dark | .theme-light | [data-theme]
>      (fallback: document.documentElement)
>   2. Alterna theme-dark / theme-light + data-theme en ese contenedor
>   3. Refleja `dark` en el host
>   4. Emite `iswc-theme-change` { detail: { theme, dark, container } }
> Attributes
>   dark  boolean (reflected) — tema actual (dark=true → icono de sol / próximo click a light)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/check-icon-button.js`](../actions/check-icon-button.js)

Tags del módulo: `<iswc-theme-toggle>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<div class="container-theme theme-dark" data-theme="dark">
<iswc-theme-toggle dark></iswc-theme-toggle>
…
</div>
<div class="container-theme theme-light" data-theme="light">
<iswc-theme-toggle></iswc-theme-toggle>
</div>
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

- [JavaScript](./theme-toggle.js)
- [CSS](./theme-toggle.css)
- [Índice de categoría](./LLM.md)
- [Preview](./theme-toggle.json)
