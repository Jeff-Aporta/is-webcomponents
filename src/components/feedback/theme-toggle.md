---
tag: iswc-theme-toggle
tags:
  - iswc-theme-toggle
category: feedback
status: public
source: ./theme-toggle.ts
style: ./theme-toggle.css
preview: ./theme-toggle.json
---
# `<iswc-theme-toggle>`

## PropÃ³sito

Alterna el tema del contenedor.
`scope="root"` escribe en `<html>`.
`scope="closest"` (default) usa el contenedor mÃ¡s cercano
([container-theme] / .container-theme
/ .theme-dark|.theme-light / [data-theme];
si no hay, <html>).
Compone iswc-check-icon-button (noche â†” sol).
Emite iswc-theme-change con detail.theme y
detail.container.

Este mÃ³dulo registra `<iswc-theme-toggle>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './theme-toggle.js';
```

## Ejemplo mÃ­nimo

```html
<div class="container-theme theme-dark" data-theme="dark">
<iswc-theme-toggle dark></iswc-theme-toggle>
â€¦
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
| `dark` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `dark` | lectura/escritura | Declarada por clase. |
| `themeContainer` | solo lectura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-theme-change` | Evento personalizado del componente (theme change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-theme-change` | sÃ­ | sÃ­ | sÃ­ | no |

`detail`: `{ theme: 'light' \| 'dark', dark: boolean, container: Element }`.
Al ser `composed` + `bubbles`, tambiÃ©n se puede escuchar en `document`.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-theme-toggle');
el.addEventListener('iswc-theme-change', (e) => {
  console.log('iswc-theme-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-theme-toggle> â€” Web Component (vanilla).
> Compone <iswc-check-icon-button> (noche â†” sol). Al activarse:
>   1. Busca el contenedor de tema mÃ¡s cercano:
>        [container-theme] | .container-theme | .theme-dark | .theme-light | [data-theme]
>      (fallback: document.documentElement)
>   2. Alterna theme-dark / theme-light + data-theme en ese contenedor
>   3. Refleja `dark` en el host
>   4. Emite `iswc-theme-change` { detail: { theme, dark, container } }
> Attributes
>   dark  boolean (reflected) â€” tema actual (dark=true â†’ icono de sol / prÃ³ximo click a light)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/check-icon-button.js`](../actions/check-icon-button.js)

Tags del mÃ³dulo: `<iswc-theme-toggle>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<div class="container-theme theme-dark" data-theme="dark">
<iswc-theme-toggle dark></iswc-theme-toggle>
â€¦
</div>
<div class="container-theme theme-light" data-theme="light">
<iswc-theme-toggle></iswc-theme-toggle>
</div>
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

- [JavaScript](./theme-toggle.ts)
- [CSS](./theme-toggle.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./theme-toggle.json)
