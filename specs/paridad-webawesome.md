# Paridad con Web Awesome — F8 «nada que envidiarle» (2026-11-06)

> **Estado:** diseño (paso 1) para revisión. No se ha tocado código del kit. Los prototipos que respaldan las cifras
> se hicieron fuera del repo y se describen en §HOW-0; las mediciones del punto de partida salen de `dist/cdn` publicado
> en `a5285b4c`.
> **Restricciones fijas:** sin Lit ni Web Awesome como dependencia, cero dependencias de runtime, todo sobre el molde
> `IswcElement` (`src/core/iswc-element.ts`), API pública de los componentes intacta (atributos, eventos, slots, parts),
> estilo del repo (código plano, tipos de una línea en `*.schemas.ts`, un import por línea, kebab-case, `#` privados, sin
> reexports, tamaños en `em`), español en todo.

---

## WHAT

### W1. Qué se mira de Web Awesome (fuentes)

Se consultó el repositorio público `shoelace-style/webawesome` (rama `next`, paquete `packages/webawesome/src`) y la
documentación de webawesome.com el 6-nov-2026:

- `internal/webawesome-element.ts` — base sobre `LitElement`: `dir`/`lang` como `@property`, `did-ssr` reflejado,
  `internals` en el constructor, `customStates.set/has`, estado `wa-defined`, `static css` + `hostStyles`, snapshot de
  propiedades reflejadas iniciales, `relayNativeEvent`, `setStyle`/`setStyleProperty`.
- `internal/webawesome-form-associated-element.ts` — `static formAssociated`, `static validators`, `name`/`disabled`/
  `required`/`form`/`customError`, `hasInteracted` con `assumeInteractionOn = ['input']`, estados `required/optional`,
  `valid/invalid`, `user-valid/user-invalid`, `disabled`; `checkValidity`/`reportValidity`/`setCustomValidity`/
  `setValidity`/`updateValidity`; `formResetCallback`/`formDisabledCallback`/`formStateRestoreCallback`; evento
  `wa-invalid`.
- `internal/watch.ts` — `@watch(prop | prop[], { waitUntilFirstUpdate })`, handler `(anterior, nuevo)`, corre antes del
  `update` y solo si el valor cambió.
- `internal/slot.ts` — `HasSlotController(host, ...nombres)`: `test(slot, propSSR?)`, `hasDefaultSlot`, repinta en
  `slotchange`; en SSR infiere por la propiedad `with-*`.
- `components/dialog/dialog.ts` — `<dialog>` nativo con `showModal()`, foco inicial `[autofocus]`, restauración al
  disparador, Escape solo si es el de arriba de una pila (`dismissible-stack.ts`), `light-dismiss`, `wa-show`/`wa-hide`
  cancelables con `source`, animación `pulse` al vetar, `without-header`, `with-footer`/`with-label` como pistas SSR.
- `components/popup/popup.ts` — `@floating-ui/dom` + `popover="manual"` (capa superior), `placement`, `flip`, `shift`,
  `arrow`, `auto-size`, `sync`, `hover-bridge`, `boundary`.
- `utilities/autoloader.ts` — `startLoader()`: `discover(document)` + `MutationObserver` sobre `documentElement`
  (`childList`, `subtree`), busca `:not(:defined)` con prefijo `wa-`, `data-wa-preload`, `wa-discovery-complete`.
- Docs: localización (`lang`/`dir` en `<html>` o en el propio componente —no en ancestros—, cadena `es-PE → es → en`,
  `registerTranslation`, observador de `lang`), personalización (tokens `--wa-*`, temas por clase, `wa-light/wa-dark`,
  `::part()`, `:state()`, utilidades `wa-stack`/`wa-cluster`/`wa-grid`…), uso (eventos `wa-*`, `allDefined()`,
  `updateComplete`, `vscode.html-custom-data.json` y `web-types.json`).

**No verificado** (no se abrió el código): `LocalizeController` por dentro, `internal/animate.ts`, `internal/drag.ts`,
`dismissible-stack.ts`, `live-announcer.ts` y el generador del manifiesto de elementos.

### W2. Punto de partida medido (6-nov-2026, `a5285b4c`)

**Bytes** (brotli calidad 11; «cierre» = archivos de `deps/core.json` o `deps/<cat>.json` concatenados):

| Módulo / cierre | Archivos | Min (B) | Brotli (B) |
|---|---:|---:|---:|
| `core/iswc-element` (cierre) | 5 | 14 645 | 5 123 |
| `core/attrs` (cierre) | 3 | 8 543 | 3 232 |
| `core/props-element` (cierre) | 6 | 16 315 | 5 603 |
| `core/form-associated` (cierre; código propio 412 B / 209 br) | 3 | 3 271 | 1 531 |
| `core/form-control-mixin` (cierre; sin usuarios) | 2 | 5 594 | 1 992 |
| `core/resolve-locale` (cierre; propio 288 / 146 br) | 3 | 3 058 | 1 452 |
| `core/element-base` (cierre) | 5 | 14 487 | 5 046 |
| `core/position` (cierre) | 3 | 9 745 | 3 724 |
| **Unión «base de componentes»** (los 9 anteriores + `dom`) | 18 | 34 037 | **10 044** |
| `iswc-button` (cierre) | 7 | 36 237 | 9 108 |
| `iswc-input` (cierre) | 11 | 63 841 | 14 971 |
| `iswc-toast` (cierre) | 8 | 31 749 | 9 554 |

Notas: el chunk compartido de ayudas de esbuild (`_chunks/chunk-CMZVHIC2.mjs`, 2 311 / 1 144 br) **ya contiene** los
ayudantes de decoradores estándar (`@attrBool accessor …` de `dropdown`), así que `@prop`/`@state`/`@watch` no pagan ese
coste otra vez. Los `<cat>/<tag>.min.mjs` son fachadas de ~1,1 KB (button 1 113 B): el código vive en chunks.

**Usuarios reales** (`git ls-files` + grep; solo `.ts`, sin contar `.md` ni `shared-modules.json`):

