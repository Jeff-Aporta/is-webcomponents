/**
 * i18n/en.ts — términos del kit en inglés. `localize.ts` lo pide con `import()` la primera vez que un componente
 * resuelve un locale `en*`; registrarlo repinta los componentes vivos. Mismas claves que el diccionario `es`.
 */
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';

registrarTerminos('en', {
  aceptar: 'OK',
  algoSalioMal: 'Something went wrong',
  anterior: 'Previous',
  arrastraArchivos: 'Drop files here or click to browse',
  buscar: 'Search',
  campoObligatorio: 'Please fill out this field',
  cancelar: 'Cancel',
  cargando: 'Loading…',
  caracteres: (n, max) => (max ? `${n}/${max}` : String(n)),
  cerrar: 'Close',
  copiado: 'Copied',
  copiar: 'Copy',
  eliminar: 'Delete',
  hoy: 'Today',
  limpiar: 'Clear',
  listo: 'Done',
  mostrarContrasena: 'Show password',
  notificaciones: 'Notifications',
  ocultarContrasena: 'Hide password',
  pagina: (n, total) => `Page ${n} of ${total}`,
  seleccionar: 'Select',
  siguiente: 'Next',
  sinResultados: 'No results',
});
