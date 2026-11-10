# demos — las demos

Una demo por componente o por familia. Cada `demos/<cat>/<nombre>/<nombre>.html` es una pagina
que se puede abrir y que usa el kit como lo usaria una app.

## Reglas

- Una demo usa el kit por el CDN con SHA: no por rutas a `src/`.
- Una demo es autocontenida: si necesita datos, los trae en el HTML.
- El armazon (`docs-chrome`, `demo-code`) se carga desde `dist/scripts/`, no en linea.
- La demo se carga en el armazon de la galeria con un `?demo=` de la ficha.