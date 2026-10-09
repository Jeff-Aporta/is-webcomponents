---
tag: iswc-response-cache
tags: []
category: helpers
status: public
source: ./response-cache.ts
---
# `response-cache` (mÃ³dulo)

## PropÃ³sito

CachÃ© SWR de lecturas en IndexedDB: pintar al instante lo Ãºltimo conocido y
repintar solo si el servidor trae algo distinto. Compartido por apps del kit
(MuÃ©stralo, PatyIA, â€¦).

## ImportaciÃ³n

```js
import { createResponseCache, IsResponseCache, canonico } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@SHA/dist/cdn/helpers/response-cache.min.js';
```

## API

```js
const cache = createResponseCache({
  dbName: 'mi-app',      // default iswc-response-cache
  storeName: 'respuestas',
  ttlMs: 86_400_000,     // default 24 h
  timeoutMs: 1500,       // IndexedDB no responde â†’ memoria
});

const key = cache.claveDe({ app: 'x', metodo: 'GET', ruta: '/api/y', quien: 'ana' });
await cache.vivo(() => fetch(...).then(r => r.json()), {
  key,
  pintar: (datos, { origen, cambio }) => { /* origen: cache|red */ },
  onError: (e) => {},
});
```

TambiÃ©n: `leer`, `guardar` (boolean si cambiÃ³), `borrar`, `invalidar`, `vaciar`, `canonico`.


## Eventos

| Evento | DescripciÃ³n |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-response-cache');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>

## Reglas

- El cachÃ© **nunca** bloquea el pintado (tope de tiempo â†’ Map en memoria).
- Solo lecturas. Tras mutar, `invalidar(trozoDeRuta)` o `vaciar()` al logout.
- `guardar` compara JSON canÃ³nico: mismas claves en otro orden no repintan.
