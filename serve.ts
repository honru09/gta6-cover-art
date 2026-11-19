/**
 * Neon Coast Cover Studio - Static File Server
 * Minimal Node 22 stdlib HTTP server for local offline serving.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_DIR = path.resolve(__dirname, 'app');

const PORT = 8080;
const HOST = '127.0.0.1';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  try {
    const parsedUrl = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    let decodedPath = decodeURIComponent(parsedUrl.pathname);

    // Default to index.html if root or directory
    if (decodedPath.endsWith('/')) {
      decodedPath += 'index.html';
    }

    // Path traversal guard
    const targetPath = path.normalize(path.join(APP_DIR, decodedPath));
    if (!targetPath.startsWith(APP_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(targetPath, (err, stats) => {
      if (err || !stats) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      if (stats.isDirectory()) {
        const indexPath = path.join(targetPath, 'index.html');
        fs.stat(indexPath, (indexErr, indexStats) => {
          if (indexErr || !indexStats) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
          sendFile(indexPath, indexStats, req, res);
        });
        return;
      }

      sendFile(targetPath, stats, req, res);
    });
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

function sendFile(filePath: string, stats: fs.Stats, req: http.IncomingMessage, res: http.ServerResponse) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Error streaming file');
  });
  stream.pipe(res);
}

server.listen(PORT, HOST, () => {
  console.log(`Neon Coast Server listening on http://${HOST}:${PORT}`);
});
