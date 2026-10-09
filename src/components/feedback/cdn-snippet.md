---
tag: iswc-cdn-snippet
tags:
  - iswc-cdn-snippet
category: feedback
status: public
source: ./cdn-snippet.ts
style: ./cdn-snippet.css
preview: ./cdn-snippet.json
---
# `<iswc-cdn-snippet>`

## PropÃ³sito

Panel de **consumo por CDN** con una sola estrategia: `loader.min.js`.

Muestra **un solo** bloque copy-paste:

1. `<script type="module" src="â€¦/loader.min.js">` â€” loader del kit.
2. (opcional) deps â€” p. ej. `patyLoader.min.js` â€” **en el mismo snippet**, justo despuÃ©s.
3. `<script type="module">` — `loadPageStyles(['iswc-palettes-default'])` + `load(…)`.

El snippet siempre hace `load('iswc-foo')` / `load('paty-â€¦')`: un componente por llamada. No hay filas Â«Dependencia Â· â€¦Â» sueltas: las deps se embeben.

Sin tab de mirrors. Sin filas sueltas de `all.min.js` / categorÃ­a / tag. Skill: mÃ³dulo + kit (general).

## CuÃ¡ndo usarlo

Documentar cÃ³mo pegar el kit en una app (galerÃ­a, demos, README embebido).

## CuÃ¡ndo no usarlo

No como selector de espejos ni como listado de URLs sueltas de cada `.min.js`.

## ImportaciÃ³n

```js
import './cdn-snippet.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-cdn-snippet tag="iswc-button"></iswc-cdn-snippet>
```

## API

### Atributos

| Atributo | Notas |
| --- | --- |
| `tag` | p. ej. `iswc-button` â†’ `load('iswc-button')` |
| `base` | override del CDN base (opcional) |
| `title` | tÃ­tulo del panel |
| `dependencies` / slot `deps` | deps externas (link/script) |
| `config` | JSON con `docs[]` para el prompt LLM |

### Snippet generado (forma canÃ³nica)

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@REF/dist/cdn/core/loader.min.js"></script>
<!-- si hay deps (p. ej. patyLoader), van aquÃ­ en el mismo bloque -->
<script type="module">
  const L = globalThis.ISWebComponentsLoader;
  // is-base.min.css se auto-carga al importar el loader (W52).
  await L.loadPageStyles(['iswc-palettes-default']);
  await L.load('iswc-button');
</script>
```


## Eventos

| Evento | DescripciÃ³n |
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

## QuÃ© hacer

- Preferir siempre `loader.min.js` + `load(tag)`.

## QuÃ© no hacer

- No reintroducir tab **Mirrors** ni boot multi-espejo en este panel.
- No volver a filas separadas â€œCSS comÃºn / tag.min / category.min / all.minâ€.
- No mezclar jsDelivr + Pages en el mismo documento (sigue valiendo en apps; el panel ya no lo configura).

## Errores / prevenciÃ³n

| Trampa | Fix |
| --- | --- |
| Panel enseÃ±a `all.min.js` | Solo `loader.min.js` + `L.load(tag)` |

GuardiÃ¡n: `tests/cdn-mirrors.test.ts` (contrato loader copy-paste) Â· `tests/url-nav.test.ts`.
