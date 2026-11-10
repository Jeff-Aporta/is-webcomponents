# tests/gobernanza — las reglas del repo

Cada archivo vigila una regla: lo que el repo no deja que se rompa. Un rojo aqui es un
problema de forma, no de funcion.

## Como se escriben

- Un guardián por regla, con su nombre en el mensaje.
- Si un guardián exige un archivo que se renombra, se actualiza en el MISMO commit.
- Los patrones se arman con trozos cuando el guardián tiene que buscar su propia marca.
- Un guardián nuevo se registra aqui.

## Los guardianes

- `identidad.test.ts` — la marca del kit y la que ya no tiene.
- `indice-md.test.ts` — el indice de todos los md.
- `cabecera-contexto.test.ts` — la cabecera `@contexto` en las fuentes.
- `scss-simple.test.ts` — el SCSS simple: un modulo, sin `@import`, sin copias.
- `json-minificado.test.ts` — lo publicado, minificado.
- `sin-codigo-muerto.test.ts` — nada sin importador ni export sin consumidor.
- `brand-casing.test.ts` — la marca se escribe siempre igual.
