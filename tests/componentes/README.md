# tests/componentes — los componentes, uno a uno

Las pruebas de cada componente: el contrato de sus props, sus eventos, sus slots y su CSS.
Cada archivo prueba un componente (o una familia). Se ejecutan en su propio proceso.

## Como se escriben

- El nombre del archivo es el del componente (`input.test.ts`) o el de la familia.
- Las pruebas leen el `.json` del componente (el contrato) y el CSS compilado.
- Lo que se prueba es lo observable: lo que llega al navegador.

## Guardianes

- `tests/gobernanza/contrato-cuatro-archivos.test.ts` — los cuatro archivos de cada componente.
- `tests/gobernanza/sin-codigo-muerto.test.ts` — el codigo sin usar.
