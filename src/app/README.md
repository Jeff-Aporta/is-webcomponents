# src/app — la galeria

La aplicacion que ensexa el kit: la pagina de inicio, el buscador, el panel del CDN y el armazon
de los demos.

- `app.ts` — el arranque de la galeria: el registro de las vistas, el estado y el enrutado simple.
- `src/previews/` — el registro de las fichas y el armazon que las monta.
- `src/pages/` — las paginas sueltas (home, icons, theming, ecosystem).

## Reglas

- La galeria consume el kit como lo haria cualquier consumidor: por el CDN, con SHA.
- Ninguna pagina escribe rutas absolutas ni rutas a `src/` de otro modulo.
- Lo que se muestra en la galeria sale del `.json` del componente: no se reescribe a mano.
