---
tag: is-response-cache
tags: []
category: helpers
status: public
source: ./response-cache.js
---
# `response-cache` (módulo)

## Propósito

Caché SWR de lecturas en IndexedDB: pintar al instante lo último conocido y
repintar solo si el servidor trae algo distinto. Compartido por apps del kit
(Muéstralo, PatyIA, …).

## Importación

```js
import { createResponseCache, IsResponseCache, canonico } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/helpers/response-cache.min.js';
```

## API

```js
const cache = createResponseCache({
  dbName: 'mi-app',      // default is-response-cache
  storeName: 'respuestas',
  ttlMs: 86_400_000,     // default 24 h
  timeoutMs: 1500,       // IndexedDB no responde → memoria
});

const key = cache.claveDe({ app: 'x', metodo: 'GET', ruta: '/api/y', quien: 'ana' });
await cache.vivo(() => fetch(...).then(r => r.json()), {
  key,
  pintar: (datos, { origen, cambio }) => { /* origen: cache|red */ },
  onError: (e) => {},
});
```

También: `leer`, `guardar` (boolean si cambió), `borrar`, `invalidar`, `vaciar`, `canonico`.

## Reglas

- El caché **nunca** bloquea el pintado (tope de tiempo → Map en memoria).
- Solo lecturas. Tras mutar, `invalidar(trozoDeRuta)` o `vaciar()` al logout.
- `guardar` compara JSON canónico: mismas claves en otro orden no repintan.
