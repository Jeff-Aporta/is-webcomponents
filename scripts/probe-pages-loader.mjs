// Scratch: buscar host-base en icon bundle y otros ISP modules
import fs from 'node:fs';
const files = [
  'dist/cdn/media/icon.min.js',
  'dist/previews/media/icon.preview.min.js',
];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  console.log(`=== ${f} ===`);
  const matches = src.match(/.{0,30}host-base.{0,80}/g) || [];
  matches.slice(0, 5).forEach(m => console.log('  ', m));
  console.log('  ---');
}
