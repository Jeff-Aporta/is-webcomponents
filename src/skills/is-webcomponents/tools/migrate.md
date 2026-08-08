# `/is-webcomponents:migrate`

Convertir un frontend con framework (React, MUI, Svelte, Vue, Angular, etc.)
a vanilla JS + `is-webcomponents`, eliminando la dependencia del framework.

## Cuándo usarlo

- El usuario pide "quitar MUI/React/Svelte de esta app y usar is-*".
- Hay que portar una app a un stack sin build step / sin npm en runtime.
- El usuario menciona migraciones previas del mismo tipo (p. ej. is-swagger → is-swagger2).

## Patrón de referencia

`Personal/apps/is-swagger` (React + MUI) → `is-swagger2` (vanilla +
`is-webcomponents`, sin dependencias de framework en runtime). Usar esa
migración como plantilla de alcance y de decisiones (qué componentes MUI
mapean a qué tag `is-*`, cómo quedó el bootstrap, qué se eliminó del
`package.json`).

## Pasos

1. **Inventario de UI.** Listar cada componente de framework usado
   (`<Button>`, `<Dialog>`, `<DataGrid>`, `<Select>`, iconos, toasts, etc.)
   y su rol. No tocar lógica de negocio todavía.
2. **Mapear cada uno a `is-*`.** Usar [`../reference.md`](../reference.md)
   (mapa intención → componente) y [`../catalog.md`](../catalog.md)
   (inventario por categoría). Si no hay tag exacto, buscar el más cercano;
   solo si de verdad no existe, dejarlo para un wrapper de dominio mínimo.
3. **Reemplazar los componentes de framework** uno a uno por el tag `is-*`
   equivalente, confirmando API en el MD del módulo antes de escribir
   atributos/eventos. No inventar props.
4. **Componentes de dominio solo como wrappers.** Lo que en el frontend
   original era "lógica de UI + estado" pasa a ser: dato → `tk-*`/`app-*`
   (traduce) → tags `is-*` (pintan). Nada de UI genérica reimplementada
   en el wrapper de dominio.
5. **Bootstrap CDN o local.** Sustituir el entrypoint del framework por el
   bootstrap de [`build.md`](build.md) (CDN) o por copia local vía
   [`local.md`](local.md) si la app necesita funcionar sin red.
6. **Eliminar dependencias de framework** del gestor de paquetes de la app
   consumidora una vez migrados todos los componentes: quitar React/MUI/
   Svelte/Vue/etc., el bundler asociado (Vite/webpack/CRA…) y sus configs,
   si ya no queda ningún archivo que los use.
7. **No reinventar el kit.** Si durante la migración parece que falta un
   componente, verificar primero en `src/components/LLM.md` y en el LLM.md
   de la categoría antes de asumir que hay que crearlo.

## Checklist de salida

- [ ] Cero imports de React/MUI/Svelte/Vue/Angular/Chart.js/Iconify en el código migrado.
- [ ] Cada componente de framework tiene un tag `is-*` equivalente documentado (o un wrapper de dominio justificado).
- [ ] `package.json` de la app consumidora sin dependencias de framework/bundler no usadas.
- [ ] Bootstrap por CDN (o local) funcionando, sin `npm run dev`/`vite`/`webpack` para servir el kit.
- [ ] Wrappers de dominio (`tk-*`/`app-*`) solo traducen datos, no pintan UI genérica.
- [ ] Comparado contra el patrón `is-swagger` → `is-swagger2` para detectar casos no cubiertos.

## Ver también

- [`build.md`](build.md) — cómo estructurar el HTML/bootstrap resultante.
- [`local.md`](local.md) — si la app migrada necesita servir el kit sin CDN.
