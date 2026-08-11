# CDN Loader — diseño

## Problema
`all.min.js` fuerza ~1.8 MB de módulos. El consumidor necesita un entry liviano que cargue solo tags/categorías pedidas.

## API
```js
import { ISWebComponentsLoader } from '.../loader.min.js';

ISWebComponentsLoader.configure({
  mirrors: ['jsdelivr', 'pages'], // o URLs / { id, base(ref) }
  // ref: null → tip SHA de main; o pin fijo:
});
ISWebComponentsLoader.pin('abcdef…'); // opcional
// ISWebComponentsLoader.unpin();

await ISWebComponentsLoader.loadCSSBase();
await ISWebComponentsLoader.loadCSSPalettesDefault();
await ISWebComponentsLoader.load('is-button', 'data-viz');
// load('all') | loadPageStyles([...]) | loadPageModules([...])
```

- Fallbacks: cada asset CDN prueba `self` (si preferSelf) + mirrors en orden.
- CSS de componente: `adoptCss` en shadow (no hace falta listarlo).
- Global: `window.ISWebComponentsLoader`.


## Artefacto
`dist/cdn/loader.min.js` — manifiesto embebido en build desde `manifest.js`.

## Ecosistema JS
Get started (snippet loader), playground de selección con bytes estimados, catálogo `_shared/`.
