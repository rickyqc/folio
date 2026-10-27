// A tiny static file server for the end-to-end tests. Usage: node scripts/serve.mjs <dir> <port>
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const [root = 'dist', port = '4400'] = process.argv.slice(2);
const base = resolve(root);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.vcf': 'text/vcard; charset=utf-8',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  let file = join(base, path);
  if (!file.startsWith(base)) return res.writeHead(403).end();
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    statSync(file);
  } catch {
    return res.writeHead(404).end('Not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(port), () => console.log(`Serving ${root} at http://localhost:${port}`));
