# F0.3 propuesta UX/UI exhaustiva — pages + gallery (3 pages + gallery SPA chrome)

**Grupo:** pages-gallery
**Demos cubiertas:** ecosystem, home, theming
**Chrome global del gallery:** navbar, theme switcher (light/dark), palette switcher (ContaPyme / InSoft / AgroWin), search, drawer, view toggles, breadcrumb

---

### demo: ecosystem
#### Tests existentes (resumen, brevísimo)
- Renderizado base del listado de dependencias y ecosistema.
- Casos previos centrados en verificación de presencia de bloques y copy textual.
- Cobertura mínima de interacción con chips, badges y secciones plegables.
#### Propuestas nuevas

1. **Persistencia de filtro de stack al recargar** — [Estado visual y edge cases]
   - Setup: navegar a `/?demo=ecosystem` y aplicar filtro `frontend` mediante el chip correspondiente.
   - Acción: copiar la URL resultante (`?demo=ecosystem&s=frontend` o parámetro equivalente); recargar con F5; copiar la URL tras la recarga.
   - Assertion: la URL tras la recarga conserva `s=frontend` y la galería / vista de ecosystem sigue mostrando solo entradas frontend; el chip permanece con `aria-pressed="true"`.
   - Cobertura: deep-link compartible + reload sin pérdida de estado.

2. **Cross-navigation preserva `?s=`** — [Interacción]
   - Setup: estando en `ecosystem?s=infra`, abrir el navbar y navegar a `theming`.
   - Acción: volver atrás (back del navegador) a `ecosystem`.
   - Assertion: el filtro `infra` se mantiene activo y la lista visualizada coincide con el filtro; el breadcrumb no se duplica ni se reinicia.
   - Cobertura: history API + serialización de query en history stack.

3. **Atajo de teclado documentado enfoca search** — [Teclado]
   - Setup: cargar `ecosystem`; verificar foco en `<body>` al cargar.
   - Acción: pulsar la combinación documentada para enfocar la búsqueda (p. ej. `/` o `Ctrl+K`).
   - Assertion: el input de búsqueda recibe `document.activeElement`; aparece un caret visible; el breadcrumb sigue siendo anunciado por el orden de tabulación.
   - Cobertura: shortcut handler único para toda la galería.

4. **Filtro por búsqueda parcial es case-insensitive** — [Interacción]
   - Setup: abrir ecosystem; tipear `Lit` en el campo search.
   - Acción: comparar resultados con tipear `lit` y `LIT`.
   - Assertion: las tres variantes devuelven exactamente los mismos items; la normalización es estable (sin resultados duplicados entre variantes).
   - Cobertura: i18n casing, tildes y espacios múltiples colapsados.

5. **Búsqueda vacía restaura vista completa sin parpadeo** — [Estado visual y edge cases]
   - Setup: tipear `lit` en search; borrar el input por completo (`Backspace` x3 o `Ctrl+A`+`Delete`).
   - Acción: observar transición DOM.
   - Assertion: aparece la lista completa de ecosystem sin flash de "no results"; el contador de items vuelve a su valor inicial; ningún nodo queda con `aria-busy="true"`.
   - Cobertura: empty-query branch, debounce del listener.

6. **Mensaje de "0 resultados" accesible** — [ARIA / a11y]
   - Setup: tipear `xyz-no-match` en search.
   - Acción: esperar el resultado vacío.
   - Assertion: existe un contenedor con `role="status"` o `aria-live="polite"` que anuncia "Sin coincidencias"; el contenedor es referenciado por `aria-describedby` desde el input; no queda foco atrapado.
   - Cobertura: screen reader announcement sin mover foco.

7. **Foco visible al tabular chips de filtro** — [ARIA / a11y]
   - Setup: cargar ecosystem; tabular con `Tab`.
   - Acción: presionar `Tab` repetidamente recorriendo chips y opciones de filtro.
   - Assertion: cada chip muestra outline visible (≥ 2px, contrast 3:1); el orden sigue la lectura natural (visual order); las opciones con `aria-pressed` reflejan estado via estilo.
   - Cobertura: keyboard-only navigation, focus indicator AA.