| Módulo | Usuarios | Detalle |
|---|---:|---|
| `core/form-associated` | **21** | 13 de `forms/` + `button`, `copy-button`, `code`, `btn-ref`, `app-shell`, `login-dropdown`, `session-menu`, `app-nav`. El «34» del brief contaba los `.md`. Llamadas: `attachFormInternals` 30, `setCustomState` 91, `setFormValue` 51, `setValidity` 42, `clearValidity` 22 |
| `core/form-control-mixin` | **0** | solo excepción en `tests/gobernanza/sin-codigo-muerto.test.ts` |
| `core/resolve-locale` | **8** | `forms/date-field-element`, `forms/date-utils`, `forms/picker-element`, `helpers/format-bytes`, `format-date`, `format-number`, `format`, `relative-time` |
| `core/element-base` | **0** | solo un enlace en `feedback/palette-selector.md` y la excepción de código muerto; ningún proyecto de la carpeta de servicios lo importa (grep) |
| `core/props-element` | **12** | `stat-group`, `trace-log`, `empty-state`, `loading`, `status-pill`, `stream-bubble`, `tenant-selector`, `page-header`, `ai-tool`, `person`, `json-dialog`, `semantic-search` |
| `@attrBool/@attrStr/@attrEnum/@attrNum` | **1** | solo `actions/dropdown.ts` (4 campos) |
| Reflejo a mano (`set x(v) { …Attribute… }` en una línea) | **469 setters en 77 archivos** | forms 203, isp 53, helpers 40, media 36, actions 29, files 22, data 21, feedback 18 |
| `setStringAttr/setOptionalAttr/getNumberAttr/setEnumAttr` | 53 archivos | |
| `ModalBase` | 3 | `layout/dialog`, `layout/drawer`, `overlays/window` (este con su propia trampa) |
| `createPopupDismiss` | 7 | `context-menu`, `dropdown`, `speed-dial`, `confirm-modal`, `palette-selector`, `popconfirm`, `window` |
| `core/position` | 14 | + `select`, `combobox`, `color-picker`, `picker-element`, `grid-ui`, `floating`, `dropdown-item` |
| `formAssociated = true` | 17 | `formResetCallback` en 14 |
| Estados con `setCustomState`/`states.add` | 19 | `user-invalid`/`user-valid`: **0** |
| Textos fijos de interfaz en español | **78 archivos** (heurística) | data 14, feedback 13, isp 13, forms 9, layout 9, navigation 6; `aria-label` literal en 57 |
| `inert` | 3 | `rating`, `slider` (decorativo), `window` |
| Fichas `.json` con `events` | **0** de 225 | 17 con `anatomy` |
| `axe-core`, jsdom, happy-dom en `node_modules` | **no** | `tests/_shared/exhaustivo-forms.ts` lo dice: los exhaustivos de forms son estáticos |

`src/core` tiene hoy **24** `.ts` (más 7 `.scss`). Herencia en `src/components`: 144 `extends IswcElement`, 28
`withStyleAttrs(IswcElement)`, 17 `DiagramElementBase`, 12 `PropsElement`, 3 `ModalBase`, 3 `BreakpointHost`, 20
`HTMLElement` (clases internas, no componentes del catálogo).

**Presupuestos vigentes** que F8 no puede romper sin ajuste justificado: `core/loader.min.mjs` ≤ 8 KB br, media por tag
≤ 6 KB br y ≤ 7 860 B sin comprimir, `actions/button.min.mjs` ≤ 2 KB (`tests/navegador/carga.test.ts`, también
`tests/gobernanza/loader-capas.test.ts`); shell crítico de Avatar ≤ 75 módulos y ≤ 405 000 B, `deps.json` ≤ 12 000 B,
partes ≤ 40 000 B (`tests/gobernanza/deps-json.test.ts`).

### W3. Inventario comparado (en los dos sentidos)

Prioridad: **P1** = alto valor y bajo/medio coste, entra en F8; **P2** = entra en F8 si cabe; **P3** = después o no.

#### W3.1 Lo que Web Awesome tiene

| Patrón de Web Awesome | Qué tenemos (dónde, usuarios) | Qué falta | Prio |
|---|---|---|---|
| `@property({ reflect, converter, attribute })` | `@attr*` en `core/attrs.ts` (1 usuario), 469 setters a mano, `upgradeProperties` en el molde | una sola declaración reactiva prop↔atributo con tipo, defecto y reflejo | **P1** |
| `@state()` | campos `#privados` + llamada manual a `#update()` | estado interno que repinta solo | **P1** |
| `@watch(prop, { waitUntilFirstUpdate })` | `onAttributeChanged` con `if (name === …)` en cascada (input.ts tiene 6 ramas) | vigía declarativo `(anterior, nuevo)` | **P1** |
| `render()` reactivo + `requestUpdate()` + `updateComplete` | `#update()` imperativo que reescribe todo; `PropsElement.pintar(previos)` síncrono | repintado coalescido por microtarea, diff mínimo, `actualizacionCompleta` | **P1** |
| `WebAwesomeFormAssociatedElement` | 5 helpers sueltos en `core/form-associated.ts` (21 usuarios); `form-control-mixin.ts` sin usuarios | clase base con validez, estados `user-*`, callbacks de form y chrome común | **P1** |
| `static validators` (`required`, `custom-error`…) | cada control replica `valueMissing` y el espejo de la validez nativa (input.ts `MIRRORED_FLAGS`) | `validar()` sobreescribible + espejo nativo compartido | **P1** |
| `customStates.set/has`, `:state(…)` | `setCustomState` (19 componentes) | `estado()` en el molde con respaldo `data-*` y `wa-defined`→`iswc-definido` | **P1** |
| `lang`/`dir` + `LocalizeController` + `registerTranslation` | `resolve-locale.ts` (8 usuarios, sin observar cambios); textos fijos en 78 archivos | `localize.ts`: locale/dir resueltos, observador único de `<html lang dir>`, `t()`, `Intl` memorizado | **P1** |
| Focus trap + pila de descartables (`dismissible-stack`) | `ModalBase` atrapa Tab solo en light DOM y escucha Escape cada instancia; `window.ts` lleva su propia trampa | pila única: el de arriba recibe Escape/clic fuera; trampa consciente de shadow DOM | **P1** |
| `inert` del resto / `showModal()` | `popover` + `aria-modal` en dialog/drawer; `inert` solo en `window` | `inert` en hermanos mientras haya modal; restauración de foco común | **P1** |
| `HasSlotController` | `hasSlotted`, `ocultarSlotsVacios` en `core/dom.ts` y `slotchange` a mano en cada componente | `ranuras` reactivas en `IswcReactive` (`static ranuras = ['label','hint']`) | **P2** |
| `@query('#x')` | `shadow.getElementById` en el constructor (input.ts: 16 referencias) | innecesario con render (a); atajo `this.$('#x')` opcional | P3 |
| Eventos `wa-*` tipados (clases `WaInvalidEvent`…) + manifiesto | `emit<T>()` genérico; eventos solo en cabecera JSDoc; 0 fichas con `events` | `static events` tipado → `.json`/`.md` del componente y auditor | **P1** |
| `relayNativeEvent` | `dispatchEvent(new Event('input', { bubbles, composed }))` a mano (input.ts 3 sitios) | `reemitir(e)` en el molde | P2 |
| `styles` por clase (`static css` + `hostStyles`) | igual: `static css` → una `CSSStyleSheet` por clase + hojas base adoptadas | — (paridad) | — |
| `wa-popup` sobre Floating UI (flip/shift/arrow/auto-size/hover-bridge/sync) | `core/position.ts` propio (`computePosition`, `placement`, virtual elements) + `popover` en 12 | `auto-size`, `sync`, `hover-bridge` y flecha como opciones de `computePosition` (sin dependencia) | P2 |
| `internal/animate.ts` (clases `show/hide/pulse`, `--show-duration`) | animaciones propias por componente (`#animateOpen` de ModalBase) | `animar(el, 'show' \| 'hide' \| 'pulse')` común y `pulse` al vetar un cierre | P2 |
| `internal/drag.ts` | `slider`, `signature`, `dock`, diagramas con su propio arrastre | utilidad común `arrastrar()` | P3 |
| `live-announcer` | `role=status aria-live` sueltos | anunciador único `anunciar(texto)` | P2 |
| Autoloader por `MutationObserver` (`startLoader`, `discover`, `data-wa-preload`) | `iswcLoader.load()` explícito + `ensure()` por `static deps` + `collect-iswc-tags` sin DOM | modo opcional `iswcLoader.observar()` que hace `ensure` de los `iswc-*:not(:defined)` que aparezcan | P2 |
| `allDefined()` | `customElements.whenDefined` a mano; `data-ready` de la galería | `iswcLoader.listos(raiz)` | P3 |
| Tokens `--wa-*`, temas por clase, `wa-light/dark/invert` | tokens `--iswc-*`, 25 paletas, `data-theme` + `data-panda`, contrato AA (`palettes-contrast`) | escala de espacio/radio por variable única (`--wa-space-scale`) | P3 |
| Utilidades CSS (`wa-stack`, `wa-cluster`, `wa-grid`…) | `is-base.css`, `presentation.scss`, `layout/*` como componentes | capa de utilidades de maquetación | P3 |
| SSR + hidratación (`did-ssr`, `with-*`) | shadow declarativo reutilizado por el molde (`initShadow` toma el existente), sin generador SSR | — (fuera de alcance; el molde ya no rompe con DSD) | P3 |
| `vscode.html-custom-data.json`, `web-types.json` | fichas `.json` de preview (225) y `.md` por componente | generar ambos desde `static events` + `@prop` + slots/parts | P2 |

