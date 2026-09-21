#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const FILE = 'src/components/isp/modal-verificacion.json';
let s = readFileSync(FILE, 'utf8');
// El archivo tiene los strings JSON-escaped. Pattern a reemplazar:
// "<is-button id=\"mvBtn\" color=\"brand\">\r\n            <is-icon slot=\"start\" icon=\"mdi:check\"></is-icon>\r\n            Verificar tercero\r\n          </is-button>\r\n          <is-modal-verificacion id=\"mvDemo\" entity=\"tercero\"></is-modal-verificacion>",
// → version mejorada con 3 botones (ok/warn/err) y 3 modals con datos realistas.
const old =
  '<is-button id=\\"mvBtn\\" color=\\"brand\\">\\r\\n' +
  '            <is-icon slot=\\"start\\" icon=\\"mdi:check\\"></is-icon>\\r\\n' +
  '            Verificar tercero\\r\\n' +
  '          </is-button>\\r\\n' +
  '          <is-modal-verificacion id=\\"mvDemo\\" entity=\\"tercero\\"></is-modal-verificacion>';
const replacement =
  '<div style=\\"display:flex;gap:.5rem;flex-wrap:wrap\\">\\r\\n' +
  '            <is-button id=\\"mvBtnOk\\" color=\\"brand\\">\\r\\n' +
  '              <is-icon slot=\\"start\\" icon=\\"mdi:check\\"></is-icon>\\r\\n' +
  '              Verificar tercero (caso OK)\\r\\n' +
  '            </is-button>\\r\\n' +
  '            <is-button id=\\"mvBtnWarn\\" color=\\"warning\\">\\r\\n' +
  '              <is-icon slot=\\"start\\" icon=\\"mdi:alert\\"></is-icon>\\r\\n' +
  '              Verificar con warnings\\r\\n' +
  '            </is-button>\\r\\n' +
  '            <is-button id=\\"mvBtnErr\\" color=\\"danger\\">\\r\\n' +
  '              <is-icon slot=\\"start\\" icon=\\"mdi:close-circle\\"></is-icon>\\r\\n' +
  '              Verificar con errores\\r\\n' +
  '            </is-button>\\r\\n' +
  '          </div>\\r\\n' +
  '          <is-modal-verificacion id=\\"mvDemoOk\\" entity=\\"tercero\\"></is-modal-verificacion>\\r\\n' +
  '          <is-modal-verificacion id=\\"mvDemoWarn\\" entity=\\"tercero\\"></is-modal-verificacion>\\r\\n' +
  '          <is-modal-verificacion id=\\"mvDemoErr\\" entity=\\"tercero\\"></is-modal-verificacion>\\r\\n' +
  '          <script type=\\"application/json\\" data-mv-scenarios>{\\r\\n' +
  '            \\"ok\\": {\\r\\n' +
  '              \\"entrie\\": \\"tercero\\",\\r\\n' +
  '              \\"record\\": { \\"nit\\": \\"900123456-7\\", \\"razonSocial\\": \\"InSoft S.A.\\" },\\r\\n' +
  '              \\"mensajes\\": [\\r\\n' +
  '                { \\"itdmensaje\\": \\"info\\",    \\"mensaje\\": \\"NIT valido y activo en DIAN.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"info\\",    \\"mensaje\\": \\"Razon social coincide con registro mercantil.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"success\\", \\"mensaje\\": \\"Verificacion satisfactoria.\\" }\\r\\n' +
  '              ]\\r\\n' +
  '            },\\r\\n' +
  '            \\"warn\\": {\\r\\n' +
  '              \\"entrie\\": \\"tercero\\",\\r\\n' +
  '              \\"record\\": { \\"nit\\": \\"900999999-9\\", \\"razonSocial\\": \\"Demo S.A.S.\\" },\\r\\n' +
  '              \\"mensajes\\": [\\r\\n' +
  '                { \\"itdmensaje\\": \\"info\\",    \\"mensaje\\": \\"NIT valido.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"warning\\", \\"mensaje\\": \\"Sin correo registrado: las notificaciones llegaran al admin.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"warning\\", \\"mensaje\\": \\"Actividad economica requiere clasificacion CIIU v4.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"info\\",    \\"mensaje\\": \\"Continuar y completar despues desde el perfil.\\" }\\r\\n' +
  '              ]\\r\\n' +
  '            },\\r\\n' +
  '            \\"err\\": {\\r\\n' +
  '              \\"entrie\\": \\"tercero\\",\\r\\n' +
  '              \\"record\\": { \\"nit\\": \\"800000000-0\\", \\"razonSocial\\": \\"Inactiva Ltda.\\" },\\r\\n' +
  '              \\"mensajes\\": [\\r\\n' +
  '                { \\"itdmensaje\\": \\"error\\",   \\"mensaje\\": \\"NIT no encontrado en el registro unico tributario.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"error\\",   \\"mensaje\\": \\"Razon social con estado inactiva desde 2021.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"warning\\", \\"mensaje\\": \\"Documentos de soporte obligatorios pendientes.\\" },\\r\\n' +
  '                { \\"itdmensaje\\": \\"info\\",    \\"mensaje\\": \\"No se puede continuar hasta corregir.\\" }\\r\\n' +
  '              ]\\r\\n' +
  '            }\\r\\n' +
  '          }</script>';
const idx = s.indexOf(old);
if (idx < 0) { console.log('OLD NOT FOUND'); process.exit(1); }
s = s.slice(0, idx) + replacement + s.slice(idx + old.length);
writeFileSync(FILE, s);
try { JSON.parse(s); console.log('OK + JSON valid'); }
catch (e) { console.log('INVALID:', e.message); }
