# iswc-audit · motor auditor del kit iswc

Plugin auditor disciplinado, especializado en testear y probar las
**iswc apps** (galería de Web Components basada en JSON). Recorre
**todos** los componentes del catálogo, ejecuta pruebas de
**consistencia JSON ↔ componente**, valida **estructuras complejas** y
verifica con **Stagehand** que cada demo se monta y reacciona en un
navegador real.

Diseñado para responder a una necesidad concreta: cuando un kit crece a
150+ componentes, ningún humano puede testearlos uno a uno cada vez que
cambia un `is-*`. El motor es **disciplinado, reproducible y
explicable**: cada hallazgo cita archivo, sección, bloque y, cuando
aplica, número de línea.

---

## TL;DR

```bash
# Auditoría rápida: solo JSON, sin browser, en menos de 1 segundo
npm run audit -- --solo-json

# Auditoría completa: con Stagehead contra el dev server
npm run audit:stagehand

# Solo un tag puntual
npm run audit:tag -- is-button

# Solo la categoría data-viz
npm run audit:category -- data-viz

# Generar reporte JSON y Markdown
npm run audit:json -- --solo-json
npm run audit:md -- --solo-json
```

---

## Qué audita

El motor aplica **cinco familias de pruebas** sobre cada componente del
catálogo. Cada hallazgo se categoriza con severidad (`fatal`, `error`,
`warn`, `info`) y se filtra en el reporte.

### 1. Esquema del JSON (json-schema)

Valida que la definición cumple con `is-preview/v1`. Detecta:

- falta de `$schema`
- `tag` faltante o no-string
- `sections[]` faltante
- `block.kind` desconocido
- bloques `demo` sin `html`, `code` sin texto, `table` sin `rows`
- controles sin `prop` o `label`, `select` sin `options`
- campos no documentados (sirve para que el motor avise cuando se
  agrega un campo nuevo al JSON sin actualizar el validador)

### 2. Contenido del JSON (json-contenido, json-complejidad)

- **Complejidad**: cualquier demo de `is-bar-chart`, `is-line-chart`,
  `is-flowchart`, `is-data-grid`, `is-kanban`, `is-pivot-table`,
  `is-tree-view` y compañía **debe** pasar su payload por
  `<script type="application/json">` dentro del host. Sin él, el demo es
  estático y no se está aprovechando la API real.
- `<script>` ejecutable dentro de un bloque `demo` → debe ser un behavior.
- Demasiados tags distintos en un solo demo (síntoma de mezcla).
- `<style>` dentro de un bloque `html` → usar el campo `styles` raíz.
- Bloques `code` con placeholders sin expandir (TODO, FIXME, ...).
- Tablas con `rows` que no son arrays.

### 3. Consistencia componente ↔ JSON (consistencia)

- El módulo JS/TS **debe** registrar el custom element con el tag
  declarado (sea con `customElements.define`, `defineElement`,
  `defineTypedChart`, `definePickerInput` o `defineDateField`).
- El módulo **debe** usar guard idempotente, o el motor lo exonera si
  usa una de las fábricas.
- Cada `control` del JSON que apunte a un atributo (`attr:foo`) debe
  estar en el `observedAttributes` del módulo, o el playground no
  será reactivo.
- Si el componente hereda de `ElementBase`, `ModalBase`,
  `DiagramElementBase`, `BreakpointHost`, `withStyleAttrs`,
  `PickerElement` o `DateFieldElement`, los warnings se atenúan (la base
  aporta el callback).

### 4. Runtime hygiene (runtime)

- `document/window.addEventListener` sin `removeEventListener` simétrico.
- `setInterval` sin `clearInterval`.
- `MutationObserver`, `ResizeObserver`, `IntersectionObserver` sin
  `.disconnect()`.
- `observedAttributes` declarado pero sin `attributeChangedCallback` (o
  viceversa). Esto es **el bug más común del playground**: cambiar un
  atributo desde el panel de controles no produce ningún cambio visual.
- `attachShadow` con `.css` hermano pero sin `adoptCss()`. O al revés.
- `customElements.define` directo sin guard (las fábricas ya exoneran).