8. **Enter en chip activa filtro** — [Teclado]
   - Setup: tabular hasta chip `backend`.
   - Acción: presionar `Enter`.
   - Assertion: el filtro se activa igual que con click; `aria-pressed` cambia a `true`; la URL se actualiza con `?s=backend`; el listado se re-renderiza.
   - Cobertura: button activation via Enter.

9. **Space activa/desactiva chip toggleable** — [Teclado]
   - Setup: focus en chip activo `frontend`.
   - Acción: presionar `Space`.
   - Assertion: el filtro se desactiva; la lista vuelve a completa; `aria-pressed` cambia; la URL elimina el parámetro `s`.
   - Cobertura: button toggle pattern nativo.

10. **Vista grid ↔ list toggle persiste en session** — [Interacción]
    - Setup: alternar el view toggle a `list`.
    - Acción: navegar a otra demo (theming) y volver a ecosystem.
    - Assertion: la vista vuelve a `list` (preferencias de usuario); el toggle conserva `aria-pressed` correcto.
    - Cobertura: sessionStorage vs localStorage para view mode.

11. **Drawer lateral abre con teclado y devuelve foco** — [Teclado]
    - Setup: pulsar el botón de menú del navbar con `Enter` o `Space`.
    - Acción: tabular dentro del drawer; cerrar con `Escape`.
    - Assertion: al cerrar, el foco vuelve al botón que abrió el drawer; la URL no cambia; el breadcrumb sigue anunciado.
    - Cobertura: focus trap simple + return focus (WCAG 2.4.3).

12. **Theme switcher propaga tokens `--is-*` en ecosystem** — [Interacción]
    - Setup: en ecosystem, alternar light/dark desde el switcher global.
    - Acción: leer las custom properties aplicadas al `documentElement`.
    - Assertion: las variables `--is-bg`, `--is-fg`, `--is-border` reflejan el nuevo tema; ninguna card queda con el fondo del tema anterior (no flash).
    - Cobertura: token propagation cross-component.

13. **Palette switcher actualiza acentos en bloques ecosystem** — [Estado visual y edge cases]
    - Setup: cambiar paleta de ContaPyme a InSoft.
    - Acción: observar los badges y separadores del listado ecosystem.
    - Assertion: los acentos primary/secondary cambian; ningún gradiente queda hardcoded; los bloques chip/badge siguen contraste AA.
    - Cobertura: palette propagation + contrast safety.

14. **Long content en cards no rompe layout** — [Estado visual y edge cases]
    - Setup: inyectar una dependencia con descripción de 400 caracteres.
    - Acción: redimensionar viewport a 360px de ancho.
    - Assertion: las cards mantienen alineación vertical; aparece scroll interno si descripción excede `n` líneas; el breadcrumb no se desplaza.
    - Cobertura: long-text overflow + responsive breakpoint.

15. **Estado loading skeleton al cambiar filtro** — [Estado visual y edge cases]
    - Setup: throttle de red a "slow 3G" en Playwright.
    - Acción: alternar filtros rápidamente.
    - Assertion: aparece skeleton sin `aria-busy="false"` momentáneo; cuando llega el resultado, `aria-busy` cambia y el contenido reemplaza sin parpadeo doble.
    - Cobertura: async render fallback.

16. **Filtro combinado search + chip funciona AND lógico** — [Interacción]
    - Setup: activar chip `backend` y tipear `lit` en search.
    - Acción: observar resultados.
    - Assertion: solo items backend cuyo texto contiene `lit`; el breadcrumb no se duplica; los chips mantienen sus etiquetas.
    - Cobertura: filtros múltiples, intersecciones.

---

### demo: home
#### Tests existentes (resumen, brevísimo)
- Verificación de hero y CTAs.
- Smoke test de presencia de CTA primario.
- Cobertura básica de texto y jerarquía visual.
#### Propuestas nuevas

