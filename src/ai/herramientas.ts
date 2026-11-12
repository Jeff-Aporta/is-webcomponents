// @contexto INDICE.md · src/ai/README.md
/**
 * herramientas.ts — catálogo de la IA en el navegador (runonweb), sin DOM. Cada herramienta declara qué recibe y qué
 * opciones tiene; `<iswc-ai-tool>` pinta lo demás. Su motor es `motores/<id>.ts`, un bundle aparte que solo se baja al usarla.
 */
import type { Herramienta, Opciones } from './schemas/ai.schemas.js';

/**
 * Modelo de embeddings estándar del kit. El que trae runonweb por defecto es inglés y en español devuelve ruido; este es
 * multilingüe. Va en WASM porque baja la versión q8, la misma con la que se hornean los corpus.
 */
export const MODELO_LOCAL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

const IDIOMAS = { es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán', pt: 'Portugués', it: 'Italiano' };

export const HERRAMIENTAS: Herramienta[] = [
  { id: 'ocr', nombre: 'Leer texto de una imagen', descripcion: 'Saca el texto de una foto, un recibo o una captura.', icono: 'mdi:text-recognition', mb: 31, entrada: 'imagen', opciones: [{ id: 'tamano', rotulo: 'Precisión', defecto: 'small', carga: true, valores: { tiny: 'Rápida', small: 'Normal', medium: 'Alta' }, pesos: { tiny: 6, small: 31, medium: 139 } }] },
  { id: 'remove-bg', nombre: 'Quitar el fondo', descripcion: 'Devuelve la imagen como PNG transparente.', icono: 'mdi:image-remove-outline', mb: 219, entrada: 'imagen', aviso: 'Corre en el procesador: puede tardar más de 3 minutos y la pestaña se congela mientras tanto.' },
  { id: 'stt', nombre: 'Transcribir audio', descripcion: 'Convierte una nota de voz o un audio en texto.', icono: 'mdi:microphone-message', mb: 152, entrada: 'audio', opciones: [{ id: 'idioma', rotulo: 'Idioma', defecto: 'es', valores: IDIOMAS }] },
  { id: 'caption', nombre: 'Describir una imagen', descripcion: 'Escribe una descripción lista para usar como texto alternativo.', icono: 'mdi:image-text', mb: 548, entrada: 'imagen', aviso: 'Licencia LFM 1.0: libre para empresas con ingresos menores a 10 millones de dólares al año.', opciones: [{ id: 'detalle', rotulo: 'Detalle', defecto: 'short', valores: { short: 'Breve', detailed: 'Media', more: 'Completa' } }, { id: 'idioma', rotulo: 'Idioma', defecto: 'es', valores: { es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán', pt: 'Portugués' } }] },
  { id: 'depth', nombre: 'Mapa de profundidad', descripcion: 'Calcula qué está cerca y qué está lejos en una foto.', icono: 'mdi:layers-triple-outline', mb: 50, entrada: 'imagen' },
  { id: 'detect', nombre: 'Detectar objetos', descripcion: 'Marca 80 tipos de objetos cotidianos en una imagen.', icono: 'mdi:image-search-outline', mb: 29, entrada: 'imagen' },
  { id: 'embed', modelo: MODELO_LOCAL, nombre: 'Comparar significados', descripcion: 'Compara cada línea con la primera, aunque no compartan palabras.', icono: 'mdi:vector-link', mb: 135, entrada: 'texto', ejemplo: 'Quiero pedir vacaciones\nSolicitud de días libres\nFactura de la luz\nMe voy de descanso en diciembre' },
  { id: 'classify', nombre: 'Clasificar texto', descripcion: 'Elige la categoría que mejor describe un texto.', icono: 'mdi:tag-text-outline', mb: 750, entrada: 'texto', ejemplo: 'Los zapatos llegaron dos semanas tarde y en la talla equivocada.', opciones: [{ id: 'pregunta', rotulo: 'Pregunta', defecto: '¿Qué equipo debe atenderlo?' }, { id: 'categorias', rotulo: 'Categorías', defecto: 'devoluciones, envíos, facturación' }] },
  { id: 'translate', nombre: 'Traducir', descripcion: 'Traduce sin enviar el texto a ningún servidor.', icono: 'mdi:translate', mb: 37, entrada: 'texto', ejemplo: 'La reunión de mañana pasa a las diez.', opciones: [{ id: 'de', rotulo: 'De', defecto: 'es', carga: true, valores: IDIOMAS }, { id: 'a', rotulo: 'A', defecto: 'en', carga: true, valores: IDIOMAS }] },
  { id: 'clean', nombre: 'Pulir un dictado', descripcion: 'Convierte un dictado en texto escrito. Funciona mejor en inglés.', icono: 'mdi:text-box-check-outline', mb: 356, entrada: 'texto', ejemplo: 'so um i need to like send the report by uh friday', opciones: [{ id: 'estilo', rotulo: 'Estilo', defecto: 'semi-formal', valores: { casual: 'Casual', 'semi-casual': 'Cercano', 'semi-formal': 'Profesional', formal: 'Formal' } }, { id: 'forma', rotulo: 'Forma', defecto: 'prose', valores: { prose: 'Párrafos', lists: 'Listas' } }] },
  { id: 'emoji', nombre: 'Texto a emojis', descripcion: 'Resume una frase en emojis.', icono: 'mdi:emoticon-outline', mb: 41, entrada: 'texto', ejemplo: 'Me encanta la pizza y mi perro' },
  { id: 'tts', nombre: 'Leer en voz alta', descripcion: 'Genera una voz natural a partir del texto.', icono: 'mdi:account-voice', mb: 263, entrada: 'texto', ejemplo: 'Hola, esta voz se generó en tu navegador.', opciones: [{ id: 'voz', rotulo: 'Voz', defecto: 'st_f1', valores: { st_f1: 'Femenina', st_m1: 'Masculina' } }, { id: 'idioma', rotulo: 'Idioma', defecto: 'es', valores: { es: 'Español', en: 'Inglés', fr: 'Francés', pt: 'Portugués', ko: 'Coreano' } }] },
  { id: 'image', nombre: 'Generar una imagen', descripcion: 'Crea una imagen a partir de una frase. Escríbela en inglés.', icono: 'mdi:image-auto-adjust', mb: 3400, entrada: 'texto', gpu: true, ejemplo: 'A bonsai tree in a ceramic studio' },
];

export const herramienta = (id: string): Herramienta => HERRAMIENTAS.find((h) => h.id === id) ?? HERRAMIENTAS[0]!;

/** MB que baja la herramienta con estas opciones (ya descargados no se repiten). */
export const mbDe = (h: Herramienta, o: Opciones = {}): number => h.opciones?.map((x) => x.pesos?.[o[x.id] ?? x.defecto]).find(Boolean) ?? h.mb;

export const pesoDe = (mb: number): string => mb < 1000 ? `${mb} MB` : `${(mb / 1000).toFixed(1).replace('.', ',')} GB`;