### 5. Inspección con Stagehand (demo-html, runtime, playground)

Si hay un dev server disponible y la opción no es `--solo-json`, el
motor crea una sesión de **Stagehand** (con fallback a Playwright puro)
y por cada tag:

- navega a la URL del preview
- espera que `<is-preview-component>` se monte
- espera que el custom element del tag se defina
- cuenta `<is-demo>` y `<is-preview-controls>` renderizados
- captura errores de consola y `pageerror`
- emite hallazgos si la página no contiene el tag o si faltan demos

---

## Estructura

```
src/utils/health/
├── motor/                # motor puro (sin browser)
│   ├── types.ts          # tipos compartidos
│   ├── catalog.ts        # enumera manifest + catalog + pages
│   ├── validators/
│   │   ├── json-schema.ts      # is-preview/v1 validator
│   │   ├── json-contenido.ts   # complejidad / HTML inline / etc
│   │   ├── consistency.ts      # JSON ↔ módulo
│   │   └── runtime.ts          # listeners, observers, callbacks
│   ├── auditor.ts        # orquestador (auditarComponente, auditarCatalogo)
│   ├── reporter.ts       # JSON + Markdown + consola
│   ├── cli.ts            # runner CLI con flags
│   └── ...
├── engine/               # capa browser
│   ├── stagehand.ts      # navegación con Stagehand/Playwright
│   └── cargar.ts         # carga JSONs de disco con caché
├── audit/                # tests del motor
│   └── motor.test.ts
├── motor/cli.ts          # entry del CLI
└── README.md             # este archivo
```

El motor es **tree-shakable**: si importás solo los validadores
(`./motor/validators/json-schema`) no arrastrás Stagehand ni
Playwright. El CLI está separado en `motor/cli.ts` para que el bundle
del editor o de la galería no lo incluya.

---

## Uso programático

```ts
import { crearEstado, auditarCatalogo } from './src/utils/health/motor/auditor.js';
import { aJson, aMarkdown, imprimirConsola } from './src/utils/health/motor/reporter.js';

// Modo JSON (sin browser, ~100ms para el catálogo completo)
const estado = crearEstado('/path/a/is-webcomponents', {
  solo: ['is-button', 'is-button-group'],
  soloJson: true,
});
const reporte = await auditarCatalogo(estado);
imprimirConsola(reporte);
console.log('JSON:', JSON.stringify(aJson(reporte), null, 2));
console.log('Markdown:', aMarkdown(reporte));

// Modo completo (con Stagehand): requiere dev server en :8391 (o el
// que se indique con --puerto). El motor crea la sesión, navega, y
// agrega hallazgos E2E a cada componente.
```

El resultado tiene esta forma:

```ts
interface ReporteAuditoria {
  motorVersion: string;
  inicio: string;
  fin: string;
  duracionMs: number;
  totalComponentes: number;
  conteo: { fatal: number; error: number; warn: number; info: number };
  componentes: ReporteComponente[];
  erroresMotor: Hallazgo[];
}
```

---

## Flags del CLI

```
--solo <tags>          Filtra por tag (coma-separado). Vacío = todos.
--categoria <cats>     Filtra por categoría (coma-separado).
--limite <n>           Limita el número de componentes auditados.
--puerto <n>           Puerto del dev server (default 8391).
--url-base <url>       URL del servidor de docs. Si no, intenta detectar.
--sin-e2e              Salta la inspección con Stagehand.
--solo-json            No requiere browser; solo valida JSON.
--salida-json <ruta>   Guarda el reporte JSON en este archivo.
--salida-md <ruta>     Guarda el reporte Markdown en este archivo.
--verbose              Imprime cada paso.
--no-fallar            No sale con código != 0 si hay hallazgos.
--help                 Muestra la ayuda.
```

### Exit codes

- `0` = sin hallazgos fatales ni errores
- `1` = hay hallazgos con severidad `fatal` o `error`
- `2` = error del motor (Stagehand no arranca, JSON no parsea, etc.)

---

## Extensión: agregar una nueva prueba

Las pruebas son funciones puras. Para agregar una:

1. Elegí una categoría existente o agregá una nueva en
   `motor/types.ts` (`CategoriaHallazgo`).
