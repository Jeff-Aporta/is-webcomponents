# tests/navegador — lo que pasa en el navegador

Las pruebas que necesitan un navegador de verdad: el DOM real, el foco, el teclado y el
scroll. Se ejecutan en Edge headless.

## Como se escriben

- El harness esta en `tests/.audit/e2e/`.
- Cada prueba abre la pagina, hace algo y mira lo que quedo.
- Lo que se mide es el resultado observable, no el estado interno.