#### W3.2 Lo que tenemos nosotros y Web Awesome no

| Nuestro | Dónde | Equivalente en Web Awesome |
|---|---|---|
| Loader en capas: núcleo ≤ 8 KB br + capas `loader-<x>` diferidas, deps por categoría (`deps/<cat>.json`), precarga del cierre en ráfagas | `src/cdn/loader.ts`, `deps.json` | autoloader que importa `components/<x>/<x>.js` uno a uno (cascada por anidamiento) |
| Lote ESM del kit y de apps (`lote-kit.ts`), conversor `construirApp` | `src/cdn/build/` | no |
| Presupuestos de carga como gate (bytes, ráfagas, ready de galería) | `tests/navegador/carga.test.ts` | no |
| Publicación por SHA con espejos y hash de contenido (`?v=`) | `loader-mirrors`, `loader-hashes` | CDN por versión semver |
| Hojas base adoptadas una vez por página + respaldo `<style>` sin red | `core/iswc-element.ts` | `hostStyles` por componente |
| `PropsElement`: un objeto `props` validado con Zod, kebab-case, «solo repinta si algo cambió» | `core/props-element.ts` | no (props sueltas) |
| Fichas `.json` ejecutables (galería, controles, playground) y documentación por componente | `src/components/*/*.json` | docs del sitio |
| Guardianes de gobernanza (molde, sin reexports, em, hermeticidad, código muerto…) | `tests/gobernanza/` | linters genéricos |
| 197 componentes (diagramas, data-grid, ISP, ER, spreadsheet…) en español | catálogo | ~60 componentes, inglés por defecto |

---

## HOW

### HOW-0. Prototipos y cifras de la decisión (a) / (b)

Prototipos fuera del repo (carpeta temporal de la sesión), compilados con el `esbuild` 0.25.0 del kit, `target: es2022`,
`minify`, `splitting` (como `scripts/build.mjs`), y medidos en **Edge headless 157** (`channel: 'msedge'`, Playwright
1.63). Piezas: `iswc-reactive` (prop/state/watch + planificador), `plantilla-html` (variante a),
`vincular` (variante b), `iswc-form-control`, `localize` + diccionario `es`, `pila-modal`. El molde se sustituyó por un
stub con el mismo ciclo de vida y quedó **externo** en la medición de bytes. Componente de banco: un campo con
`label`/`hint`/`errorText`/`value`/`disabled`/`required`/`clearable`/`showCount`/`maxlength` y estado `tocado`, en tres
versiones con el mismo DOM resultante (comprobado): (a), (b) y (m) = estilo actual del kit (refs cacheadas + `#update()`
que reescribe todo, como `forms/input.ts`).

**Bytes reales** (los ayudantes de decoradores van a un chunk aparte, que en el kit ya existe):

| Pieza | Min (B) | Brotli (B) |
|---|---:|---:|
| `iswc-reactive` (prop/state/watch, planificador, `actualizado`) | 2 478 | 1 018 |
| (a) `plantilla-html` (`html```, partes hijo/atributo/`?bool`/`.prop`/`@evento`, listas por índice, anidadas) | 2 692 | 1 193 |
| (b) `vincular` (`data-text`/`data-attr`/`data-prop`/`data-on`) | 938 | 463 |
| `iswc-form-control` | 3 020 | 1 031 |
| `localize` (sin diccionario) | 1 003 | 460 |
| diccionario `es` (24 términos de muestra) | 744 | 401 |
| `pila-modal` (inert, trampa con shadow, Escape, foco) | 1 402 | 615 |
| campo (a), solo el componente | 2 420 | 884 |
| campo (b), solo el componente | 2 685 | 948 |
| campo (m), solo el componente | 2 899 | 862 |

**Tiempos** (ms). El equipo estaba cargado (otro gate corriendo), así que se reporta el **mínimo de 21 corridas** y la
comparación (a)↔(b) se hace **en pares alternados** (a,b,m / b,a,m…), con la mediana del cociente a/b de cada par:

| Prueba | (a) html, mín | (b) vincular, mín | (m) actual, mín | a/b (mediana de pares) |
|---|---:|---:|---:|---:|
| 1 000 actualizaciones de `value`, cada una pintada (`await` por actualización) | 6,1 | 5,7 | 11,8 | 1,15 |
| 1 000 escrituras en el mismo tick (ráfaga, un pintado) | 0,7 | 0,6 | 11,6 | 1,00 |
| 1 000 instancias creadas y pintadas | 161 | 190 | 156 | 0,84 |

Lectura: (a) y (b) están dentro del ruido entre sí (a ~15 % más lenta actualizando, ~16 % más rápida creando; una
primera tanda de 9 corridas sin alternar dio el orden inverso en la creación) y **ambas duplican a la línea base** al
actualizar, porque solo tocan las partes cuyo valor cambió; la ráfaga muestra el coalescido (1 pintado en vez de 1 000:
~17× menos). El primer render de las tres es equivalente. El rendimiento no decide; la diferencia de core es **730 B br**
a favor de (b).

**Ergonomía** (ver W-ejemplos en HOW-2): (a) expresa condicionales de estructura, listas y plantillas anidadas, y deja
marcado, datos y eventos en un solo sitio, con el mismo modelo mental que Lit/Web Awesome; (b) mantiene el idioma actual
(`TEMPLATE` estático, auditable por regex como hoy), pero obliga a editar dos sitios (marcado y vista), su minilenguaje
`data-attr="?hidden:!clave"` no lo comprueba TypeScript y **no tiene listas ni estructura condicional** (select, combobox,
paginación, árbol, date-picker, tabla, stepper y transfer seguirían con DOM imperativo).

**Recomendación: (a) `html` etiquetado.** Es la única que da paridad real con `render()` de Web Awesome en los
componentes con listas (los más grandes del catálogo: `select` 925 líneas, `date-picker` 807, `slider` 776), su
coste extra es 730 B br pagados una vez en el core y su componente sale 3 % más pequeño en brotli que (b). Límites del
prototipo a resolver en el paso 2 (estimados en +300–400 B br): listas con clave (`repetir(items, clave, plantilla)`),
nodos de una parte hija en la raíz de una plantilla (marcador de inicio además del de fin), `svg```, y elementos de texto
crudo (`<textarea>`, `<title>`) donde un comentario no es un marcador.

### HOW-1. Core tras F8

