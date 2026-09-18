### demo: progress-bar

#### Tests existentes (resumen, brevísimo)
- Cobertura básica de render y valor numérico.

#### Propuestas nuevas

1. **Determinismo del valor inicial al montar** — [estados visuales y edge cases]
   - Setup: cargar la página del demo y leer el atributo/value de la barra antes de cualquier interacción.
   - Acción: nada, sólo observar el primer paint.
   - Assertion: el valor inicial está acotado (0–100) y refleja el estado por defecto documentado.
   - Cobertura: branch de estado inicial / SSR vs primer cliente.

2. **Animación con prefers-reduced-motion** — [ARIA / a11y]
   - Setup: emular `prefers-reduced-motion: reduce` en Playwright.
   - Acción: iniciar una transición de valor (p. ej. incrementar hasta un objetivo).
   - Assertion: la transición CSS se acorta o se vuelve instantánea y `aria-live` sigue anunciando el cambio.
   - Cobertura: accesibilidad vestibular y a11y live.

3. **`role="progressbar"` y atributos ARIA** — [ARIA / a11y]
   - Setup: cargar demo y localizar la barra.
   - Acción: leer atributos computados.
   - Assertion: la barra expone `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, y opcionalmente `aria-valuetext` cuando el valor no es porcentual.
   - Cobertura: contrato ARIA APG para progressbar.

4. **Actualización de aria-valuenow en cada tick** — [ARIA / a11y]
   - Setup: spy del DOM durante una animación larga.
   - Acción: observar los valores reportados por `aria-valuenow` durante N frames.
   - Assertion: el valor progresa monótonamente y es múltiplo del paso configurado; ningún valor salta fuera de rango.
   - Cobertura: throttling de actualizaciones de a11y y consistencia de la "voz" del lector de pantalla.

5. **Estado indeterminate vs determinate** — [estados visuales y edge cases]
   - Setup: alternar el toggle "indeterminate" si existe.
   - Acción: pasar de modo determinate (valor X) a indeterminate.
   - Assertion: en indeterminate, `aria-valuenow` desaparece o se omite; visualmente la barra entra en loop; ningún porcentaje residual queda visible.
   - Cobertura: contrato dual de APG y rama visual del modo sin progreso real.

6. **Indicación visual cuando value=0** — [estados visuales y edge cases]
   - Setup: forzar valor 0 mediante el control del demo.
   - Acción: observar el render con `value=0` y `min>0` o `min=0`.
   - Assertion: la barra es visualmente "vacía" pero semánticamente válida; `aria-valuenow="0"` se anuncia; no se renderiza texto residual (NaN/%).
   - Cobertura: caso borde inferior y formato de etiqueta.

7. **Indicación visual cuando value=max** — [estados visuales y edge cases]
   - Setup: forzar el valor al máximo permitido.
   - Acción: render y focus programático.
   - Assertion: barra llena al 100%; `aria-valuenow` coincide con `aria-valuemax`; si existe variante "success", se aplica al alcanzar el máximo.
   - Cobertura: rama de éxito / completitud.

8. **Overflow de valor (clamp) cuando input > max** — [estados visuales y edge cases]
   - Setup: enviar valor numérico > `aria-valuemax`.
   - Acción: observar comportamiento de clamp.
   - Assertion: el valor se acota a max; el DOM no se rompe; `aria-valuenow` refleja el clamp.
   - Cobertura: validación defensiva de input.

9. **Color y contraste en tema dark** — [estados visuales y edge cases]
   - Setup: aplicar `data-theme="dark"` al host.
   - Acción: render con valor 50%.
   - Assertion: contraste WCAG AA sobre fondo; tokens `--is-*` se aplican correctamente en el track y el fill; no se filtra color del light-theme.
   - Cobertura: theming y a11y visual.

10. **Anuncio de "completion" sin ensuciar el live region** — [ARIA / a11y]
    - Setup: spy de la región `aria-live` del componente padre si existe.
    - Acción: dejar que la barra llegue a 100%.
    - Assertion: al completar, se anuncia un mensaje de éxito una sola vez; no se anuncian los ticks intermedios (polite, no assertive).
    - Cobertura: gestión de live region y ruido a SR.

11. **Pausa y reanudación preservan el estado** — [interacción]
    - Setup: iniciar una barra animada.
    - Acción: pulsar un botón "pause" si existe y reanudar.
    - Assertion: el valor en el momento de pausa se mantiene y la animación continúa desde ese punto; el atributo ARIA permanece consistente.
    - Cobertura: control de playback y estado interno.

12. **Cancelación / reset vuelve a valor inicial** — [interacción]
    - Setup: llevar la barra a un valor > 0.
    - Acción: pulsar "reset/cancel" del demo.
    - Assertion: valor y `aria-valuenow` vuelven al inicial; la animación se detiene; no quedan listeners colgados.
    - Cobertura: cleanup y ciclo de vida.

13. **Múltiples barras independientes** — [estados visuales y edge cases]
    - Setup: montar varias instancias simultáneas en la página.
    - Acción: animarlas a velocidades distintas.
    - Assertion: cada barra mantiene su propio `aria-valuenow` y no hay acoplamiento de CSS o estado (Shadow DOM aísla).
    - Cobertura: aislamiento por instancia.

14. **Reduced motion + animación de "shimmer" indeterminate** — [estados visuales y edge cases]
    - Setup: `prefers-reduced-motion: reduce` y modo indeterminate.
    - Acción: observar la animación.
    - Assertion: el shimmer se reemplaza por un estado estático (p. ej. gradiente fijo o label "cargando…"); no se desactiva el `aria-live` de progreso.
    - Cobertura: accesibilidad vestibular en estados sin progreso real.

15. **Anuncio de cambio de label legible** — [ARIA / a11y]
    - Setup: configurar `aria-valuetext` con texto personalizado (p. ej. "5 de 12 archivos").
    - Acción: leer el árbol accesible.
    - Assertion: el screen reader anuncia `aria-valuetext` en lugar de "5 percent"; `aria-valuenow` sigue presente para scripting.
    - Cobertura: APG progressbar con texto no porcentual.

### demo: toast

#### Tests existentes (resumen, brevísimo)
- Render básico del mensaje y variant por tipo.

#### Propuestas nuevas

1. **Trigger por click muestra un toast** — [interacción]
   - Setup: cargar demo y localizar el botón "show toast".
   - Acción: click único.
   - Assertion: aparece un toast en la región esperada con el texto declarado; `role="status"` o `role="alert"` correcto según variant.
   - Cobertura: camino feliz y entrada al DOM.

2. **Auto-dismiss tras timeout configurable** — [interacción]
   - Setup: spy del DOM con un timer virtual o `page.waitForFunction`.
   - Acción: lanzar un toast con duración D ms.
   - Assertion: tras D ms ± tolerancia, el toast desaparece del DOM (o queda marcado `hidden`); no queda foco residual.
   - Cobertura: temporización y cleanup.

3. **Pausa del auto-dismiss al hacer hover/focus** — [interacción]
   - Setup: lanzar un toast y colocar el puntero sobre él antes del timeout.
   - Acción: hover durante 2× el timeout.
   - Assertion: el toast permanece visible mientras el puntero está sobre él; el timer se reanuda al salir (comportamiento APG).
   - Cobertura: accesibilidad y UX.

4. **Cola FIFO y descarte por exceso** — [estados visuales y edge cases]
   - Setup: configurar `maxVisible` (p. ej. 3).
   - Acción: disparar N > maxVisible toasts en rápida sucesión.
   - Assertion: solo `maxVisible` están presentes a la vez; los excedentes esperan en cola o se descartan según política documentada.
   - Cobertura: gestión de cola y backpressure.

5. **`aria-live` correcto por variant** — [ARIA / a11y]
   - Setup: emitir un toast `success`, uno `error`, uno `info`.
   - Acción: leer atributos del contenedor live y de cada item.
   - Assertion: `info/success` → `role="status"` + `aria-live="polite"`; `error` → `role="alert"` + `aria-live="assertive"`.
   - Cobertura: contrato ARIA y severidad.

6. **Escape cierra el toast focused** — [teclado]
   - Setup: emitir un toast y tabular hasta que reciba focus (close button).
   - Acción: presionar Escape.
   - Assertion: el toast se cierra; el foco retorna al botón que lo disparó; no quedan diálogos modales abiertos.
   - Cobertura: contrato de popover no modal.

7. **No atrapa el foco (no es modal)** — [teclado]
   - Setup: emitir un toast.
   - Acción: tabular a través del documento.
   - Assertion: el foco pasa por detrás del toast; ningún elemento del toast detiene la navegación salvo su botón de cierre; no hay focus-trap.
   - Cobertura: accesibilidad de no-modal.

8. **Reducir movimiento: sin slide-in** — [estados visuales y edge cases]
   - Setup: emular `prefers-reduced-motion: reduce` y emitir un toast.
   - Acción: capturar el render inicial y final.
   - Assertion: no hay transformaciones de entrada; el toast aparece instantáneamente; la duración del auto-dismiss puede ajustarse (p. ej. +20%).
   - Cobertura: accesibilidad vestibular.

9. **Botón de cierre explícito funciona siempre** — [interacción]
   - Setup: emitir toast.
   - Acción: click en el botón close con icono X.
   - Assertion: el toast desaparece; el botón tiene `aria-label="Cerrar"` o equivalente; foco retorna al disparador.
   - Cobertura: cierre manual y a11y del icono.

10. **Apilamiento vertical y posición top/bottom** — [estados visuales y edge cases]
    - Setup: alternar la prop `position` entre `top-right`, `bottom-center`, etc.
    - Acción: emitir N toasts.
    - Assertion: el orden visual coincide con el orden de emisión; no hay solapamiento; el offset es consistente entre instancias.
    - Cobertura: layout y stacking context.

11. **Contenido largo hace wrap pero no rompe layout** — [estados visuales y edge cases]
    - Setup: emitir un toast con texto de 500+ caracteres sin espacios.
    - Acción: observar el render.
    - Assertion: el texto hace wrap o `overflow-wrap: anywhere`; no se rompe la grid/flex del contenedor; el botón close sigue accesible.
    - Cobertura: resistencia a contenido adverso.

12. **Anuncio del contenido por SR y no duplicación** — [ARIA / a11y]
    - Setup: emitir el mismo mensaje dos veces seguidas.
    - Acción: observar el log del `aria-live`.
    - Assertion: el SR anuncia cada aparición; no se deduplica indebidamente (al menos para mensajes distintos).
    - Cobertura: dinámica de live regions y duplicados legítimos.

13. **Persistencia entre HMR / re-render del host** — [estados visuales y edge cases]
    - Setup: emitir un toast y forzar un re-render del contenedor padre.
    - Acción: observar el DOM.
    - Assertion: si el toast debe sobrevivir, sigue presente; si no, se cierra limpiamente; no quedan nodos huérfanos en el `<slot>` del componente.
    - Cobertura: ciclo de vida en Shadow DOM.

14. **Click en acción secundaria del toast** — [interacción]
    - Setup: toast con botón "Deshacer" o "Reintentar".
    - Acción: click en el botón.
    - Assertion: se emite el evento declarado; el toast se cierra; foco retorna al disparador; el handler se llama una sola vez.
    - Cobertura: acciones y eventos.

15. **Stack de errores: 10 errores seguidos no desbordan el viewport** — [estados visuales y edge cases]
    - Setup: disparar 10 toasts `error` consecutivos.
    - Acción: medir altura del contenedor y scroll del documento.
    - Assertion: el contenedor respeta `maxVisible` y/o `overflow`; el scroll del documento no salta; los excedentes entran en cola.
    - Cobertura: robustez bajo carga.

### demo: tooltip

#### Tests existentes (resumen, brevísimo)
- Aparición por hover y contenido textual.

#### Propuestas nuevas

1. **Aparición tras hover con delay configurable** — [interacción]
   - Setup: cargar demo y posicionar el puntero fuera del ancla.
   - Acción: hover sobre el elemento con `tooltip` durante N ms.
   - Assertion: el tooltip aparece tras el delay configurado (no antes); el tiempo se respeta con tolerancia.
   - Cobertura: timing de entrada.

2. **Desaparición al salir del ancla con delay de gracia** — [interacción]
   - Setup: abrir el tooltip por hover.
   - Acción: mover el puntero fuera del ancla.
   - Assertion: tras el "hide delay" el tooltip se cierra; si el puntero vuelve al ancla dentro del delay, el tooltip permanece.
   - Cobertura: hysteresis y UX.

3. **`role="tooltip"` y asociación por `aria-describedby`** — [ARIA / a11y]
   - Setup: inspeccionar el árbol accesible.
   - Acción: leer atributos del ancla y del tooltip.
   - Assertion: el ancla tiene `aria-describedby` apuntando al id del tooltip; el tooltip tiene `role="tooltip"`; el contenido se anuncia tras el ancla.
   - Cobertura: contrato ARIA APG tooltip.

4. **Apertura por focus (teclado)** — [teclado]
   - Setup: tabular hasta el elemento con tooltip.
   - Acción: focus programático.
   - Assertion: el tooltip aparece por focus; no se requiere hover; el cierre ocurre al `blur`.
   - Cobertura: paridad mouse/teclado.

5. **Escape cierra el tooltip** — [teclado]
   - Setup: focus en el ancla con tooltip abierto.
   - Acción: presionar Escape.
   - Assertion: el tooltip se cierra; el foco permanece en el ancla; el evento es cancelable.
   - Cobertura: contrato dismissable.

6. **No es interactivo (no captura foco ni click)** — [interacción]
   - Setup: tooltip abierto sobre el ancla.
   - Acción: intentar tabular al contenido del tooltip y hacer click.
   - Assertion: el tooltip no es focuseable; los clicks lo atraviesan (pointer-events: none) salvo que tenga contenido interactivo intencional.
   - Cobertura: contrato no-modal.

7. **Posicionamiento flip cuando no hay espacio** — [estados visuales y edge cases]
   - Setup: colocar el ancla en el borde inferior derecho del viewport y abrir el tooltip.
   - Acción: observar la posición calculada.
   - Assertion: el tooltip flipea a `top`/`left` o equivalente según política; permanece visible sin scroll; hay offset consistente.
   - Cobertura: collision detection.

8. **Reduced motion: sin fade/scale** — [estados visuales y edge cases]
   - Setup: emular `prefers-reduced-motion: reduce`.
   - Acción: hover sobre ancla.
   - Assertion: el tooltip aparece instantáneamente; no hay transformaciones de entrada; sigue anunciándose el contenido por SR.
   - Cobertura: accesibilidad vestibular.

9. **Tooltip en elemento disabled** — [estados visuales y edge cases]
    - Setup: ancla con atributo `disabled` (button disabled).
    - Acción: hover y focus.
    - Assertion: el tooltip sigue siendo accesible mediante wrapper focuseable o equivalente; `aria-disabled` se respeta; el contenido se anuncia.
    - Cobertura: a11y en controles deshabilitados.

10. **Cambio dinámico del contenido** — [interacción]
    - Setup: tooltip abierto.
    - Acción: cambiar el texto del tooltip en caliente (prop change).
    - Assertion: el nuevo texto se refleja sin parpadeo; el SR anuncia la actualización si el tooltip ya estaba enfocado; el ancla sigue descrita.
    - Cobertura: reactividad y consistencia.

11. **Múltiples tooltips: sólo uno visible** — [interacción]
    - Setup: página con varios anclas.
    - Acción: hover secuencial sobre cada una.
    - Assertion: al entrar en una nueva ancla, el tooltip anterior se cierra antes de mostrar el nuevo; no hay solapamiento.
    - Cobertura: gestión singleton.

12. **Tooltip con contenido rico (HTML) sin romper Shadow DOM** — [estados visuales y edge cases]
    - Setup: tooltip con `<slot>` y contenido con `<strong>` e imagen.
    - Acción: abrir y leer el DOM.
    - Assertion: el HTML se proyecta; los estilos del light DOM no rompen la composición; el contraste se mantiene.
    - Cobertura: slots y scoping.

13. **Persistencia al hacer hover sobre el propio tooltip** — [interacción]
    - Setup: abrir tooltip y entrar con el puntero al cuerpo del tooltip.
    - Acción: mantener hover 2× el hide delay.
    - Assertion: si el tooltip es interactivo, permanece; si no, se cierra tras el delay (claridad de contrato).
    - Cobertura: hover bridge.

14. **Anuncio diferido del SR (no inundar)** — [ARIA / a11y]
    - Setup: spy del live region implícito (vía `aria-describedby`).
    - Acción: tabular rápido por 5 anclas con tooltips.
    - Assertion: el SR anuncia cada descripción al focus; no se omite por throttling agresivo.
    - Cobertura: cadencia y SR.

15. **Alineación RTL** — [estados visuales y edge cases]
    - Setup: documento con `dir="rtl"`.
    - Acción: abrir tooltip posicionado a la derecha del ancla.
    - Assertion: el tooltip se posiciona a la izquierda lógica (flip RTL); el offset es correcto; el contenido no se recorta.
    - Cobertura: internacionalización.
