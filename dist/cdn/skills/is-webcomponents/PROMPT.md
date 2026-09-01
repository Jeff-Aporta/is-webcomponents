# IS Web Components (Instrucciones para LLM)

Utiliza **IS Web Components** exclusivamente mediante **CDN** (o copia local vía `/is-webcomponents:local`).

**Nunca** utilices:

- npm
- npx
- Bun
- pnpm
- Yarn
- Vite
- Webpack
- Rollup
- gestores de paquetes
- instalaciones locales del kit vía registry
- copias parciales de componentes

El objetivo es consumir la librería exactamente como se publica en
`dist/cdn/`.

---

# Reglas generales

- Reutiliza siempre componentes existentes con prefijo `is-*`.
- No implementes componentes que ya existan.
- No reinventes componentes, atributos, propiedades, métodos, eventos, slots, variables CSS ni Custom Properties.
- Toda API utilizada debe existir en la documentación oficial.
- Antes de escribir código, verifica si la librería ya ofrece un componente adecuado.
- Si existen varios componentes similares, utiliza el más específico.
- Si un componente depende de otros componentes, reutiliza la composición existente; no la reimplementes.
- Utiliza siempre el sistema de iconos propio mediante `<is-icon icon="prefix:name">`.
- No utilices Iconify, FontAwesome, Material Icons ni otras librerías externas de iconos, salvo que el usuario lo solicite explícitamente.
- Configura el tema mediante `data-theme`.
- Configura la paleta mediante `data-palette`.
- La configuración declarativa debe realizarse mediante atributos `data-*` cuando el componente lo soporte.
- No mezcles mirrors CDN dentro de una misma página.
- Mantén la accesibilidad y el comportamiento documentado por cada componente.

---

# Herramientas (slash)

Cuando el usuario pida una de estas intenciones, sigue la skill de la herramienta:

| Comando | Skill | Uso |
| --- | --- | --- |
| `/is-webcomponents:build` | [tools/build.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/tools/build.md) | Fundar o extender apps con `is-*` |
| `/is-webcomponents:migrate` | [tools/migrate.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/tools/migrate.md) | Migrar un front (React/MUI/Svelte/…) a vanilla + `is-*` |
| `/is-webcomponents:local` | [tools/local.md](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/tools/local.md) | Vendorizar JS/CSS locales (preferido) y actualizar SHA |

Instalación de skills (preferir repo GitHub):

```
npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents
npx skills add Jeff-Aporta/is-webcomponents -s is-cdn-install
```

---

# Flujo obligatorio antes de generar código

Antes de utilizar cualquier componente debes seguir este flujo:

1. Leer la documentación de instalación.
2. Leer la guía general de IS Web Components.
3. Consultar el índice global (`LLM.md`).
4. Identificar la categoría adecuada.
5. Abrir el `LLM.md` de esa categoría.
6. Abrir la documentación del módulo correspondiente.
7. Confirmar la API del componente.
8. Solo entonces generar el código.

Nunca deduzcas la API únicamente por el nombre del componente.

Si una propiedad, atributo, evento, método o slot no aparece documentado, asume que no existe.

---

# Selección de componentes

Antes de implementar cualquier solución:

1. Busca un componente existente.
2. Busca un helper reutilizable.
3. Busca una utilidad compartida.
4. Busca un componente similar.
5. Solo si la documentación confirma que no existe una solución adecuada, implementa una nueva.

La librería contiene más de un centenar de componentes organizados por categorías.

Nunca asumas que un componente pertenece a una categoría únicamente por su nombre; consulta siempre el índice oficial.

---

# Reutilización

Antes de escribir cualquier implementación verifica si ya existe:

- un componente
- un helper
- un módulo compartido
- una utilidad
- un motor de gráficos
- un helper para formularios
- un helper para overlays
- un helper de iconos
- un helper de fechas
- un helper de posicionamiento
- un helper de observadores

Nunca dupliques funcionalidades existentes.

---

# CDN recomendado

Utiliza siempre **jsDelivr** con un SHA fijo (pinned commit) para garantizar versiones inmutables.

Sustituye `{{SHA}}` por el tip de `main` (referencia: `ca31ad04be5bba79c8ef4652b7540058169ca891`).

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@{{SHA}}/dist/cdn/core/loader.min.js"></script>
<script type="module">
  const L = globalThis.ISWebComponentsLoader;
  await L.loadCSSBase();
  await L.loadCSSPalettesDefault();
  await L.load("is-button");
</script>
```

Utiliza un único origen CDN durante toda la aplicación.

Si la app usa copia local, ver `/is-webcomponents:local` (local primero en el fallback).

---

# Boot con fallback (opcional)

Si deseas tolerancia a fallos del CDN puedes utilizar un cargador similar al siguiente.

```html
<script type="module">
const MIRRORS=[
"https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@{{SHA}}/dist/cdn",
"https://cdn.statically.io/gh/Jeff-Aporta/is-webcomponents/{{SHA}}/dist/cdn",
"https://jeff-aporta.github.io/is-webcomponents/dist/cdn"
];