Entran 3 y salen 4: **23** `.ts` en `src/core` (≤ 24), cada uno con su `schemas/<nombre>.schemas.ts`.

| Archivo | Acción | Qué contiene |
|---|---|---|
| `iswc-reactive.ts` | **nuevo** | `IswcReactive extends IswcElement`, `@prop`, `@state`, `@watch`, planificador, `html```, `render()` sobre el shadow, `estado()`, `ranuras`, `reemitir()` |
| `iswc-form-control.ts` | **nuevo** | `IswcFormControl extends IswcReactive` + chrome común (absorbe `form-associated` y `form-control-mixin`) |
| `localize.ts` | **nuevo** | `resolverLocale`/`resolverDir` (absorbe `resolve-locale`), observador único, `t()`, `formato()`, diccionario `es` incrustado |
| `position.ts` | amplía | sección «capas»: `pila-modal` (inert, trampa, Escape/clic fuera, foco) junto a `createPopupDismiss` |
| `props-element.ts` | cambia de base | `PropsElement extends IswcReactive` |
| `form-associated.ts`, `form-control-mixin.ts`, `resolve-locale.ts`, `element-base.ts` | **se borran** | `element-base` tiene 0 usuarios en el repo y en los proyectos hermanos: quien lo extienda fuera pasa a `IswcElement` con `static shadowInit = null` (cambio de ruta al re-pinear, como F9a) |
| `attrs.ts` | se adelgaza al final | `@attr*` pasan a ser alias internos de `@prop` hasta migrar `dropdown`; luego se borran (P1 del lote 1) |

Los diccionarios que no son `es` viven en `src/core/i18n/<lang>.ts` (subcarpeta, no cuenta como módulo de core suelto;
se cargan solo si `lang` los pide: `iswcLoader` los resuelve como cualquier módulo). **Decisión pendiente D3.**

**Coste en bytes del core** (prototipo medido; producción estimada +25 % por los límites de HOW-0 y los mensajes):

| | Brotli medido | Producción estimada |
|---|---:|---:|
| Unión «base de componentes» hoy | 10 044 | 10 044 |
| − `form-associated` (209), `resolve-locale` (146), `form-control-mixin` (≈ 897 propios), fachada `element-base` (≈ 270) | −1 522 | −1 522 |
| + `iswc-reactive` con (a) | +2 211 | +2 800 |
| + `iswc-form-control` | +1 031 | +1 300 |
| + `localize` + `es` | +861 | +1 100 |
| + `pila-modal` | +615 | +750 |
| **Total** | **13 240** | **≈ 14 470** |

El tope del brief (~14 KB br) queda justo: con (b) el total medido sería 12 510. Un componente que siga extendiendo
`IswcElement` **no paga nada** (los módulos nuevos son chunks aparte); `button` paga reactive + plantilla (+2,2 KB br en
su cierre, de 9 108 a ≈ 11 300) solo cuando migre. Ajuste de presupuesto propuesto: añadir a
`tests/navegador/carga.test.ts` un tope explícito «unión base de componentes ≤ 14 500 B br» medido igual que W2.

### HOW-2. `IswcReactive` (`src/core/iswc-reactive.ts`)

```ts
type Tipo = 'str' | 'bool' | 'num' | 'json';
type PropOpts = { attr?: string | false; reflect?: boolean; type?: Tipo; enum?: readonly string[] };  // en iswc-reactive.schemas.ts

export function prop(o?: PropOpts);          // accessor; attr por defecto = kebab del nombre; enum → fuera de lista = defecto
export function state();                     // accessor interno, sin atributo
export function watch(p: string | string[], o?: { esperarPrimerRender?: boolean });  // (anterior, nuevo), antes de pintar

export class IswcReactive extends IswcElement {
  static ranuras: readonly string[];         // HasSlotController: this.ranura('label') reactivo vía slotchange
  solicitarRender(prop?: string, anterior?: unknown): Promise<boolean>;  // coalesce por microtarea
  actualizarAhora(): void;                   // vacía la cola en síncrono (PropsElement y tests)
  get actualizacionCompleta(): Promise<boolean>;
  render(): Resultado | null;                // html`…`
  actualizado(cambios: Map<string, unknown>): void;
  estado(nombre: string, activo: boolean): void;   // CustomStateSet + respaldo data-<nombre>
  reemitir(e: Event): void;                  // relayNativeEvent
}
```

Reglas:

- `@prop` registra el atributo en la misma cola que hoy usa `materializarAtributos` (el navegador congela
  `observedAttributes` en el `define`); `observedAttributes` = `observed` ∪ `styleAttrs` ∪ `@prop`.
- El valor inicial del campo solo se escribe en el atributo si `reflect` y el HTML no dijo nada (misma semántica que
  `@attrBool.init`). `attributeChangedCallback` convierte con el `type` y no vuelve a reflejar (guarda de reentrada).
- `upgradeProperties` del molde ya recoge las propiedades escritas antes del upgrade: no hay que duplicarlo.
- El primer pintado ocurre en el `connectedCallback` (microtarea); sin `render()` (devuelve `null`) la clase es un
  `IswcElement` con propiedades reactivas y el componente sigue usando su `static template`.
- `@watch` corre antes de `render()`, una vez por prop cambiada, y respeta `esperarPrimerRender`.

**Antes → después de `forms/input.ts`** (573 líneas hoy; estimado ≈ 330):

