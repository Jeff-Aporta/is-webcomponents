# F0.3 propuesta UX/UI exhaustiva — forms (16 demos: checkbox, color-picker, doc-editor, dropzone, duration-picker, file-input, full-calendar, input, mention, rating, rte, select, signature, slider, switch, textarea)

Generado por capitán-led fallback (scripts/captain-proposals.mjs) tras sub-agente fallido.

## Perfil del proyecto
is-webcomponents (vanilla TS webcomponents, Shadow DOM, GitHub Pages, Playwright).

## Categorías aplicadas por demo
- Interacción (5 props)
- Teclado (5 props)
- ARIA / a11y (4 props)
- Estados visuales / edge cases (7 props)

Total: ≥21 propuestas por demo.

---

### demo: checkbox
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/checkbox.preview.ts` y `checkbox.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=checkbox)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: color-picker
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/color-picker.preview.ts` y `color-picker.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=color-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: doc-editor
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/doc-editor.preview.ts` y `doc-editor.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=doc-editor)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: dropzone
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/dropzone.preview.ts` y `dropzone.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=dropzone)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: duration-picker
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/duration-picker.preview.ts` y `duration-picker.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=duration-picker)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: file-input
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/file-input.preview.ts` y `file-input.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=file-input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: full-calendar
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/full-calendar.preview.ts` y `full-calendar.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=full-calendar)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: input
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/input.preview.ts` y `input.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=input)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: mention
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/mention.preview.ts` y `mention.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=mention)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: rating
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/rating.preview.ts` y `rating.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rating)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: rte
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/rte.preview.ts` y `rte.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=rte)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: select
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/select.preview.ts` y `select.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=select)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: signature
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/signature.preview.ts` y `signature.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=signature)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: slider
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/slider.preview.ts` y `slider.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=slider)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: switch
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/switch.preview.ts` y `switch.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=switch)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

### demo: textarea
#### Tests existentes
- (búsqueda rápida): revisar `src/components/forms/textarea.preview.ts` y `textarea.json` para tests previos. Asumiendo greenfield a confirmar.

#### Propuestas nuevas

1. **Click principal cambia el estado del control** — [interacción]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click en el botón/control principal del demo; medir cambio en DOM (innerHTML de <is-main> o atributo aria-* del control).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click principal cambia el estado del control.

2. **Click secundario / context menu visible y cerrable** — [interacción]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: click derecho sobre el control; verificar menú contextual aparece y se cierra con Escape o click fuera.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: click secundario / context menu visible y cerrable.

3. **Hover muestra feedback visual** — [interacción]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: mouseover sobre el control; verificar cambio visual (clase :hover, tooltip, outline).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: hover muestra feedback visual.

4. **Doble-click ejecuta acción secundaria (si aplica)** — [interacción]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: doble-click ejecuta acción secundaria (si aplica).

5. **Long-press / focus sostenido cambia estado** — [interacción]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: ejecutar interacción específica del control; verificar respuesta DOM.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: long-press / focus sostenido cambia estado.

6. **Tab/Shift+Tab navega por todos los controles focuseables** — [teclado]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: presionar Tab desde <is-main>; verificar que el primer focuseable dentro del preview recibe foco. Repetir Tab 5 veces.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: tab/shift+tab navega por todos los controles focuseables.

7. **Enter activa el botón/submit del control** — [teclado]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar el control y presionar Enter; verificar submit/activación.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: enter activa el botón/submit del control.

8. **Space alterna checkboxes/switches** — [teclado]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: focar checkbox/switch y presionar Space; verificar toggle.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: space alterna checkboxes/switches.

9. **Escape cierra overlays/modales/popovers** — [teclado]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: abrir overlay y presionar Escape; verificar cierre y restauración de foco al trigger.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: escape cierra overlays/modales/popovers.

10. **Arrow keys navegan entre opciones (si aplica)** — [teclado]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: usar Arrow keys/Home/End; verificar navegación esperada.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: arrow keys navegan entre opciones (si aplica).

11. **role="..." correcto en el control y landmarks** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: querySelector(`[role="..."]`); verificar presencia del role esperado para el control.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: role="..." correcto en el control y landmarks.

12. **aria-label/aria-labelledby cuando hay solo icono** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: localizar el control; leer aria-label o aria-labelledby; verificar que no esté vacío.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-label/aria-labelledby cuando hay solo icono.

13. **aria-invalid + aria-describedby en error** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar estado de error (input vacío + submit); verificar aria-invalid="true" + mensaje de error.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-invalid + aria-describedby en error.

14. **aria-live polite/assertive en regiones dinámicas** — [aria/a11y]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: provocar cambio dinámico; verificar que aria-live announce el cambio.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: aria-live polite/assertive en regiones dinámicas.

15. **disabled: opacity reducida + aria-disabled + pointer-events: none** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner el control en estado disabled; verificar atributo + estilo computed (opacity, pointer-events).
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: disabled: opacity reducida + aria-disabled + pointer-events: none.

16. **readonly: texto seleccionable pero no editable** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: poner readonly; intentar modificar via teclado; verificar que el valor no cambia.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: readonly: texto seleccionable pero no editable.

17. **loading: skeleton/spinner mientras carga** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: disparar carga (refresh, mount); verificar presencia de skeleton/spinner mientras carga.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: loading: skeleton/spinner mientras carga.

18. **error: mensaje visible + clase error + aria-invalid="true"** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: forzar error; verificar mensaje visible + aria-invalid.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: error: mensaje visible + clase error + aria-invalid="true".

19. **empty: 0 items no rompe el layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: dejar el control con 0 items; verificar que no rompe layout.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: empty: 0 items no rompe el layout.

20. **overflow: texto largo se recorta / hace scroll sin romper layout** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: inyectar texto de 1000+ chars; verificar truncamiento o scroll interno.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: overflow: texto largo se recorta / hace scroll sin romper layout.

21. **theme toggle: light↔dark preserva el estado del control** — [estados visuales]
   - Setup: navegar a `?s=${base64(component=textarea)}` y esperar `<is-main class="main">` con secciones > 0 y texto > 60.
   - Acción: cambiar theme a dark/light; verificar que el control preserva su valor/estado.
   - Assertion: estado observable esperado en el DOM (clase CSS, atributo aria-*, texto en pantalla, evento emitido); el test falla si el comportamiento no se manifiesta en ≤ 1s tras la acción.
   - Cobertura: theme toggle: light↔dark preserva el estado del control.

---

