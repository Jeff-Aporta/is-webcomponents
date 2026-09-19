// Scratch: encontrar dónde se define `kt` (la base usada por home.min.js)
import fs from 'node:fs';
const src = fs.readFileSync('dist/pages/home.min.js', 'utf8');

// Buscar la declaración/inicialización de kt
const re = /(?:const|let|var)\s+kt\s*=\s*([^;,\n]+)/g;
let m;
while ((m = re.exec(src)) !== null) {
  console.log('declaration:', m[0]);
}

// Buscar todas las apariciones de kt
const ktRe = /\bkt\b/g;
const occurrences = [];
while ((m = ktRe.exec(src)) !== null) {
  const start = Math.max(0, m.index - 60);
  const end = Math.min(src.length, m.index + 60);
  occurrences.push(src.slice(start, end).replace(/\n/g, '\\n'));
}
console.log('\nfirst 8 occurrences of kt:');
occurrences.slice(0, 8).forEach((o, i) => console.log(`  [${i}] ...${o}...`));