const css=u=>new Promise((ok,err)=>{
 const e=document.createElement("link");
 e.rel="stylesheet";
 e.href=u;
 e.onload=ok;
 e.onerror=err;
 document.head.append(e);
});

for(const base of MIRRORS){
 try{
  await import(`${base}/core/loader.min.js`);
  const L = globalThis.ISWebComponentsLoader;
  await L.loadCSSBase();
  await L.loadCSSPalettesDefault();
  await L.load("is-button");
  break;
 }catch{}
}
</script>
```

Los snippets CDN únicamente deben usar `loader.min.js` + `L.load(tags…)`.
No hay `all.min.js` ni `category.*.min.js` publicados.

No cargues manualmente los CSS individuales de cada componente; estos se resuelven automáticamente mediante `import.meta.url`.

---

# Repositorio oficial

https://github.com/Jeff-Aporta/is-webcomponents

El repositorio contiene:

- código fuente
- documentación
- inventario de componentes
- manifiesto
- previews
- helpers compartidos
- convenciones
- pruebas
- skills (`src/skills/`)

Cuando exista una discrepancia entre una respuesta del LLM y el repositorio, prevalece siempre el repositorio.

---

# Documentación (leer en este orden)

Preferir enlaces **GitHub** (mejor instalación de skills). Raw como secundario (`text/plain`).

## 1. Instalación CDN

https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-cdn-install/SKILL.md

## 2. Guía general

https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/SKILL.md

## 3. Prompt completo (este archivo)

https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/skills/is-webcomponents/PROMPT.md

## 4. Guía CDN publicada (jsDelivr)

https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/skills/is-cdn-install/SKILL.md

## 5. Índice global

https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md

## 6. LLM.md de la categoría correspondiente

Consultar el índice global para localizar la categoría correcta.

## 7. Documentación específica del componente

Leer siempre el archivo `.md` del componente antes de utilizarlo.

## 8. Herramientas

- https://github.com/Jeff-Aporta/is-webcomponents/tree/main/src/skills/is-webcomponents/tools

---

# Qué hacer

- Buscar un componente existente antes de escribir código.
- Buscar helpers reutilizables.
- Buscar utilidades compartidas.
- Mantener compatibilidad con Shadow DOM.
- Mantener accesibilidad.
- Mantener compatibilidad con formularios.
- Reutilizar componentes existentes.
- Reutilizar motores internos.
- Reutilizar helpers internos.
- Mantener la estructura pública de cada componente.
- Utilizar `connectedCallback()` y `disconnectedCallback()` correctamente para listeners y observers.
- Mantener separados los conceptos `color` y `variant`.
- Escalar componentes mediante `font-size`; no implementar un atributo `size`.
- Utilizar únicamente `<is-icon>` para iconografía.
- Corregir la causa raíz de un problema en lugar de crear soluciones duplicadas.
- Si modificas un componente compartido, revisa primero sus consumidores.

---

# Qué no hacer

Nunca:

- inventar componentes;
- inventar atributos;
- inventar propiedades;
- inventar eventos;
- inventar métodos;
- inventar slots;
- inventar variables CSS;
- inventar Custom Properties;
- duplicar componentes existentes;
- duplicar helpers;
- duplicar lógica ya implementada;
- duplicar iconos;
- utilizar Iconify;
- utilizar `<iconify-icon>`;
- utilizar APIs externas de iconos;
- asumir la ubicación de un componente;
- asumir rutas CDN;
- crear variantes no documentadas;
- modificar el comportamiento documentado;
- romper compatibilidad con Shadow DOM;
- romper compatibilidad con formularios;
- utilizar atributos `size`;
- mezclar conceptos de `color` y `variant`.

---

# Principios de generación

Cuando el usuario solicite una interfaz:

1. Identifica los componentes necesarios.
2. Consulta su documentación.
3. Reutiliza únicamente APIs documentadas.
4. Genera código utilizando componentes `is-*`.
5. No sustituyas componentes existentes por HTML nativo salvo que el usuario lo solicite.
6. Si la documentación ofrece una solución, úsala.
7. Si la documentación no documenta una API, no la inventes.
8. Si existe una duda, indica explícitamente que la documentación no proporciona esa información en lugar de asumirla.

---

# Regla de oro

La documentación oficial es la única fuente de verdad.

Si la documentación contradice una inferencia, prevalece la documentación.

Si una API no aparece documentada, no debe utilizarse.

Si existe un componente que resuelve el problema, debe reutilizarse.

Nunca generes una implementación alternativa sin haber confirmado previamente que la librería no ofrece una solución equivalente.
