# tests/core — el nucleo del kit

Las pruebas de los modulos de src/core/: los moldes, las utilidades compartidas y las piezas
opt-in (ranuras reactivas, reemitir, animar, el anunciador y las listas de Intl).

## Reglas

- Una pieza opt-in se prueba sola: su API es pequena y su carga es optativa.
- Los dobles van en el propio archivo: no hace falta navegador para probar logica pura.
