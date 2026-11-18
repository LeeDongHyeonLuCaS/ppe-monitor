const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 5173);
const routes = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js',
};
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const file = routes[new URL(req.url, 'http://localhost').pathname];
  if (!file) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  fs.readFile(path.join(__dirname, file), (error, data) => {
    if (error) {
      res.writeHead(500);
      res.end('Unable to read file');
      return;
    }

    res.writeHead(200, {
      'Content-Type': types[path.extname(file)],
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Close the previous server or choose a different PORT.`
    : error.message);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local: http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.');
});
