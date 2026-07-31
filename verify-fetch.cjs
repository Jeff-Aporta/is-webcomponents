// Verificación simple: pide varios endpoints al servidor local y reporta código + tamaño.
const http = require('http');

const endpoints = [
  '/',
  '/index.html',
  '/components/is-button.js',
  '/styles/presentation.css',
  '/missing.txt'
];

function get(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:8765' + path, (res) => {
      let bytes = 0;
      res.on('data', (c) => (bytes += c.length));
      res.on('end', () => resolve({ path, status: res.statusCode, bytes }));
    }).on('error', (e) => resolve({ path, status: 'ERR', bytes: 0, err: e.message }));
  });
}

(async () => {
  for (const p of endpoints) {
    const r = await get(p);
    console.log(`${r.path.padEnd(38)} -> ${String(r.status).padEnd(4)} ${r.bytes} bytes${r.err ? '  (' + r.err + ')' : ''}`);
  }
  process.exit(0);
})();
