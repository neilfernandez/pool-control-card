const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {
  '/': ['examples/demo.html', 'text/html'],
  '/examples/demo.html': ['examples/demo.html', 'text/html'],
  '/pool-control-card.js': ['pool-control-card.js', 'text/javascript'],
  '/local/demo-pool.svg': ['assets/demo-pool.svg', 'image/svg+xml'],
};
const demoPort = Number(process.env.PORT || 8768);
http.createServer((req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
  fs.createReadStream(path.join(__dirname, '..', file[0])).pipe(res);
}).listen(demoPort, '127.0.0.1', () => console.log(`Simulated pool card: http://127.0.0.1:${demoPort}/examples/demo.html`));
