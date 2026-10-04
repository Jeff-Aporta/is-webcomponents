---
tag: iswc-cdn-snippet
tags:
  - iswc-cdn-snippet
category: feedback
status: public
source: ./cdn-snippet.js
style: ./cdn-snippet.css
preview: ./cdn-snippet.json
---
# `<iswc-cdn-snippet>`

## Propósito

Panel de **consumo por CDN** con una sola estrategia: `loader.min.js`.

Muestra **un solo** bloque copy-paste:

1. `<script type="module" src="…/loader.min.js">` — loader del kit.
2. (opcional) deps — p. ej. `patyLoader.min.js` — **en el mismo snippet**, justo después.
3. `<script type="module">` — `loadCSSBase` + `loadCSSPalettesDefault` + `load(…)`.

El snippet siempre hace `load('iswc-foo')` / `load('paty-…')`: un componente por llamada. No hay filas «Dependencia · …» sueltas: las deps se embeben.

Sin tab de mirrors. Sin filas sueltas de `all.min.js` / categoría / tag. Skill: módulo + kit (general).

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
<iswc-cdn-snippet tag="iswc-button"></iswc-cdn-snippet>
```

## API

### Atributos

| Atributo | Notas |
| --- | --- |
| `tag` | p. ej. `iswc-button` → `load('iswc-button')` |
| `base` | override del CDN base (opcional) |
| `title` | título del panel |
| `dependencies` / slot `deps` | deps externas (link/script) |
| `config` | JSON con `docs[]` para el prompt LLM |

### Snippet generado (forma canónica)

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@REF/dist/cdn/core/loader.min.js"></script>
<!-- si hay deps (p. ej. patyLoader), van aquí en el mismo bloque -->
<script type="module">
  const L = globalThis.ISWebComponentsLoader;
  await L.loadCSSBase();
  await L.loadCSSPalettesDefault();
  await L.load('iswc-button');
</script>
```


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-cdn-snippet');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>

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