```ts
// ANTES (extracto real): 16 referencias cacheadas, 22 pares get/set a mano, 6 ramas en onAttributeChanged,
// #syncSlots + #syncNative + #syncDisabled + #update + #syncSupport reescribiendo todo en cada cambio.
get clearable() { return this.hasAttribute('clearable'); }
set clearable(v) { this.toggleAttribute('clearable', !!v); }
get errorText() { return this.getAttribute('error-text') ?? ''; }
set errorText(v) { setOptionalAttr(this, 'error-text', v); }
onAttributeChanged(name, oldVal, newVal) { if (name === 'value') { … } else if (name === 'disabled' || …) { … } … }

// DESPUÉS
class IswcInput extends IswcFormControl {
  static tag = 'iswc-input';
  static css = css;
  static shadowInit = { mode: 'open', delegatesFocus: true };
  static deps = ['iswc-icon', 'iswc-button'];
  static ranuras = ['label', 'hint', 'start', 'end'];
  static events = { 'iswc-input': {} as { value: string }, 'iswc-change': {} as { value: string }, 'iswc-typing-end': {} as { value: string }, 'iswc-enter': {} as { value: string }, 'iswc-otp': {} as { code: string } };

  @prop({ enum: TYPES }) accessor type = 'text';
  @prop({ enum: APPEARANCES }) accessor variant = 'outlined';
  @prop({ enum: PLACEMENTS }) accessor labelPlacement = 'top';
  @prop() accessor placeholder = '';
  @prop({ type: 'bool' }) accessor clearable = false;
  @prop({ type: 'bool' }) accessor passwordToggle = false;
  @prop({ type: 'bool' }) accessor showCount = false;
  @prop({ attr: 'prefix' }) accessor prefixText = '';
  @prop({ attr: 'suffix' }) accessor suffixText = '';
  @prop({ type: 'num' }) accessor maxlength: number | null = null;
  @state() accessor verContrasena = false;

  @watch('autocomplete') escucharOtp(): void { … }

  render() {
    const editable = !this.inhabilitado && !this.readonly;
    return html`<div part="form-control" class="form-control">
      ${this.chromeEtiqueta()}
      <div part="base" class="base">
        <span part="start" class="adorn" ?hidden=${!this.prefixText && !this.ranura('start')}>
          <span part="prefix" class="adorn-text" ?hidden=${!this.prefixText}>${this.prefixText}</span><slot name="start"></slot>
        </span>
        <input part="input" class="input" id="input" type=${this.type === 'password' && this.verContrasena ? 'text' : this.type}
          .value=${this.value} ?disabled=${this.inhabilitado} ?readonly=${this.readonly} placeholder=${this.placeholder || null}
          maxlength=${this.maxlength} aria-describedby="hint error-text"
          @input=${this.#alEscribir} @change=${this.#alCambiar} @keydown=${this.#alTeclear}>
        <iswc-button part="clear" class="icon-btn" variant="text" color="text" tabindex="-1" aria-label=${this.t('limpiar')}
          ?hidden=${!(this.clearable && this.value && editable)} @click=${this.#limpiar}>
          <iswc-icon icon="mdi:close-circle" aria-hidden="true"></iswc-icon></iswc-button>
        …
      </div>
      ${this.chromeAyuda(this.showCount ? this.t('caracteres', this.value.length, this.maxlength) : '')}
    </div>`;
  }
}
```

Lo que desaparece de `input.ts`: los 22 pares get/set, `OBSERVED`/`EXTRA_UPGRADE_*`, las 16 referencias, `#syncSlots`,
`#syncSupport`, `#updateValidity` y los tres `formXxxCallback` (los da `IswcFormControl`), `MIRRORED_FLAGS` (espejo nativo
común) y los textos fijos «Limpiar», «Mostrar contraseña», «Este campo es obligatorio».

### HOW-3. `IswcFormControl` (`src/core/iswc-form-control.ts`)

- `static formAssociated = true`; `internals` en el constructor (null si el motor no lo admite, como hoy).
- Props comunes: `name` (reflejado), `value` (solo propiedad; el atributo `value` es `defaultValue`), `disabled`,
  `required`, `readonly`, `label`, `hint`, `errorText`, `error`; `form`, `validity`, `validationMessage`,
  `willValidate`, `labels` delegan en `internals`; `inhabilitado` = `disabled` ∨ `fieldset[disabled]`.
- Validez: `validar(): [ValidityStateFlags, claveDeMensaje]` sobreescribible; por defecto `required` + espejo de la
  validez del control nativo devuelto por `get controlNativo()` (lo que hoy hace `MIRRORED_FLAGS`).
  `actualizarValidez()` se llama en `actualizado()`; `checkValidity`, `reportValidity` (marca `interactuado`),
  `setCustomValidity` como el estándar.
- Estados (`:state(x)` + respaldo `[data-x]` para motores sin `CustomStateSet`): `invalid`, `valid`, `user-invalid`,
  `user-valid` (solo tras interacción: primer `iswc-change`, `blur` tras editar, `reportValidity` o `invalid` nativo),
  `required`, `optional`, `disabled`, `readonly`, `blank`, `focused`. Los nombres actuales (`blank`, `invalid`…) se
  mantienen: los consumidores no cambian.
- Callbacks: `formResetCallback` (valor ← `defaultValue`, `interactuado = false`), `formDisabledCallback`,
  `formStateRestoreCallback`.
- Eventos: `cambioDelUsuario('input' | 'change')` emite `iswc-input`/`iswc-change` con `{ value }` y re-emite el nativo;
  `iswc-invalid` al recibir `invalid`.
- Chrome común (lo que hoy está sin usuarios en `form-control-mixin.ts`): `chromeEtiqueta()` y
  `chromeAyuda(extra)` devuelven `html` con `part="label"`, `part="support"`, `part="hint"`, `part="error-text"`,
  `part="count"`, `aria-describedby`/`aria-invalid` coherentes. Un control sin chrome (`switch`, `radio`) no los usa.
- `button` y `copy-button` (form-associated para `submit`/`reset`) extienden `IswcFormControl` con `validar()` vacío.

### HOW-4. `localize.ts`

- `resolverLocale(el, explicito?)`: atributo `locale`/`lang` propio → ancestro con `lang` (Web Awesome no mira
  ancestros; nosotros sí, con `closest`, porque la doc de apps lo pide) → `<html lang>` → `navigator.language` → `es`.
  `resolverDir` igual con `dir`.
- Un único `MutationObserver` sobre `<html>` (`lang`, `dir`) y la pila de componentes vivos que usan `t()`; alta en
  `onConnected`, baja en `onDisconnected`. `IswcReactive.t(clave, ...args)` y `this.locale`/`this.dir` llaman aquí.
- `registrarTerminos(lang, terminos)`: fusiona y repinta los vivos. Cadena `es-CO → es → es` (base del kit).
- `formato('number' | 'date' | 'relative', locale, opciones)`: `Intl.*` memorizado por clave (los 6 `helpers/format-*`
  y `date-*` dejan de crear un `Intl` por render).
- Términos del kit con nombre en camelCase español (`cerrar`, `limpiar`, `cargando`, `campoObligatorio`,
  `pagina(n, t)`, `caracteres(n, m)`…); una función cuando hay plural o interpolación.
- Componentes que lo usan (heurística de W2, 78 archivos): `toast`, `toast-item`, `copy-button`, `button` (`Cargando`),
  `input`, `textarea`, `select`, `combobox`, `file-input`, `dropzone`, `date-picker`, `date-range-picker`,
  `full-calendar`, `picker-element`, `rating`, `pagination`, `pager`, `carousel`, `tab-group`, `scroller`, `doc-index`,
  `dialog`, `drawer`, `window`, `command-palette`, `semantic-search`, `json-dialog`, `confirm-modal`, `popconfirm`,
  `empty-state`, `skeleton`, `spinner`, `progress-*`, `data-grid`, `ag-grid`, `spreadsheet`, `transfer`, `trace-log`,
  `isp/*` (13), `md-editor`, `er-editor`, `lightbox`, `qrcode`, `video-playlist`, `login`, `session-menu`, `dock`.

**Antes → después de `feedback/toast.ts`** (componente de feedback):

```ts
// ANTES: textos fijos y atributo reflejado a mano
TEMPLATE.innerHTML = `<div part="stack" class="stack" role="region" aria-label="Notificaciones"><slot></slot></div>`;
get placement() { … VALID_PLACEMENT.includes(v) ? v : 'bottom-end' }
set placement(v) { this.setAttribute('placement', VALID_PLACEMENT.includes(v) ? v : 'bottom-end'); }
onAttributeChanged(name, _o, v) { if (name === 'placement' && v && !VALID_PLACEMENT.includes(v)) this.setAttribute('placement', 'bottom-end'); }
const loading = this.#normalizePromiseMsg(callbacks.loading, undefined, 'Cargando…');
const ok = this.#normalizePromiseMsg(callbacks.success, data, 'Listo');
const bad = this.#normalizePromiseMsg(callbacks.error, err, 'Algo salió mal');

// DESPUÉS
class IswcToast extends IswcReactive {
  static tag = 'iswc-toast';
  static css = css;
  static events = { 'iswc-after-hide': {} as void };
  @prop({ enum: VALID_PLACEMENT, reflect: true }) accessor placement: Placement = 'bottom-end';
  render() {
    return html`<div part="stack" class="stack" role="region" aria-label=${this.t('notificaciones')}><slot></slot></div>`;
  }
  async promise<T>(p: Promise<T>, c: ToastPromiseCallbacks = {}): Promise<T> {
    const loading = this.#normalizar(c.loading, undefined, this.t('cargando'));
    …
  }
}
```

`toast-item` gana además `aria-label=${this.t('cerrar')}` en el botón y `role`/`aria-live` derivados de `color` en
`render()` (hoy los fija a mano en `#syncRole`).

### HOW-5. Overlays (`position.ts`, sección «capas», y `ModalBase`)

- `abrirModal(host, { cerrar, inicial? })` / `cerrarModal(host)`: pila única por documento. Al abrir: guarda
  `activeElement` (atravesando shadows), pone `inert` en los hermanos de cada ancestro del host hasta `<body>` (y lo
  quita al cerrar solo donde lo puso), enfoca `[autofocus]` → primer enfocable → la caja. Teclado en captura **una**
  vez: Escape y Tab solo para el de arriba. Tab cicla por los enfocables del host incluyendo los shadow roots anidados
  (hoy `ModalBase` usa `querySelectorAll` en light DOM y se salta los controles internos de los `iswc-*`).
- Clic fuera (`light-dismiss`) y Escape pasan por el mismo `cerrar(origen)`; `iswc-hide` cancelable con
  `{ source }` y animación `pulse` si se veta (paridad con `wa-dialog`).
- `createPopupDismiss` se apila en la misma pila con `modal: false` (sin `inert`, sin trampa): un `select` abierto dentro
  de un `dialog` cierra primero el `select` con Escape.
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` al título en la caja (hoy `aria-modal` está, el
  `labelledby` no siempre).
- Pasan a usarlo: modales — `layout/dialog`, `layout/drawer` (vía `ModalBase`), `overlays/window` (borra su trampa),
  `overlays/command-palette`, `overlays/json-dialog`, `overlays/semantic-search`, `overlays/pdf-viewer`,
  `feedback/confirm-modal`, `isp/confirm-delete`, `isp/modal-verificacion`, `diagrams/lightbox`,
  `diagrams/diagram-lightbox`; no modales (pila sin inert) — `actions/dropdown`, `actions/context-menu`,
  `actions/speed-dial`, `feedback/popconfirm`, `feedback/palette-selector`, `navigation/mega-menu`, `forms/select`,
  `forms/combobox`, `forms/date-picker` y `forms/utils/picker-element` (date-input, time-input…), `forms/color-picker`,
  `forms/mention`.

### HOW-6. Eventos tipados

- `static events = { 'iswc-change': {} as { value: string } }` en la clase. `emit` del molde se tipa con el mapa:
  `this.emit<K extends keyof Ev>(k: K, detail: Ev[K])`, y un `declare global { interface HTMLElementEventMap … }` por
  componente en su `schemas/<tag>.schemas.ts` (un tipo por línea).
- La ficha `.json` gana `"events": [{ "name": "iswc-change", "detail": "{ value: string }", "cancelable": false }]`
  generado por el build desde `static events` (no a mano) y el `.md` una tabla «Eventos». El auditor de `anatomy`
  (`tests/gobernanza/contrato-anatomia.test.ts`) se extiende: todo `emit('iswc-…')` del código está en `static events` y
  viceversa. De ahí salen también `vscode.html-custom-data.json` y `web-types.json` (P2).

### HOW-7. Accesibilidad

Lista por familia (reglas que cumple Web Awesome y que el guardián estático verifica en las plantillas `html```/
`TEMPLATE`):

| Familia | Reglas |
|---|---|
| Botón | elemento `button` nativo o `role=button` + `tabindex=0` + Enter/Espacio; `aria-pressed` en toggles; `aria-busy` en `loading`; nombre accesible (texto, `label` o `aria-label` por `t()`) en botones de solo icono |
| Campo | `<label for>` o `aria-labelledby`; `aria-describedby` a ayuda y error; `aria-invalid` solo con `user-invalid`; `aria-required`; el control nativo recibe el foco (`delegatesFocus`) |
| Lista / menú / listbox | `role=listbox|menu` + hijos `option|menuitem*`; `aria-activedescendant` o foco itinerante; `aria-selected`/`aria-checked`; flechas, Inicio/Fin, escritura anticipada; `aria-expanded` + `aria-controls` en el disparador (`combobox`) |
| Diálogo | `role=dialog|alertdialog`, `aria-modal=true`, `aria-labelledby`; trampa, `inert`, Escape, restauración de foco (HOW-5) |
| Pestañas | `tablist`/`tab`/`tabpanel`; `aria-selected`, `aria-controls`, `aria-labelledby`; flechas y activación manual/automática |
| Árbol | `tree`/`treeitem`/`group`; `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset`; flechas izquierda/derecha |
| Tabla / grid | `table` nativa o `grid`/`row`/`gridcell`/`columnheader`; `aria-sort`; `aria-rowcount` en virtualizadas; navegación por celdas |
| Vivo | `role=status|alert` con `aria-live` coherente; un anunciador único para mensajes efímeros |

Guardianes:

- **a11y-patrones** (nuevo, estático, en `tests/gobernanza/`): por cada componente lee sus plantillas y comprueba roles
  permitidos, pares obligatorios (`role=tab` ⇒ `aria-selected`; `role=combobox` ⇒ `aria-expanded` + `aria-controls`;
  `role=dialog` ⇒ `aria-labelledby` o `aria-label`), y que ningún `aria-label` sea literal en español (debe ser `t()`).
- **Navegador con axe-core: no disponible.** `axe-core` no está en `node_modules` y no se instala sin tu visto bueno
  (decisión D6). Mientras tanto, un test de navegador en Edge headless recorre teclado en dialog/select/tab-group/tree.

### HOW-8. Guardianes y presupuestos nuevos

- **reactivo** (nuevo, en `tests/gobernanza/`): (1) ningún componente nuevo o migrado escribe reflejo a mano
  (`set x(v) { …Attribute… }`) — lista de pendientes que solo puede bajar, como `typecheckBaseline`; (2) todo
  `forms/*` que declare `formAssociated` extiende `IswcFormControl`; (3) ningún texto de interfaz literal en plantillas
  (pasa por `t()`), con lista de pendientes decreciente; (4) `@prop` no se combina con `static observed` del mismo nombre.
- `tests/gobernanza/molde-iswc-element.test.ts`: `IswcReactive` y `IswcFormControl` entran en `MOLDE`.
- `tests/gobernanza/sin-codigo-muerto.test.ts`: se quitan las excepciones de `form-control-mixin` y `element-base`.
- `tests/navegador/carga.test.ts`: tope «unión base de componentes ≤ 14 500 B br» (HOW-1) y `button` sigue ≤ 2 KB.
- Los exhaustivos de forms (`tests/_shared/exhaustivo-forms.ts`) son **estáticos**: leen `static observed`,
  `TEMPLATE.innerHTML`, `setCustomState(this.#x, 'y')` y `emit(this, 'iswc-…')`. Se amplían para leer `@prop`,
  plantillas `html```, `this.estado('y')` y `static events` **en el mismo lote** en que migra cada componente.

### HOW-9. Plan de migración por lotes

Igual que F2: un lote = una carpeta (o media), codemod + revisión a mano, gate parcial
`deno task test -- --sin-cooldown --solo=<carpeta>` en verde antes del siguiente; gate completo al cierre de cada hito.

| Lote | Alcance | Codemod | A mano |
|---|---|---|---|
| 0 | core: `iswc-reactive`, `iswc-form-control`, `localize`, pila en `position`; `PropsElement` sobre `IswcReactive`; `dropdown` de `@attr*` a `@prop` | — | todo; tests unitarios y de navegador |
| 1 | `forms/` con `form-associated` (13) + `button`, `copy-button`, `btn-ref`, `code`, `app-shell`, `login-dropdown`, `session-menu`, `app-nav` | helpers → métodos de `IswcFormControl` (`setCustomState(this.#internals, 'x', v)` → `this.estado('x', v)`; `setFormValue` → el molde; `attachFormInternals` fuera); getters/setters de una línea → `@prop` | `validar()`, chrome, `render()` de `input`/`textarea`/`select`/`combobox`/`slider`/`rating` |
| 2 | resto de `forms/` (17: date-*, time-*, pin-input, dropzone, file-input, signature, rte, doc-editor…) | setters → `@prop`; `resolveLocale` → `localize` | `t()` y `formato()`; los date-* se migran por la fábrica `date-field-element` |
| 3 | `overlays/`, `layout/` (ModalBase), `feedback/` | setters → `@prop` | pila de modales, textos, `render()` de `toast-item`/`empty-state` |
| 4 | `navigation/`, `actions/`, `media/`, `files/` | setters → `@prop` | listas (`pagination`, `tab-group`, `tree`) a `html``` con `repetir()` |
| 5 | `data/`, `isp/`, `helpers/`, `code/` | setters → `@prop` | textos de `ag-grid`/`spreadsheet`/`isp` a diccionario |
| 6 | `diagrams/`, `charts/`, `data-viz/` | solo setters → `@prop` | nada de `render()`: siguen con su motor SVG |
| 7 | docs y skills | — | `specs/componentes.md`, `build-component`, `document-component`, `iswc-foundation`, `lessons.md`, `adr.md` |

El codemod nuevo (`scripts/codemods/reactivo.mjs`, con mapa JSON por lote como `aplanar.mjs`) hace solo lo mecánico y
verificable: (1) pares `get x() { return this.hasAttribute('x'); }` / `set x(v) { this.toggleAttribute('x', !!v); }` →
`@prop({ type: 'bool' }) accessor x = false;`; (2) `getAttribute('x') ?? ''` + `setStringAttr`/`setOptionalAttr` →
`@prop() accessor x = '';` (con `attr` si el nombre difiere, p. ej. `prefixText`/`prefix`); (3) `getNumberAttr` →
`type: 'num'`; (4) `lista.includes(v) ? v : def` → `enum`; (5) quitar del `static observed` lo que pasó a `@prop`;
(6) helpers de `form-associated` → métodos de `IswcFormControl`. **Va a mano**: setters con efectos (reescriben otro
atributo, normalizan, llaman a `#update`), los `render()`, `validar()`, textos a `t()` y los overlays. Estimación:
el codemod cubre ~70 % de los 469 setters (los de una línea sin efectos); no verificado hasta correrlo en seco.

### HOW-10. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Tiempo de pintado**: hoy todo es síncrono; con `IswcReactive` un `el.value = x` pinta en la microtarea siguiente. Tests y consumidores que leen el shadow justo después verían el DOM viejo | `actualizarAhora()`; los tests migrados hacen `await el.actualizacionCompleta`; las propiedades que el consumidor lee (`value`, `validity`) se actualizan en el setter, no en el pintado. Decisión D2 |
| Doble repintado con `props-element` (su `pintar` síncrono + el planificador) | `PropsElement` no define `render()`: usa `actualizarAhora()` dentro de `#aplicar` y conserva «solo repinta si algo cambió» con su igualdad por contenido; un test cuenta pintados (1 por cambio) |
| Orden de `define` con `deps`: un `render()` que crea `<iswc-button>` antes de que esté definido | igual que hoy (el loader pide `deps` en el primer `connectedCallback`); el upgrade posterior es transparente; `@prop` + `upgradeProperties` cubren propiedades escritas antes |
| `observedAttributes` congelado en el `define` | `@prop` usa la misma cola que `materializarAtributos` (lección de `dropdown`) |
| API pública | atributos, eventos, slots, parts y nombres de estados no cambian; los exhaustivos estáticos lo verifican lote a lote |
| Tamaño del core | 13,2 KB br medidos, ≈ 14,5 KB estimados frente al tope de ~14 KB; tope nuevo explícito en `carga` |
| Exhaustivos estáticos rojos al cambiar la forma del código | se amplía `exhaustivo-forms.ts` en el mismo lote; nunca se saltan |
| Breaking al re-pinear (`element-base`, `form-associated`, `form-control-mixin`, `resolve-locale` desaparecen) | 0 usuarios en el repo y en los proyectos hermanos (grep); se documenta en `specs/cdn.md` como F9a |
| `typecheckBaseline` (1864) | los decoradores tipados bajan errores; el baseline solo puede bajar |

### HOW-11. Decisiones que necesitan tu visto bueno

| # | Pregunta cerrada | Recomendación |
|---|---|---|
| D1 | ¿`render()` con **(a) `html` etiquetado** o con (b) `template` + `vincular()`? | **(a)**: listas y estructura condicional, mismo modelo que Web Awesome, +730 B br frente a (b) |
| D2 | ¿Pintado **asíncrono coalescido** (microtarea, como Lit) o síncrono? | **Asíncrono** + `actualizarAhora()` + `actualizacionCompleta`; ráfaga de 1 000 escrituras: 0,7 ms frente a 11,6 ms (mínimos) |
| D3 | ¿Diccionarios no `es` en `src/core/i18n/<lang>.ts` (subcarpeta, carga a demanda) o fuera de `core`? | **`src/core/i18n/`**, con `es` incrustado en `localize.ts` |
| D4 | ¿Se borra `element-base.ts` (0 usuarios) en F8? | **Sí** |
| D5 | ¿Se acepta el tope «unión base de componentes ≤ 14 500 B br» en `carga`? | **Sí** (o 14 000 si eliges (b)) |
| D6 | ¿Se añade `axe-core` como dependencia **de desarrollo** para el test de navegador? | **Sí**, solo dev (cero runtime); si no, queda el guardián estático y el recorrido de teclado |
| D7 | ¿`lang` se resuelve también desde **ancestros** (`closest('[lang]')`), a diferencia de Web Awesome? | **Sí** (apps con secciones en otro idioma); coste: un `closest` por render memorizado por conexión |
| D8 | ¿Entran en F8 los P2 (autoloader por `MutationObserver`, `auto-size/sync/hover-bridge`, `animar()`, anunciador, `html-custom-data`/`web-types`)? | **No**: F8 cierra los P1; los P2 van a una F8b con su propio presupuesto |

### HOW-12. Decisiones resueltas (6-nov-2026)

Visto bueno del dueño del repo: **D1 (a)** `html` etiquetado; **D2** pintado agrupado por microtarea, con un ajuste: el
**primer pintado al conectar es síncrono** (en `connectedCallback`, sin microtarea) y las propiedades que lee el
consumidor (`value`, `validity`) se actualizan en el setter, no en el pintado; **D6** sí, `axe-core` solo como dependencia
de desarrollo; **D8** no: los P2 van a F8b. Decididas por el orquestador según la recomendación: **D3** sí
(`src/core/i18n/<lang>.ts`, `es` incrustado en `localize.ts`); **D4** sí, `element-base` se borra; **D5** sí, tope
«unión base de componentes ≤ 14 500 B br»; **D7** sí, `lang`/`dir` se resuelven también desde ancestros.

### HOW-13. F8b pendiente (P2, fuera de F8 por D8)

- Ranuras reactivas (`HasSlotController`): `static ranuras` + `ranura(nombre)` en `IswcReactive`. Se probó en el hito 1 y
  se sacó del core para respetar el tope D5 (cuesta ~150 B br); hasta F8b cada componente escucha su `slotchange`.
- `reemitir(e)` (`relayNativeEvent`).
- Popup: `auto-size`, `sync`, `hover-bridge` y flecha como opciones de `computePosition`.
- `animar(el, 'show' | 'hide' | 'pulse')` común y `pulse` al vetar un cierre.
- Anunciador vivo único (`anunciar(texto)`).
- Autoloader opcional por `MutationObserver` (`iswcLoader.observar()`) y `iswcLoader.listos(raiz)`.
- `vscode.html-custom-data.json` y `web-types.json` generados desde `@prop`, slots, parts y `static events`.
- Formatos `Intl.ListFormat`/`Intl.PluralRules` en `formato()` (se quitaron por el mismo tope; nadie los usaba).

Medida del hito 1 (7-nov-2026, `dist/cdn` tras build): unión «base de componentes» 14 476 B br (tope 14 500); cierre de
`iswc-button` 8 747 B br (antes 9 108) y de `iswc-input` 14 632 B br (antes 14 971), porque los decoradores `@attr*` de
`core/attrs.ts` salieron del cierre común.

Hito 2 (forms, 7-nov-2026): los 21 usuarios de `core/form-associated.ts` más `combobox` y `forms/utils/date-field-element`
pasan a `IswcFormControl` (o a `IswcReactive` los que solo usaban estados: `radio`, `app-shell`, `session-menu`,
`login-dropdown`, `app-nav`, `copy-button`, `inline-edit`; `button` y `code` quedan en `IswcReactive` con su
`formAssociated` propio porque la base les sumaría el evento `iswc-invalid` con otro `detail`); `form-associated.ts` se
borra. El chrome común (`chromeEtiqueta`/`chromeAyuda`) se quitó de `IswcFormControl`: ningún control lo usa todavía
(ninguno pintó su DOM con `render()` en este lote) y costaba bytes del tope D5; entra a F8b junto con el paso de
`input`/`textarea` a `render()`. Cambios de comportamiento admitidos (API pública igual): `aria-invalid` del control
nativo solo tras interactuar, `aria-required` nuevo, la burbuja de validación se ancla al host salvo en
`input`/`textarea`, `mention` valida `required`, `setCustomValidity` persiste hasta limpiarlo. Pendiente: `file-input`
(no usaba `form-associated`) sigue fuera de `IswcFormControl` (R2, 1 pendiente) e `inline-edit` nunca fue
form-associated (decidir en F8b). Unión base tras el lote: 14 244 B br.

Cierre de bytes (7-nov-2026, criterio del dueño: los cierres de `iswc-button` e `iswc-input` no pesan más que antes de
F8). La plantilla `html` sale de `core/iswc-reactive.ts` a `core/plantilla.ts` (se registra como pintor al importarse;
una clase que no pinta con `render()` no la carga). `iswc-button` vuelve al molde `IswcElement` con sus `internals` y
estados propios (como antes de F8) y pide `core/localize` por `import()` solo si el idioma heredado no es español.
`iswc-input` pide `iswc-button` e `iswc-check-icon-button` solo si usa `clearable` o `password-toggle` (al loader si
está, si no por `import()`). Medido tras build: cierre de button 8 790 B br (antes de F8 9 108), de input 13 181 B br
(antes 14 971), unión base (con `plantilla`) 14 366 B br; los dos topes por cierre quedan en
`tests/navegador/carga.test.ts`.

Hito 5 (eventos tipados, 7-nov-2026). Variante de cero bytes en runtime: cada componente escribe sus eventos en un tipo
de una línea en `schemas/<tag>.schemas.ts` (`export type CheckboxEventos = IswcFormControlEventos & { 'iswc-change': … };`)
y lo enlaza en la clase con `declare static events: CheckboxEventos;` (un campo `declare` no se emite: el cierre no
cambia ni un byte). Los que heredan suman el tipo de la base (`DialogEventos = ModalBaseEventos`; los de forms suman
`IswcFormControlEventos` de `core/schemas/iswc-form-control.schemas.ts`, el `iswc-invalid` del molde). No se declara
`HTMLElementEventMap` global: `iswc-change` lleva otro `detail` en cada componente y la fusión de interfaces lo
rechaza (TS2717); queda para F8b con `web-types.json`. El tipado de `emit` del molde con el mapa queda fuera: su
firma es contrato de D4 (`molde-iswc-element` M5) y cambiarla toca la API pública. `scripts/sondas/eventos.ts` escribe desde la fuente el `"events"` de cada ficha `.json` (antes de
`sections`, en `RAIZ_PROPS` del validador y en `ComponentJsonSchema`) y la tabla «Eventos» del `.md` (bloque marcado,
sustituye la tabla vieja de bubbles/composed). Guardián `tests/gobernanza/eventos.test.ts`: E1 todo `iswc-*` emitido está
declarado y todo lo declarado se emite, por archivo con trinquete en `eventos-pendientes.json`; E2 fichas al día con la
sonda. Migrados: `forms/`, `feedback/`, `overlays/`, `actions/`, `layout/dialog`, `layout/drawer` (y su base
`layout/utils/modal-base`); 53 fichas. Pendientes iniciales: 270 en 97 archivos (resto de carpetas).

Hito 6 (accesibilidad estática, 7-nov-2026). Guardián `tests/gobernanza/a11y-patrones.test.ts` sobre `TEMPLATE.innerHTML`,
`html```, `setAttribute('role' | 'aria-*')` y `.role =`: A1 roles de ARIA 1.2; A2 pares (`tab` ⇒ `aria-selected`,
`combobox` ⇒ `aria-expanded` + `aria-controls`, `dialog`/`alertdialog` ⇒ nombre + `aria-modal`, `treeitem` con `group`
⇒ `aria-expanded`), valiendo lo que pone el código del archivo o de su clase base; A3 padre requerido (`option`,
`menuitem*`, `treeitem`); A4 `aria-*` existentes y admitidos por el rol, y sin nombre en roles que lo prohíben.
Trinquete en `a11y-patrones-pendientes.json`: 6 en 5 archivos (`option` como fragmento sin `listbox`, `popover`,
`loading-overlay`, dos diálogos de `ag-grid`/`preview-controls` sin `aria-modal`). Arreglados en `a11y-axe`: `select` y
`combobox` ocultan las opciones fuente en un `div hidden` (axe no ve el `display: none` de un `<slot>`), `iswc-tab` es el
único enfocable (foco itinerante en el host, el `part="base"` deja de ser `<button>`), todo `iswc-tree-item` lleva
`role="treeitem"`, y `speed-dial` pinta su `role="menu"`. Queda `dialogo: color-contrast`: la muestra no carga el tema y
`--iswc-bg` sin definir deja la caja transparente; pide color de respaldo en el tema o cargar el tema en la página.
