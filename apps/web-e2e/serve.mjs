// Serveur statique du build de production pour les tests e2e :
// fichiers de dist/apps/web/browser, repli SPA sur index.html, `/api/*`
// relayé vers E2E_API_URL si défini (sinon 503 : le front prend le repli local).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(
  new URL('../../dist/apps/web/browser/', import.meta.url),
);
const port = Number(process.env.E2E_PORT ?? 4300);
const api = process.env.E2E_API_URL;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    if (!api) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end('{"code":"NO_API","message":"API absente"}');
      return;
    }
    const target = new URL(url.pathname + url.search, api);
    const proxy = request(
      target,
      { method: req.method, headers: { ...req.headers, host: target.host } },
      (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      },
    );
    proxy.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(proxy);
    return;
  }
  let file = join(root, normalize(decodeURIComponent(url.pathname)));
  if (
    !file.startsWith(root) ||
    !existsSync(file) ||
    statSync(file).isDirectory()
  ) {
    file = join(root, 'index.html');
  }
  const ext = extname(file);
  res.writeHead(200, {
    'Content-Type': types[ext] ?? 'application/octet-stream',
    'Cache-Control':
      ext === '.html' || file.endsWith('ngsw.json')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`e2e : http://localhost:${port}`));
