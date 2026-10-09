// icon-email.test.ts — el HTML de íconos para correo (tk-icon-inline) se ve fuera de la app.
//   E1 la imagen apunta a la API de Iconify (sirve cualquier set), nunca a una ref mutable del repo.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { iconInlineHtmlEmail } from '../../../components/_shared/tk-icon-inline.ts';

Deno.test('icon-email: E1 img contra la API de Iconify, sin @main ni rutas del kit', () => {
  const html = iconInlineHtmlEmail('solar:sun-bold', { size: 20 });
  const src = html.match(/src="([^"]+)"/)?.[1];
  assertEquals(src, 'https://api.iconify.design/solar/sun-bold.svg');
  assert(/width="20"/.test(html) && !/@main|jsdelivr/.test(html), html);
});
