---
tag: is-cdn-snippet
tags:
  - is-cdn-snippet
category: feedback
status: public
source: ./cdn-snippet.js
style: ./cdn-snippet.css
preview: ./cdn-snippet.json
---
# `<is-cdn-snippet>`

## Propósito

Panel de **consumo por CDN** con una sola estrategia: `loader.min.js`.

Muestra un bloque copy-paste de dos tags:

1. `<script type="module" src="…/loader.min.js">` — carga el loader.
2. `<script type="module">` — `loadCSSBase` + `loadCSSPalettesDefault` + `load(…)`.

El snippet siempre hace `load('is-foo')`: un componente por llamada. El loader ya carga cada tag por separado, así que el panel no ofrece radio de alcance.

Sin tab de mirrors. Sin filas sueltas de `all.min.js` / categoría / tag. Docs para agentes vía `<is-md-editor>`. Dependencias externas opcionales (slot `deps` / atributo `dependencies`).

## Cuándo usarlo

Documentar cómo pegar el kit en una app (galería, demos, README embebido).

## Cuándo no usarlo

No como selector de espejos ni como listado de URLs sueltas de cada `.min.js`.

## Importación

```js
import './cdn-snippet.js';
```

## Ejemplo mínimo

```html
<is-cdn-snippet tag="is-button"></is-cdn-snippet>
```

## API

### Atributos

| Atributo | Notas |
| --- | --- |
| `tag` | p. ej. `is-button` → `load('is-button')` |
| `base` | override del CDN base (opcional) |
| `title` | título del panel |
| `dependencies` / slot `deps` | deps externas (link/script) |
| `config` | JSON con `docs[]` para el prompt LLM |

### Snippet generado (forma canónica)

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@REF/dist/cdn/core/loader.min.js"></script>
<script type="module">
  const L = globalThis.ISWebComponentsLoader;
  await L.loadCSSBase();
  await L.loadCSSPalettesDefault();
  await L.load('is-button');
</script>
```

## Qué hacer

- Preferir siempre `loader.min.js` + `load(tag)`.

## Qué no hacer

- No reintroducir tab **Mirrors** ni boot multi-espejo en este panel.
- No volver a filas separadas “CSS común / tag.min / category.min / all.min”.
- No mezclar jsDelivr + Pages en el mismo documento (sigue valiendo en apps; el panel ya no lo configura).

## Errores / prevención

| Trampa | Fix |
| --- | --- |
| Panel enseña `all.min.js` | Solo `loader.min.js` + `L.load(tag)` |

Guardián: `tests/cdn-mirrors.test.ts` (contrato loader copy-paste) · `tests/url-nav.test.ts`.