2. Implementá la prueba en `motor/validators/`. Debe exportar una
   función `(def, meta, rutaJson) => Hallazgo[]`.
3. Si la prueba es JSON-only, agregala en `auditarComponente` dentro de
   `auditor.ts` después de los otros validadores.
4. Si requiere browser, agregá un paso E2E en `engine/stagehand.ts`.
5. Escribí un test en `audit/motor.test.ts`.
6. Si agregás un nuevo campo al esquema, actualizá `RAIZ_PROPS` /
   `BLOQUE_PROPS` / `CONTROL_PROPS` en `json-schema.ts` y agregá un test
   que verifique que se acepta y que se rechaza lo desconocido.

---

## Por qué es disciplinado

- **Single source of truth**: el manifest.ts y el catalog.ts se leen
  en cada corrida. Si un componente no aparece, no se audita.
- **Best-effort con explicación**: las heurísticas que pueden tener
  falsos positivos emiten `warn` o `info`, nunca `error`. El reporte
  siempre dice **por qué** y **dónde**.
- **Reproducible**: el motor es determinista (no usa `Math.random()` ni
  tiempo). El mismo input produce el mismo output.
- **Tres modos**: `--solo-json` (rápido, sin browser), `--stagehand`
  (con browser), `auditor.py` (Python del motor general). El primero se
  ejecuta en CI; el segundo se corre antes de un PR que toca
  componentes; el tercero es el de la auditoría global.

---

## Limitaciones

- El parser de manifest.ts es regex-based (sin TypeScript compiler).
  Cubre 100% del manifest actual pero no tolera spreads, computed keys
  ni template literals con interpolación. Si en el futuro se agregan,
  migrar a `tsc --emitDeclarationOnly` o `@swc/core`.
- Las pruebas E2E abren UN browser por corrida. Para 185 componentes
  eso son ~185 navegaciones. Si la suite se vuelve lenta, partir por
  categoría (`--categoria data-viz`).
- El reporte Markdown es para revisión humana. Para CI, usar el JSON y
  un script que aplique reglas (`severidad == 'error' → fail`).

---

## Bugs reportados que el motor ayudó a encontrar

Esta es la lista de hallazgos reales que el motor produjo en la primera
corrida. Todos están documentados en el código con un comentario
`iswc-audit: …` o `2026-Q1 fix: …` y se arreglaron en este PR:

- **is-tree-view** (error): el demo no declaraba
  `<script type="application/json">` con el payload.
- **is-button** (warn): un bloque `html` con `<style>`; debería ir al
  campo `styles` raíz.
- **is-check-icon-button** (warn): control `variant` apuntaba a un
  atributo no declarado como observado.
- **is-speech**, **is-media-recorder** (error): `observedAttributes`
  declarado pero sin `attributeChangedCallback` — el playground no era
  reactivo.
- **is-theme-toggle**, **is-prefs-clear** (warn): atributos `dark` y
  `reload` no declarados como observados.
- **is-flex-layout**, **is-grid-layout** (error): mismo problema de
  `attributeChangedCallback` ausente.
- **is-split-panel** (warn): bloque `code` con placeholder sin
  expandir.
- **is-color-picker** (runtime, fix aplicado): el setter `value` no
  emitía `is-input`/`is-change`, así que el taller de Personalización
  no se enteraba de los cambios programáticos. **Este fue el bug que
  reportaba el usuario al decir que "theming no cambia los colores
  de la página"**.

Además, el motor confirmó que la convención del kit se cumple: todos
los charts, diagramas y data widgets complejos pasan su payload por
`<script type="application/json">` (excepto los tres casos
arriba).

---

## Próximos pasos

- [ ] Soporte para `is-ag-grid` (extensión comercial con API distinta).
- [ ] Comparar dos corridas y reportar diffs (regresiones).
- [ ] Snapshot del reporte por tag en `.audit/snapshots/<tag>.json`
  para que CI detecte nuevas regresiones.
- [ ] Filtros por hallazgo (ej. `--solo runtime`).
- [ ] Integración con el motor Python (`auditor.py`) para que el
  reporte JSON del motor local se sume al reporte global.
