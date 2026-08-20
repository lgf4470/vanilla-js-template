'use strict';

const http = require('node:http');
const { handleRequest } = require('../app');
const { serveStatic } = require('../core/http/static');
const log = require('../core/logging/logger');

const ROOT = process.cwd();

function toWebRequest(req) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const init = {
    method: req.method,
    headers: req.headers,
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req;
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function writeWebResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (res.req && res.req.method === 'HEAD') return res.end();
  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
}

function startServer(port = Number(process.env.PORT) || 3000) {
  const server = http.createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const isApi = url.pathname === '/api' || url.pathname.startsWith('/api/');
    try {
      if (isApi) {
        const response = await handleRequest(toWebRequest(req), process.env);
        await writeWebResponse(res, response);
      } else {
        serveStatic(req, res, url.pathname, ROOT);
      }
    } catch (error) {
      log.error('server', '请求处理失败: ' + url.pathname, error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'internal', message: '服务器内部错误' }));
      } else {
        res.end();
      }
    } finally {
      log.request(req.method, url.pathname, res.statusCode || 500, Date.now() - started, { api: isApi });
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      log.info('server', '服务已启动: http://127.0.0.1:' + port);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    log.error('server', '启动失败', error);
    process.exitCode = 1;
  });
}

module.exports = { startServer, toWebRequest, writeWebResponse };
