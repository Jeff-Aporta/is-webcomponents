---
tag: is-icon
tags:
  - is-icon
category: media
status: public
source: ./icon.js
style: ./icon.css
preview: ../../previews/media/is-icon.json
---
# `<is-icon>`

## Propósito

API única de iconos del kit. Usa icon="grupo:nombre" (ids Iconify)
o src para un SVG/imagen. Escala con font-size.
Iconify se carga solo como dependencia interna.

Este módulo registra `<is-icon>`.

## Cuándo usarlo

Iconos, identidad visual y reproducción de video.

## Cuándo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## Importación

```js
import './icon.js';
```

## Ejemplo mínimo

```html
<is-icon icon="mdi:home"></is-icon>
<is-icon icon="mdi:check-circle"></is-icon>
<is-icon src="/logo.svg" label="Logo"></is-icon>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `name` | string/según contrato | Fuente define default/restricción. |
| `library` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `src` | string/según contrato | Fuente define default/restricción. |
| `fallback` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `icon` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `src` | lectura/escritura | Declarada por clase. |
| `fallback` | lectura/escritura | Declarada por clase. |

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
| `icon` | Personalizable con `::part(icon)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-icon> — Web Component (vanilla, zero dependencies).
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
>   icon    string  — "grupo:nombre" Iconify (ej. mdi:home). Preferido.
>   label   string  — a11y; si vacío → aria-hidden
>   src     string  — URL img/svg alternativa (gana sobre icon)
> Compat: name + library (default mdi) se combinan a icon si falta `icon`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)

Tags del módulo: `<is-icon>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`.

## Ejemplo avanzado

```html
<is-icon icon="mdi:home"></is-icon>
<is-icon icon="mdi:check-circle"></is-icon>
<is-icon src="/logo.svg" label="Logo"></is-icon>
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

- [JavaScript](./icon.js)
- [CSS](./icon.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/media/is-icon.json)