1. **CTA primario navega con transición accesible** — [Interacción]
   - Setup: home en viewport desktop.
   - Acción: tabular hasta el CTA principal y presionar `Enter`.
   - Assertion: navegación SPA push al destino correcto; el foco llega al heading principal (`h1`) de la siguiente vista; la URL cambia vía History API; el breadcrumb superior se actualiza.
   - Cobertura: SPA routing + focus management post-navigation.

2. **Hero soporta `prefers-reduced-motion`** — [ARIA / a11y]
   - Setup: emular `prefers-reduced-motion: reduce` en Playwright.
   - Acción: cargar home.
   - Assertion: las animaciones de fondo se degradan o desactivan; ningún `@keyframes` queda activo; el contenido sigue accesible.
   - Cobertura: prefers-reduced-motion CSS branch.

3. **Links secundarios mantienen ratio de contraste AA** — [ARIA / a11y]
   - Setup: alternar paleta ContaPyme → InSoft.
   - Acción: medir contraste de links secundarios sobre hero.
   - Assertion: contraste ≥ 4.5:1 (texto normal) o ≥ 3:1 (large text); `text-decoration` permanece visible.
   - Cobertura: WCAG 1.4.3 palette switch.

4. **Tab order salta elementos decorativos** — [Teclado]
   - Setup: cargar home.
   - Acción: tabular 20 veces desde el inicio.
   - Assertion: cada foco cae sobre un control semántico (link/button); los SVGs decorativos tienen `tabindex="-1"` o `aria-hidden="true"`; nunca se queda el foco en un nodo vacío.
   - Cobertura: tab-order non-semantic decoration handling.

5. **Theme switcher sincroniza estado al cargar home** — [Estado visual y edge cases]
   - Setup: con tema oscuro activo, refrescar home.
   - Acción: verificar atributo del switcher.
   - Assertion: el switcher refleja `aria-pressed=true` para oscuro; el body tiene `data-theme="dark"`; no hay FOUC de tema claro.
   - Cobertura: persisted theme + SSR-like hydration.

6. **Search global filtra desde home hacia demos** — [Interacción]
   - Setup: tipear `tooltip` en search global desde home.
   - Acción: presionar `Enter` o esperar debounce.
   - Assertion: aparece dropdown o resultados teaser; `aria-expanded` del botón de búsqueda es `true`; al elegir un resultado, navega a la demo y la query persiste.
   - Cobertura: global search cross-page.

7. **Drawer abre con `Escape` y cierra correctamente** — [Teclado]
   - Setup: pulsar el botón hamburguesa del navbar.
   - Acción: presionar `Escape` con el foco dentro del drawer.
   - Assertion: el drawer se cierra; el foco retorna al botón hamburguesa; `aria-expanded` vuelve a `false`; el body mantiene `overflow` correcto (no queda bloqueado).
   - Cobertura: modal close pattern + body scroll lock.

8. **Breadcrumb semántico en home** — [ARIA / a11y]
   - Setup: home cargado.
   - Acción: inspeccionar landmark de breadcrumb.
   - Assertion: existe `<nav aria-label="breadcrumb">` con `<ol>`; cada item usa `aria-current="page"` solo para el último.
   - Cobertura: aria-current semantics, single landmark.

9. **Hero en mobile mantiene legibilidad** — [Estado visual y edge cases]
   - Setup: viewport 360x640.
   - Acción: leer sizing del H1 y CTAs.
   - Assertion: H1 ≥ 28px; CTAs ≥ 44x44px (touch target); no hay scroll horizontal.
   - Cobertura: responsive typography + tap target WCAG 2.5.5.

10. **Hover muestra focus visible equivalente** — [Interacción]
    - Setup: tabular sobre CTA primario.
    - Acción: pasar mouse encima.
    - Assertion: los estilos hover no anulan el outline de focus; usuarios de teclado ven el mismo realce.
    - Cobertura: dual-input parity.

