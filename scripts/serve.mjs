// node scripts/serve.mjs [port] — serves site/ locally to look at the browse page.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('../site/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const port = Number(process.argv[2]) || 5240;
createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/^([/\\])+/u, '');
  const file = join(site, path || 'index.html');
  if (!file.startsWith(site)) { response.writeHead(403).end(); return; }
  try { const body = await readFile(file); response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body); }
  catch { response.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`百宝湾预览：http://localhost:${port}`));
