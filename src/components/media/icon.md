---
tag: iswc-icon
tags:
  - iswc-icon
category: media
status: public
source: ./icon.ts
style: ./icon.css
preview: ./icon.json
---
# `<iswc-icon>`

## PropÃ³sito

API Ãºnica de iconos del kit. Usa icon="grupo:nombre" (ids Iconify)
o src para un SVG/imagen. Escala con font-size.
Iconify se carga solo como dependencia interna.

Este mÃ³dulo registra `<iswc-icon>`.

## CuÃ¡ndo usarlo

Iconos, identidad visual y reproducciÃ³n de video.

## CuÃ¡ndo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## ImportaciÃ³n

```js
import './icon.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-icon icon="mdi:home"></iswc-icon>
<iswc-icon icon="mdi:check-circle"></iswc-icon>
<iswc-icon src="/logo.svg" label="Logo"></iswc-icon>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `library` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `src` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `fallback` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `icon` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `src` | lectura/escritura | Declarada por clase. |
| `fallback` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-icon');
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
| `icon` | Personalizable con `::part(icon)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-icon> â€” Web Component (vanilla, zero dependencies).
> UNICA API de iconos del kit. No depende del web component <iconify-icon>
> ni de ningun script externo: el SVG se trae por fetch del sistema de
> iconos propio y se inyecta INLINE en el Shadow DOM, para que
> `currentColor` del contexto se propague al fill del path.
> Bases que prueba, en orden (ver _shared/icon-loader.js):
>   1. dist/assets/icons/ relativo al modulo (bundle CDN).
>   2. assets/icons/ en la raiz del repo (codigo fuente).
>   3. GitHub Pages del proyecto.
>   4. jsDelivr sobre el repo.
> Estados: `data-loading` mientras resuelve, `data-missing` si el icono no
> existe en ninguna base (hueco del tamano del icono, sin caja rota).
> Atributos
>   icon    string  â€” "grupo:nombre" Iconify (ej. mdi:home). Preferido.
>   label   string  â€” a11y; si vacÃ­o â†’ aria-hidden
>   src     string  â€” URL img/svg alternativa (gana sobre icon)
> Compat: name + library (default mdi) se combinan a icon si falta `icon`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)

Tags del mÃ³dulo: `<iswc-icon>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-icon icon="mdi:home"></iswc-icon>
<iswc-icon icon="mdi:check-circle"></iswc-icon>
<iswc-icon src="/logo.svg" label="Logo"></iswc-icon>
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

- [JavaScript](./icon.ts)
- [CSS](./icon.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./icon.json)