11. **Lazy-loaded media no bloquea LCP` — [Estado visual y edge cases]
    - Setup: home con imágenes de hero pesadas.
    - Acción: medir LCP con PerformanceObserver.
    - Assertion: el LCP element carga con `loading="eager"` y `fetchpriority="high"`; las imágenes decorativas usan `loading="lazy"`.
    - Cobertura: performance budget básico.

12. **Cambio de paleta en home propaga a cards de demos** — [Interacción]
    - Setup: alternar paleta InSoft → AgroWin.
    - Acción: observar las miniaturas de demos recomendadas en home.
    - Assertion: cada miniatura hereda tokens `--is-primary`; ningún botón queda con color residual de ContaPyme.
    - Cobertura: palette token cascade.

13. **Toast de "demo copiada al portapapeles" accesible** — [ARIA / a11y]
    - Setup: activar CTA "Copy link" si existe.
    - Acción: pulsar el botón.
    - Assertion: se inserta nodo con `role="status"` o `aria-live="polite"`; el toast desaparece a los 4s sin mover el foco.
    - Cobertura: aria-live polite lifecycle.

14. **Skip-to-content link visible al tabular** — [Teclado]
    - Setup: cargar home.
    - Acción: primer `Tab`.
    - Assertion: aparece un enlace "Saltar al contenido principal" oculto visualmente pero focalizable; al activarlo, mueve foco al `<main>` con id correspondiente.
    - Cobertura: skip-link WCAG 2.4.1.

15. **Cards de demo en home anuncian propósito** — [ARIA / a11y]
    - Setup: tabular sobre miniaturas de demos.
    - Acción: leer `aria-label` o texto accesible.
    - Assertion: cada card tiene un nombre accesible que describe la demo objetivo y su categoría.
    - Cobertura: accessible name richness.

16. **Cambiar idioma (si existe) persiste y no rompe tokens** — [Estado visual y edge cases]
    - Setup: forzar locale `es-CL` y recargar.
    - Acción: verificar idioma y recargar.
    - Assertion: el contenido se mantiene en español; ningún `--is-*` queda sin valor; el breadcrumb traduce su nodo "Inicio".
    - Cobertura: i18n branch + token resilience.

---

### demo: theming
#### Tests existentes (resumen, brevísimo)
- Renderizado del personalizador.
- Cambio de color primario y persistencia.
- Cobertura mínima de sliders y swatches.
#### Propuestas nuevas

1. **Generador de paleta persiste por demo (no global)** — [Estado visual y edge cases]
   - Setup: ajustar HSL del color primario en theming.
   - Acción: copiar la URL (`?s=<hash-paleta>`); navegar a ecosystem.
   - Assertion: ecosystem usa paleta del theme por defecto **o** respeta `?s` si fue provisto; no se contamina con hash de theming salvo explicit switch.
   - Cobertura: scoped palette state.

2. **Cross-navigation del theme persiste tras `popstate`** — [Interacción]
   - Setup: en theming con tema `dark`, navegar a home y volver con back.
   - Acción: observar el theme switcher.
   - Assertion: theme switcher permanece en `dark`; `data-theme` del `<html>` no se resetea; `--is-bg` mantiene valor oscuro.
   - Cobertura: navigation history + persistence.

3. **Sliders responden a `Arrow keys` con paso 1 y Shift con paso 10** — [Teclado]
   - Setup: focus en slider Hue.
   - Acción: `ArrowRight`, `Shift+ArrowRight`.
   - Assertion: el valor aumenta en `1` y luego `10` respectivamente; aria-valuenow se actualiza; ningún valor sale fuera de min/max.
   - Cobertura: slider keyboard semantics WAI-ARIA 1.2.

4. **Atajo `Ctrl+S` copia CSS custom properties al portapapeles** — [Interacción]
   - Setup: focus en el área del preview.
   - Acción: `Ctrl+S`.
   - Assertion: copia `:root { --is-primary: ... }` al clipboard; toast anuncia "Tokens copiados"; input no pierde foco.
   - Cobertura: shortcut UX + clipboard API.

5. **Toggle dark/light conserva estado del generador HSL** — [Estado visual y edge cases]
   - Setup: ajustar HSL + activar dark.
   - Acción: desactivar dark.
   - Assertion: la paleta HSL del usuario no se resetea; solo cambian tokens derivados; el panel de preview continúa mostrando el HSL elegido.
   - Cobertura: layer separation base/palette.

6. **`aria-pressed` en swatches de paletas predefinidas** — [ARIA / a11y]
   - Setup: focus en swatches ContaPyme / InSoft / AgroWin.
   - Acción: tabular y revisar atributos.
   - Assertion: el swatch activo tiene `aria-pressed=true` y un outline de focus visible; los demás `aria-pressed=false`; la navegación por teclado es cíclica.
   - Cobertura: toggle group pattern ARIA.

7. **Reset de paleta pide confirmación accesible** — [Teclado]
   - Setup: modificar paleta y pulsar "Reset".
   - Acción: observar confirmación.
   - Assertion: aparece un `role="alertdialog"` o `dialog` con foco inicial en el botón "Cancelar" (acción segura por defecto); `Escape` cierra sin resetear.
   - Cobertura: confirm dialog focus-trap + safe default.

8. **Theme switcher anuncia cambio vía `aria-live`** — [ARIA / a11y]
   - Setup: alternar switcher light/dark.
   - Acción: enfocar la región status con screen reader simulado.
   - Assertion: aparece `role="status"` con texto "Tema oscuro activado" o equivalente; el cambio no mueve el foco.
   - Cobertura: status announcements.

9. **Drawer de tokens accesibles con `Enter` para copiar token individual** — [Interacción]
   - Setup: abrir drawer de "CSS variables".
   - Acción: tabular hasta un token (`--is-primary`) y `Enter`.
   - Assertion: copia solo ese token al clipboard; toast discreto; el foco permanece en el botón del token.
   - Cobertura: per-row action keyboard.

10. **Búsqueda dentro del drawer de tokens** — [Interacción]
    - Setup: abrir drawer de tokens; tipear `bg`.
    - Acción: observar lista filtrada.
    - Assertion: solo aparecen `--is-bg*`; input mantiene foco; los resultados vacíos muestran mensaje accesible.
    - Cobertura: in-drawer search branch.

11. **Vista split: editor ↔ preview se mantiene sincronizada** — [Interacción]
    - Setup: redimensionar viewport a < 900px.
    - Acción: observar panel.
    - Assertion: el preview pasa a apilarse debajo del editor; no se oculta contenido; los sliders siguen siendo operables.
    - Cobertura: responsive split pane, no data loss.

12. **Historial de paletas con undo funciona vía `Ctrl+Z`** — [Teclado]
    - Setup: generar paleta, generar otra paleta.
    - Acción: `Ctrl+Z` dos veces.
    - Assertion: las paletas previas se restauran; el panel preview se actualiza sin parpadeo; el estado `aria-live` anuncia "Deshecho".
    - Cobertura: undo stack + announcement.

13. **Persistencia tras refresh con paleta custom** — [Estado visual y edge cases]
    - Setup: crear paleta custom; refrescar (F5).
    - Acción: comparar paleta persistida.
    - Assertion: la paleta custom reaparece; `localStorage` key se mantiene estable (p. ej. `is-palette-custom-v1`); no se cae a default.
    - Cobertura: refresh persistence + storage schema.

14. **Contraste de texto en preview cumple AA en todos los temas** — [ARIA / a11y]
    - Setup: alternar las 6 combinaciones (3 paletas × 2 temas).
    - Acción: para cada una medir contraste fg/bg.
    - Assertion: contraste ≥ 4.5:1 en todos los casos; falla no se permite en producción.
    - Cobertura: matrix validation 3x2.

15. **Tokens no rompen cuando se borra el slider** — [Estado visual y edge cases]
    - Setup: situar Hue en `0` (rojo puro) y mover Saturación a `0`.
    - Acción: observar.
    - Assertion: el valor HSL degenera a gris pero el sistema sigue funcionando; no aparece `NaN` ni tokens vacíos; el preview renderiza.
    - Cobertura: degenerate HSL branch.

16. **Breadcrumb al editar paleta custom indica override** — [ARIA / a11y]
    - Setup: editar paleta custom en theming.
    - Acción: leer breadcrumb.
    - Assertion: el crumb "Personalización" muestra un marcador visual o texto accesible indicando "Custom override" o ícono distintivo.
    - Cobertura: contextual breadcrumb state.

---

### gallery: chrome global (navbar / theme switcher / palette switcher / search / drawer / view toggles / breadcrumb)

> Este bloque aplica a las 3 demos y al navegar entre cualquier par de ellas.

#### Propuestas nuevas

1. **Persistencia del theme switcher cross-page** — [Estado visual y edge cases]
   - Setup: cambiar a `dark` en home.
   - Acción: navegar a ecosystem, theming y de vuelta a home.
   - Assertion: en los tres destinos `data-theme="dark"` está activo; `localStorage.is-theme` mantiene valor; el switcher del navbar muestra icono consistente en las 3 vistas.
   - Cobertura: cross-page state integrity.

2. **Persistencia del palette switcher cross-page** — [Interacción]
   - Setup: seleccionar `InSoft` en theming.
   - Acción: navegar a home, ecosystem, theming.
   - Assertion: en los 3 destinos la clase `palette-insoft` o equivalente está aplicada al `<html>`; ninguna demo queda con mezcla de acentos ContaPyme + InSoft.
   - Cobertura: palette propagation + sanity check.

3. **Theme switcher ARIA correcto** — [ARIA / a11y]
   - Setup: localizar el switcher en el navbar.
   - Acción: inspeccionar atributos.
   - Assertion: el control es un `<button>` con `aria-pressed`, o un switch con `role="switch"` + `aria-checked`; `aria-label="Cambiar tema"` o equivalente; el icono tiene `aria-hidden`.
   - Cobertura: switch vs button toggle semantics.

4. **Tab order del navbar es lógica (logo → home → search → paleta → tema → drawer)** — [Teclado]
   - Setup: cargar cualquier página.
   - Acción: tabular 7 veces.
   - Assertion: el orden de foco sigue el orden visual LTR; `Tab` final sale del navbar y entra al main; `Shift+Tab` regresa simétricamente.
   - Cobertura: tab order consistency across pages.

5. **Drawer con focus trap completo** — [Teclado]
   - Setup: abrir drawer desde navbar.
   - Acción: tabular repetidamente.
   - Assertion: el foco cicla solo dentro del drawer; `Escape` cierra y devuelve foco al botón; el breadcrumb principal no recibe foco mientras el drawer está abierto.
   - Cobertura: focus trap WCAG 2.4.3 + restoration.

6. **Search global acepta `Enter` y abre dropdown accesible** — [ARIA / a11y]
   - Setup: focus en search; tipear `ecosystem`.
   - Acción: `ArrowDown`, `Enter`.
   - Assertion: aparece `<ul role="listbox">` con `<li role="option">`; `aria-activedescendant` apunta al item actual; `Enter` navega a la demo.
   - Cobertura: combobox pattern WAI-ARIA 1.2.

7. **Search empty-state anuncia "0 resultados"** — [ARIA / a11y]
   - Setup: tipear `xyz-zzz` en search.
   - Acción: observar mensaje.
   - Assertion: `role="status"` con texto accesible; `aria-expanded` del listbox es `true`; el input mantiene foco.
   - Cobertura: empty-result combobox.

8. **View toggles (grid/list) teclado-sincronizados** — [Teclado]
   - Setup: focus en un toggle group del navbar o filtros.
   - Acción: `ArrowLeft`/`ArrowRight`.
   - Assertion: `aria-selected` cambia entre opciones; `role="tablist"` o `radiogroup` según corresponda; solo un toggle tiene `aria-checked=true`.
   - Cobertura: tablist/radiogroup keyboard pattern.

9. **Breadcrumb refleja ruta SPA en popstate** — [Interacción]
   - Setup: home → theming → ecosystem.
   - Acción: back dos veces.
   - Assertion: el breadcrumb en cada paso muestra exactamente la ruta actual; el último `<li>` tiene `aria-current="page"`; no quedan crumbs huérfanos.
   - Cobertura: dynamic crumb tree, history.

10. **Modo focus del breadcrumb al tabular** — [ARIA / a11y]
    - Setup: tabular desde navbar.
    - Acción: foco llega al breadcrumb.
    - Assertion: el breadcrumb no es tabstop (decorative landmark); o si lo es, cada link tiene `aria-label` extendido.
    - Cobertura: landmark navigation, not tab trap.

11. **Cambiar tema con `prefers-color-scheme` se respeta al primer load** — [Estado visual y edge cases]
    - Setup: limpiar `localStorage.is-theme`; emular `prefers-color-scheme: dark`.
    - Acción: cargar home por primera vez.
    - Assertion: el sitio abre en dark; el switcher refleja `aria-pressed=true` para dark.
    - Cobertura: first-paint theme inference.

12. **Doble-click en logo no duplica navegación** — [Interacción]
    - Setup: en cualquier página interna.
    - Acción: doble-click rápido en el logo.
    - Assertion: una sola navegación a home; el contador de history no crece más allá de 1; sin race conditions.
    - Cobertura: rapid-click guard.

13. **Drawer abre con click derecho en logo?** — [Interacción]
    - Setup: click derecho sobre el logo del navbar.
    - Acción: observar menú contextual nativo.
    - Assertion: el menú contextual nativo del navegador aparece; el sitio no lo bloquea; no se dispara handler custom accidental.
    - Cobertura: contextmenu default behavior preservation.

14. **Search persistente en query string `?q=`** — [Interacción]
    - Setup: tipear `tooltip`; presionar `Enter`.
    - Acción: copiar URL; recargar.
    - Assertion: `?q=tooltip` está en la URL; el input muestra el valor tras recarga; el dropdown abre por defecto.
    - Cobertura: state via `?s=`.

15. **Theme switch en mitad de animación no produce jank** — [Estado visual y edge cases]
    - Setup: activar animación de loading en home.
    - Acción: alternar tema en medio de la animación.
    - Assertion: la animación termina sin reset; los tokens cambian suavemente; no se observa layout shift > 0.1 CLS.
    - Cobertura: animation + token swap.

16. **Acceso por teclado al submenu "Más demos"** — [Teclado]
    - Setup: tabular hasta el ítem "Más demos" en navbar.
    - Acción: `Enter`, `ArrowDown`, `Escape`.
    - Assertion: submenu abre con `aria-expanded=true`; `ArrowDown` enfoca el primer item; `Escape` cierra y devuelve foco.
    - Cobertura: disclosure menu pattern.

17. **Panel switcher de paleta accesible sin trampa** — [ARIA / a11y]
    - Setup: abrir paleta switcher.
    - Acción: tabular entre ContaPyme/InSoft/AgroWin con teclado.
    - Assertion: cada swatch recibe foco con outline visible; `Enter` aplica; nada queda con `aria-hidden` rotura.
    - Cobertura: palette switcher keyboard a11y.

18. **Click fuera del drawer cierra automáticamente** — [Interacción]
    - Setup: drawer abierto.
    - Acción: click en zona neutra (fuera del drawer y fuera del toggle).
    - Assertion: el drawer se cierra; el foco se devuelve al toggle; un handler `pointerdown` (no click) previene cierres accidentales.
    - Cobertura: outside-click UX guard.

19. **Search soporta flechas ↑/↓ y `Home`/`End`** — [Teclado]
    - Setup: focus en search con resultados.
    - Acción: `ArrowDown` hasta el final, luego `End`, luego `Home`, luego `ArrowUp`.
    - Assertion: el primer/último item recibe `aria-activedescendant`; el ciclado es cíclico; el foco del input nunca se pierde.
    - Cobertura: listbox full keyboard.

20. **Historia de paleta se serializa en `?p=istoft` etc.** — [Interacción]
    - Setup: seleccionar paleta InSoft.
    - Acción: copiar URL completa.
    - Assertion: existe query param `p=insoft` (o equivalente); al recargar, la paleta InSoft se aplica antes del primer paint.
    - Cobertura: palette deep-link SSR-like.

21. **Theme switcher con `Space` toggle correctamente** — [Teclado]
    - Setup: focus en theme switcher.
    - Acción: `Space`.
    - Assertion: togglea entre light/dark; `aria-pressed` o `aria-checked` cambia; no se activa scroll de página.
    - Cobertura: button activation pattern.

22. **Breadcrumb colapsa en mobile con menú accesible** — [Estado visual y edge cases]
    - Setup: viewport 360px.
    - Acción: observar breadcrumb.
    - Assertion: el crumb muestra "Inicio › … › Actual"; nodos intermedios colapsados en popover accesible `aria-haspopup`.
    - Cobertura: responsive breadcrumb pattern.

23. **Drawer con scroll interno evita foco en zonas no focalizables** — [Teclado]
    - Setup: drawer con 50 items.
    - Acción: tabular.
    - Assertion: solo los items interactivos reciben foco; el scroll no captura Tab fuera del drawer; `tabindex` adecuado en zonas scrollables.
    - Cobertura: drawer scroll + tab management.

24. **Vista grid/list toggle cambia layout sin recargar** — [Interacción]
    - Setup: alternar entre grid y list en cualquier page.
    - Acción: observar URL y contenido.
    - Assertion: layout cambia smooth; las cards mantienen sus callbacks; ningún demo hijo pierde su estado interno.
    - Cobertura: view toggling fidelity.

25. **Navbar contraído en mobile muestra hamburger con badge de actualizaciones** — [ARIA / a11y]
    - Setup: forzar viewport 360px.
    - Acción: observar hamburger.
    - Assertion: el botón tiene `aria-label="Menú"`; un badge interno usa `aria-label="3 actualizaciones pendientes"`; nunca usa solo color.
    - Cobertura: badge a11y.

26. **Acceso directo vía URL `?demo=theming` deep-linkea correctamente** — [Interacción]
    - Setup: pegar URL absoluta en pestaña nueva.
    - Acción: cargar.
    - Assertion: la SPA renderiza theming sin flash de home; navbar y breadcrumb se hidratan correctamente.
    - Cobertura: deep-link hydration.

27. **Search filtra por categoría y por nombre simultáneamente** — [Interacción]
    - Setup: tipear `theming` luego refinar con `palette`.
    - Acción: observar.
    - Assertion: los resultados actualizan al deletear; el breadcrumb refleja el último filtro activo.
    - Cobertura: incremental filter.

28. **Drawer accesible en horizontal scroll** — [Estado visual y edge cases]
    - Setup: drawer con contenido ancho (tabla).
    - Acción: abrir y desplazar horizontalmente.
    - Assertion: aparece scrollbar accesible; `role="region"` con `aria-label`; sin overflow en viewport.
    - Cobertura: wide drawer content.

29. **Theme switcher muestra tooltip tras hover/focus sostenido** — [ARIA / a11y]
    - Setup: focus o hover en theme switcher por > 1.5s.
    - Acción: observar tooltip.
    - Assertion: aparece tooltip con nombre del tema actual; se cierra tras mover foco o `Escape`.
    - Cobertura: hover/focus tooltip parity.

30. **Cierre del drawer con animación respeta `prefers-reduced-motion`** — [Estado visual y edge cases]
    - Setup: emular prefers-reduced-motion: reduce.
    - Acción: cerrar drawer.
    - Assertion: la animación se acorta a transición instantánea; el foco se devuelve igual.
    - Cobertura: motion preference consistent.

---

## Resumen de cobertura

| Demo / Chrome         | Propuestas |
|-----------------------|-----------:|
| ecosystem             |         16 |
| home                  |         16 |
| theming               |         16 |
| gallery (chrome global)|         30 |
| **Total**             |     **78** |

- Categorías aplicadas a las 3 páginas: navegación, estado vía `?s=`, persistencia de tema cross-navigation, propagación de tokens al cambiar paleta, ARIA del theme switcher, teclado del drawer, filtro de search, semántica de breadcrumb.
- Categorías aplicadas al chrome del gallery: navbar, theme switcher (light/dark), palette switcher (ContaPyme/InSoft/AgroWin), search, drawer, view toggles, breadcrumb.
- Cada propuesta cubre una rama distinta (edge case / branch / ARIA / teclado / estado).
